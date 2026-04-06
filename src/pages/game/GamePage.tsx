import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, TransitionEvent as ReactTransitionEvent } from 'react'
import { routes, type AppRoute } from '../../app/router/routes'
import type {
  CanvasStroke,
  ChatMessage,
  DrawingTool,
  Participant,
  TurnPhase,
} from '../../app/store/mockAppState'
import { useAppState } from '../../app/store/useAppState'
import { CanvasBoard } from '../../features/game-canvas/CanvasBoard'

type GamePageProps = {
  onNavigate: (route: AppRoute) => void
}

type LocalMessage = ChatMessage & {
  createdAt: number
  visibility: 'global' | 'correct-only'
}

type OverlayPreview =
  | 'actual'
  | 'roundStart'
  | 'turnStart'
  | 'wordChoice'
  | 'drawingDrawer'
  | 'drawingGuesser'
  | 'turnEnd'
  | 'gameResult'

type StageOverlayPhase = 'roundStart' | 'turnStart' | 'wordChoice' | 'turnEnd'

const TOOL_COLORS = [
  '#203247',
  '#345a74',
  '#56758f',
  '#d14b3f',
  '#ea6f58',
  '#ef9b47',
  '#f2c14e',
  '#5f8d4e',
  '#7aac63',
  '#1d6b4e',
  '#1f8a8a',
  '#4aa3b8',
  '#5f6dd9',
  '#6f55c6',
  '#9656a2',
  '#bd6a88',
  '#8d6e63',
  '#6f5a4b',
  '#9aa5b1',
  '#ffffff',
] as const

const SETTING_OPTIONS = {
  roundCount: [3, 4, 5, 6, 7, 8, 9, 10],
  drawSec: [20, 30, 40, 50, 60],
  wordChoiceSec: [5, 7, 10, 12, 15],
  wordChoiceCount: [3, 4, 5],
  hintRevealSec: [5, 7, 10, 12, 15],
  hintLetterCount: [1, 2, 3],
} as const

const END_MODE_OPTIONS = [
  { value: 'FIRST_CORRECT', label: '1인' },
  { value: 'TIME_OR_ALL_CORRECT', label: '전원' },
] as const

const STAGE_OVERLAY_PHASES: readonly StageOverlayPhase[] = ['roundStart', 'turnStart', 'wordChoice', 'turnEnd']

type NumericSettingKey = keyof typeof SETTING_OPTIONS

type EarnedScore = {
  nickname: string
  score: number
  isCorrect: boolean
  role: 'drawer' | 'correct' | 'miss'
}

type ParticipantBubblePosition = {
  userId: string
  text: string
  createdAt: number
  top: number
  left: number
}

function participantTone(participant: Participant, drawerUserId?: string, correctUserIds?: string[]) {
  if (participant.userId === drawerUserId) {
    return 'participant-card participant-card-drawer'
  }

  if (correctUserIds?.includes(participant.userId)) {
    return 'participant-card participant-card-correct'
  }

  return 'participant-card'
}

function buildEarnedScores(participants: Participant[], correctUserIds: string[], drawerUserId?: string) {
  const rows: EarnedScore[] = participants.map((participant) => {
    if (participant.userId === drawerUserId) {
      return { nickname: participant.nickname, score: 40, isCorrect: false, role: 'drawer' }
    }

    if (correctUserIds.includes(participant.userId)) {
      return { nickname: participant.nickname, score: 80, isCorrect: true, role: 'correct' }
    }

    return { nickname: participant.nickname, score: 0, isCorrect: false, role: 'miss' }
  })

  return rows.sort((left, right) => right.score - left.score)
}

function getVisibleOrder(participants: Participant[], drawerOrder: string[] | undefined, turnCursor: number | undefined) {
  if (!drawerOrder || drawerOrder.length === 0) {
    return participants
      .slice()
      .sort((left, right) => left.joinOrder - right.joinOrder)
      .map((participant) => participant.nickname)
  }

  return drawerOrder
    .slice(turnCursor ?? 0)
    .map((userId) => participants.find((participant) => participant.userId === userId)?.nickname)
    .filter((nickname): nickname is string => Boolean(nickname))
}

function getMaskedWord(word: string | null, revealedCount: number) {
  if (!word) {
    return '●●●'
  }

  const chars = Array.from(word)
  const visibleCount = Math.max(0, Math.min(chars.length, revealedCount))
  let revealed = 0

  return chars
    .map((char) => {
      if (char === ' ') {
        return ' '
      }

      if (revealed < visibleCount) {
        revealed += 1
        return char
      }

      return '●'
    })
    .join('')
}

function getBubbleText(text: string) {
  const chars = Array.from(text)
  return chars.length > 20 ? `${chars.slice(0, 17).join('')}...` : text
}

function shouldSkipEnterSubmit(event: ReactKeyboardEvent<HTMLInputElement>) {
  const nativeEvent = event.nativeEvent as KeyboardEvent & { isComposing?: boolean }

  return nativeEvent.isComposing === true || nativeEvent.keyCode === 229
}

export function GamePage({ onNavigate }: GamePageProps) {
  const [tool, setTool] = useState<DrawingTool>('PEN')
  const [size, setSize] = useState(5)
  const [color, setColor] = useState<string>(TOOL_COLORS[0])
  const [guessInput, setGuessInput] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [overlayPreview, setOverlayPreview] = useState<OverlayPreview>('actual')
  const [activeStageOverlay, setActiveStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [pendingStageOverlay, setPendingStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [stageOverlayOpen, setStageOverlayOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(true)
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const [lobbyStrokes, setLobbyStrokes] = useState<CanvasStroke[]>([])
  const [participantBubbles, setParticipantBubbles] = useState<ParticipantBubblePosition[]>([])
  const [showChatScrollButton, setShowChatScrollButton] = useState(false)
  const stageOverlayOpenRafRef = useRef<number | null>(null)
  const chatListRef = useRef<HTMLUListElement | null>(null)
  const chatStickToBottomRef = useRef(true)
  const stageRef = useRef<HTMLElement | null>(null)
  const centerPanelRef = useRef<HTMLElement | null>(null)
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null)
  const participantItemRefs = useRef(new Map<string, HTMLLIElement | null>())
  const [sideSyncHeight, setSideSyncHeight] = useState<number | null>(null)
  const { state, actions, devTools } = useAppState()

  const { participants, currentRound, currentTurn, chat, settings, roomState, hostUserId } = state.room
  const isHost = hostUserId === state.session.userId
  const drawer = participants.find((participant) => participant.userId === currentTurn?.drawerUserId)
  const isDrawer = state.session.userId === currentTurn?.drawerUserId
  const viewerRole =
    overlayPreview === 'drawingGuesser' ? 'guesser' : overlayPreview === 'drawingDrawer' ? 'drawer' : isDrawer ? 'drawer' : 'guesser'
  const orderNames = getVisibleOrder(participants, currentRound?.drawerOrder, currentRound?.turnCursor)
  const nextDrawerName =
    currentRound && currentRound.drawerOrder.length > 0
      ? participants.find(
          (participant) =>
            participant.userId ===
            currentRound.drawerOrder[(currentRound.turnCursor + 1) % currentRound.drawerOrder.length],
        )?.nickname
      : undefined
  const ranking = participants.slice().sort((left, right) => right.score - left.score).slice(0, 3)
  const mergedChat = [...chat, ...localMessages]
  const currentCorrectIds = currentTurn?.correctUserIds ?? []
  const revealedHintCount = (() => {
    if (!currentTurn || currentTurn.phase !== 'DRAWING' || !currentTurn.selectedWord) {
      return 0
    }

    const interval = Math.max(1, settings.hintRevealSec)
    const lettersPerReveal = Math.max(1, settings.hintLetterCount)
    const elapsedSec = Math.max(0, settings.drawSec - currentTurn.remainingSec)
    return Math.floor(elapsedSec / interval) * lettersPerReveal
  })()
  const earnedScores = buildEarnedScores(participants, currentCorrectIds, currentTurn?.drawerUserId)
  const canDraw =
    roomState === 'LOBBY'
      ? !settingsOpen
      : roomState === 'RUNNING'
        ? viewerRole === 'drawer' && currentTurn?.phase === 'DRAWING'
        : false
  const boardStrokes = roomState === 'LOBBY' ? lobbyStrokes : currentTurn?.canvasStrokes ?? []
  const visibleChat = mergedChat.filter((message) => {
    if (message.tone === 'system') {
      return false
    }

    if ('visibility' in message) {
      if (message.visibility === 'global') {
        return true
      }

      return viewerRole === 'drawer' || currentCorrectIds.includes(state.session.userId)
    }

    return true
  })

  const participantBubbleById = useMemo(() => {
    const map = new Map<string, { text: string; createdAt: number }>()
    const now = Date.now()

    for (const message of localMessages.slice(-3)) {
      if (now - message.createdAt > 3000) {
        continue
      }

      const author = participants.find((participant) => participant.nickname === message.nickname)

      if (author) {
        map.set(author.userId, { text: message.text, createdAt: message.createdAt })
      }
    }

    return map
  }, [localMessages, participants])

  useEffect(() => {
    if (roomState !== 'LOBBY') {
      setSettingsOpen(false)
    }
  }, [roomState])

  useLayoutEffect(() => {
    const list = chatListRef.current

    if (!list) {
      return
    }

    if (chatStickToBottomRef.current) {
      list.scrollTop = list.scrollHeight
      setShowChatScrollButton(false)
      return
    }

    setShowChatScrollButton(true)
  }, [visibleChat])

  const scrollChatToBottom = () => {
    const list = chatListRef.current

    if (!list) {
      return
    }

    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }

  useLayoutEffect(() => {
    const stageElement = stageRef.current
    const scrollElement = sidePanelScrollRef.current

    if (!stageElement || !scrollElement) {
      setParticipantBubbles([])
      return
    }

    const updateBubblePositions = () => {
      const stageRect = stageElement.getBoundingClientRect()
      const nextBubbles: ParticipantBubblePosition[] = []

      for (const [userId, bubble] of participantBubbleById.entries()) {
        const item = participantItemRefs.current.get(userId)

        if (!item) {
          continue
        }

        const itemRect = item.getBoundingClientRect()
        nextBubbles.push({
          userId,
          text: getBubbleText(bubble.text),
          createdAt: bubble.createdAt,
          top: itemRect.top - stageRect.top + itemRect.height / 2,
          left: itemRect.right - stageRect.left + 14,
        })
      }

      setParticipantBubbles(nextBubbles)
    }

    updateBubblePositions()
    scrollElement.addEventListener('scroll', updateBubblePositions)
    window.addEventListener('resize', updateBubblePositions)

    return () => {
      scrollElement.removeEventListener('scroll', updateBubblePositions)
      window.removeEventListener('resize', updateBubblePositions)
    }
  }, [participantBubbleById])

  useLayoutEffect(() => {
    const centerPanelElement = centerPanelRef.current

    if (!centerPanelElement) {
      return
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(centerPanelElement.getBoundingClientRect().height)
      setSideSyncHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    updateHeight()

    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(centerPanelElement)
    window.addEventListener('resize', updateHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [])

  const applySetting = (key: NumericSettingKey, value: string) => {
    actions.patchLobbySettings({ [key]: Number(value) })
  }

  const applyEndMode = (value: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT') => {
    actions.patchLobbySettings({ endMode: value })
  }

  const submitGuess = () => {
    const nextText = guessInput.trim().slice(0, 50)

    if (!nextText) {
      return
    }

    const visibility = currentCorrectIds.includes(state.session.userId) || viewerRole === 'drawer' ? 'correct-only' : 'global'

    setLocalMessages((messages) => [
      ...messages,
      {
        id: crypto.randomUUID(),
        nickname: state.session.nickname,
        text: nextText,
        tone: visibility === 'global' ? 'guess' : 'correct',
        createdAt: Date.now(),
        visibility,
      },
    ])
    setGuessInput('')
  }

  const handleCommitStroke = (stroke: CanvasStroke) => {
    if (roomState === 'LOBBY') {
      setLobbyStrokes((strokes) => [...strokes, stroke])
      return
    }

    actions.sendCanvasStroke(stroke)
  }

  const handleClearCanvas = () => {
    if (roomState === 'LOBBY') {
      setLobbyStrokes([])
      return
    }

    actions.requestCanvasClear()
  }

  const ensureRunning = (phase?: TurnPhase) => {
    if (roomState === 'RESULT') {
      devTools.resetToLobby()
      setLobbyStrokes([])
      actions.requestGameStart()
    } else if (roomState === 'LOBBY') {
      actions.requestGameStart()
    }

    if (phase) {
      devTools.forceTurnPhase(phase)
    }

    setSettingsOpen(false)
  }

  const previewMode = (() => {
    if (overlayPreview !== 'actual') {
      return overlayPreview
    }

    if (roomState === 'RESULT') {
      return 'gameResult'
    }

    if (roomState === 'LOBBY') {
      return settingsOpen ? 'actual' : 'actual'
    }

    if (currentTurn?.phase === 'TURN_END') {
      return 'turnEnd'
    }

    if (currentTurn?.phase === 'DRAWING') {
      return isDrawer ? 'drawingDrawer' : 'drawingGuesser'
    }

    return 'wordChoice'
  })()

  const requestedStageOverlay: StageOverlayPhase | null =
    roomState === 'RUNNING' && STAGE_OVERLAY_PHASES.includes(previewMode as StageOverlayPhase) && (previewMode !== 'wordChoice' || Boolean(currentTurn))
      ? (previewMode as StageOverlayPhase)
      : null
  const shouldShowSecretWordBanner =
    roomState === 'RUNNING' &&
    Boolean(currentTurn?.selectedWord) &&
    (viewerRole === 'drawer' || currentTurn?.phase === 'DRAWING' || previewMode === 'turnEnd')
  const isSecretWordBannerClosed = previewMode === 'turnEnd'

  const queueStageOverlayOpen = () => {
    if (stageOverlayOpenRafRef.current !== null) {
      window.cancelAnimationFrame(stageOverlayOpenRafRef.current)
    }

    stageOverlayOpenRafRef.current = window.requestAnimationFrame(() => {
      stageOverlayOpenRafRef.current = null
      setStageOverlayOpen(true)
    })
  }

  const handleStageOverlayTransitionEnd = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') {
      return
    }

    if (stageOverlayOpen) {
      return
    }

    if (pendingStageOverlay) {
      setActiveStageOverlay(pendingStageOverlay)
      setPendingStageOverlay(null)
      queueStageOverlayOpen()
      return
    }

    setActiveStageOverlay(null)
  }

  useEffect(() => {
    return () => {
      if (stageOverlayOpenRafRef.current !== null) {
        window.cancelAnimationFrame(stageOverlayOpenRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!requestedStageOverlay) {
      setPendingStageOverlay(null)

      if (activeStageOverlay && stageOverlayOpen) {
        setStageOverlayOpen(false)
        return
      }

      if (activeStageOverlay) {
        setActiveStageOverlay(null)
      }

      return
    }

    if (!activeStageOverlay) {
      setPendingStageOverlay(null)
      setActiveStageOverlay(requestedStageOverlay)
      setStageOverlayOpen(false)
      queueStageOverlayOpen()
      return
    }

    if (activeStageOverlay === requestedStageOverlay) {
      setPendingStageOverlay(null)

      if (!stageOverlayOpen) {
        queueStageOverlayOpen()
      }

      return
    }

    setPendingStageOverlay(requestedStageOverlay)

    if (stageOverlayOpen) {
      setStageOverlayOpen(false)
      return
    }

    setActiveStageOverlay(requestedStageOverlay)
    setPendingStageOverlay(null)
    queueStageOverlayOpen()
  }, [activeStageOverlay, requestedStageOverlay, stageOverlayOpen])

  const stageStyle: CSSProperties | undefined =
    sideSyncHeight && sideSyncHeight > 0
      ? ({ ['--game-side-sync-height' as string]: `${sideSyncHeight}px` } as CSSProperties)
      : undefined

  return (
    <div className="gamepage-shell">
      <section className="panel game-status-bar">
        <div className="status-bar-row">
          <div className="status-inline-chip status-inline-chip-round">
            <span>라운드</span>
            <strong>{currentRound ? `${currentRound.roundNo} / ${currentRound.totalRounds}` : '-'}</strong>
          </div>
          <div className="status-inline-chip status-inline-chip-time">
            <span>남은 시간</span>
            <strong>{currentTurn ? `${currentTurn.remainingSec}s` : '-'}</strong>
          </div>
          <div className="order-strip-box">
            <span className="order-strip-label">이번 라운드 그림 순서</span>
            <div className="order-strip" role="list">
              {orderNames.map((nickname) => (
                <span key={nickname} className="order-pill" role="listitem">
                  {nickname}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={stageRef} className="game-stage-layout" style={stageStyle}>
	        <aside className="panel game-side-panel game-side-panel-left">
	          <div className="section-heading participant-heading-compact">
	            <h2>참여자</h2>
	            <div className="pill participant-count-pill">{participants.length}명</div>
	          </div>
	
	          <div ref={sidePanelScrollRef} className="side-panel-scroll">
	            <div className="side-panel-scroll-inner">
	              <ul className="participant-cards">
	                {participants.map((participant) => (
	                <li
                  key={participant.userId}
                  ref={(element) => {
                    participantItemRefs.current.set(participant.userId, element)
                  }}
                  className={participantTone(participant, currentTurn?.drawerUserId, currentCorrectIds)}
                >
                    <div className="participant-main">
                      <div className="participant-heading">
                        <strong>{participant.nickname}</strong>
                        {participant.isHost ? <span className="host-badge">Host</span> : null}
                      </div>
                      <p className="participant-score">{participant.score} pts</p>
                    </div>
                </li>
              ))}
            </ul>
            </div>
          </div>
        </aside>

        <section ref={centerPanelRef} className="panel game-center-panel">
          <div className="board-shell">
            <div className="board-frame">
              <div className="grid-overlay" />
              <CanvasBoard
                strokes={boardStrokes}
                canDraw={Boolean(canDraw)}
                tool={tool}
                color={tool === 'ERASER' ? '#ffffff' : color}
                size={Math.max(2, size * 2)}
                onCommitStroke={handleCommitStroke}
              />

              {isHost && roomState === 'LOBBY' ? (
                <button
                  type="button"
                  className={settingsOpen ? 'board-settings-toggle secondary-button board-settings-toggle-hidden' : 'board-settings-toggle secondary-button'}
                  onClick={() => setSettingsOpen((open) => !open)}
                >
                  설정 열기
                </button>
              ) : null}

              {shouldShowSecretWordBanner && currentTurn?.selectedWord ? (
                <div
                  key={viewerRole === 'drawer' ? `${currentTurn.turnId}-${currentTurn.selectedWord}` : `${currentTurn.turnId}-masked`}
                  className={
                    isSecretWordBannerClosed
                      ? `secret-word-banner${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-closed`
                      : `secret-word-banner secret-word-banner-landing${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-open`
                  }
                >
                  {viewerRole === 'drawer' ? currentTurn.selectedWord : getMaskedWord(currentTurn.selectedWord, revealedHintCount)}
                </div>
              ) : null}

              {roomState === 'LOBBY' && isHost ? (
                <div
                  className={
                    settingsOpen
                      ? 'canvas-overlay-card canvas-overlay-card-settings canvas-overlay-card-settings-open'
                      : 'canvas-overlay-card canvas-overlay-card-settings canvas-overlay-card-settings-closed'
                  }
                  aria-hidden={!settingsOpen}
                >
                  <div className="overlay-heading">
                    <p className="panel-label">게임 설정</p>
                  </div>
                  <div className="lobby-grid">
                    <label className="field">
                      <span>라운드 수</span>
                      <select
                        value={settings.roundCount}
                        onChange={(event) => applySetting('roundCount', event.target.value)}
                      >
                        {SETTING_OPTIONS.roundCount.map((option) => (
                          <option key={option} value={option}>
                            {option} 라운드
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>그리기 시간</span>
                      <select
                        value={settings.drawSec}
                        onChange={(event) => applySetting('drawSec', event.target.value)}
                      >
                        {SETTING_OPTIONS.drawSec.map((option) => (
                          <option key={option} value={option}>
                            {option}초
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>단어 선택 시간</span>
                      <select
                        value={settings.wordChoiceSec}
                        onChange={(event) => applySetting('wordChoiceSec', event.target.value)}
                      >
                        {SETTING_OPTIONS.wordChoiceSec.map((option) => (
                          <option key={option} value={option}>
                            {option}초
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>선택 단어 수</span>
                      <select
                        value={settings.wordChoiceCount}
                        onChange={(event) => applySetting('wordChoiceCount', event.target.value)}
                      >
                        {SETTING_OPTIONS.wordChoiceCount.map((option) => (
                          <option key={option} value={option}>
                            {option}개
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>종료 정답자 수</span>
                      <select
                        value={settings.endMode}
                        onChange={(event) => applyEndMode(event.target.value as 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT')}
                      >
                        {END_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>힌트 공개 주기</span>
                      <select
                        value={settings.hintRevealSec}
                        onChange={(event) => applySetting('hintRevealSec', event.target.value)}
                      >
                        {SETTING_OPTIONS.hintRevealSec.map((option) => (
                          <option key={option} value={option}>
                            {option}초
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>힌트 공개 글자 수</span>
                      <select
                        value={settings.hintLetterCount}
                        onChange={(event) => applySetting('hintLetterCount', event.target.value)}
                      >
                        {SETTING_OPTIONS.hintLetterCount.map((option) => (
                          <option key={option} value={option}>
                            {option}글자
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="button-row overlay-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        setSettingsOpen(false)
                        actions.requestGameStart()
                      }}
                    >
                      게임 시작
                    </button>
                    <button type="button" className="secondary-button settings-close-button" onClick={() => setSettingsOpen(false)}>
                      닫기
                    </button>
                  </div>
                </div>
              ) : null}

              {roomState === 'RUNNING' ? (
                <div
                  className={
                    activeStageOverlay === 'roundStart' && stageOverlayOpen
                      ? 'canvas-full-overlay canvas-full-overlay-open'
                      : 'canvas-full-overlay canvas-full-overlay-closed'
                  }
                  aria-hidden={activeStageOverlay !== 'roundStart'}
                  onTransitionEnd={handleStageOverlayTransitionEnd}
                >
                  <p className="panel-label">라운드 시작 안내 화면</p>
                  <strong>{currentRound ? `${currentRound.roundNo} 라운드 시작` : '1 라운드 시작'}</strong>
                </div>
              ) : null}

              {roomState === 'RUNNING' && currentTurn ? (
                <div
                  className={
                    activeStageOverlay === 'wordChoice' && stageOverlayOpen
                      ? 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-open'
                      : 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-closed'
                  }
                  aria-hidden={activeStageOverlay !== 'wordChoice'}
                  onTransitionEnd={handleStageOverlayTransitionEnd}
                >
                  <div className="overlay-heading">
                    <p className="panel-label">단어 선택 단계</p>
                    <strong>{drawer?.nickname} 차례</strong>
                    <p className="info-copy">아래 단어 중 하나를 골라 바로 그림을 시작한다.</p>
                  </div>
                  <div className={`button-row overlay-actions word-choice-actions word-choice-actions-count-${currentTurn.wordChoices.length}`}>
                    {currentTurn.wordChoices.map((word) => (
                      <button
                        key={word}
                        type="button"
                        className="word-choice-button"
                        onClick={() => {
                          setOverlayPreview('actual')
                          actions.requestWordChoice(word)
                        }}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {roomState === 'RUNNING' ? (
                <div
                  className={
                    activeStageOverlay === 'turnStart' && stageOverlayOpen
                      ? 'canvas-full-overlay canvas-full-overlay-open'
                      : 'canvas-full-overlay canvas-full-overlay-closed'
                  }
                  aria-hidden={activeStageOverlay !== 'turnStart'}
                  onTransitionEnd={handleStageOverlayTransitionEnd}
                >
                  <p className="panel-label">턴 시작 안내 화면</p>
                  <strong>{drawer?.nickname ?? '현재 drawer'} 차례</strong>
                  <span>다음은 {nextDrawerName ?? '라운드 종료'}</span>
                </div>
              ) : null}

              {previewMode === 'drawingDrawer' && roomState === 'RUNNING' ? null : null}

              {previewMode === 'drawingGuesser' && roomState === 'RUNNING' ? null : null}

              {roomState === 'RUNNING' ? (
                <div
                  className={
                    activeStageOverlay === 'turnEnd' && stageOverlayOpen
                      ? 'canvas-full-overlay canvas-full-overlay-open canvas-full-overlay-turn-end'
                      : 'canvas-full-overlay canvas-full-overlay-closed canvas-full-overlay-turn-end'
                  }
                  aria-hidden={activeStageOverlay !== 'turnEnd'}
                  onTransitionEnd={handleStageOverlayTransitionEnd}
                >
                  <div className="canvas-full-overlay-panel">
                    <p className="panel-label">턴 끝난 결과 화면</p>
                    <strong>{drawer?.nickname ?? '현재 drawer'} 턴 종료</strong>
                    <div className="earned-score-content">
                      <div className="earned-score-table">
                        <div className="earned-score-table-head" aria-hidden="true">
                          <span className="score-col-rank">순위</span>
                          <span className="score-col-name">참여자</span>
                          <span className="score-col-result">결과</span>
                          <span className="score-col-points">점수</span>
                        </div>
                        <div className="earned-score-table-body">
                          {earnedScores.map((row, index) => (
                            <div key={row.nickname} className={row.isCorrect ? 'earned-score-row earned-score-row-correct' : 'earned-score-row'}>
                              <span className="earned-score-rank score-col-rank">{index + 1}</span>
                              <span className="earned-score-name score-col-name">{row.nickname}</span>
                              <span
                                className={
                                  row.role === 'correct'
                                    ? 'earned-score-role earned-score-role-correct score-col-result'
                                    : row.role === 'drawer'
                                      ? 'earned-score-role earned-score-role-drawer score-col-result'
                                      : 'earned-score-role score-col-result'
                                }
                              >
                                {row.role === 'correct' ? '정답' : row.role === 'drawer' ? '출제자' : '미정답'}
                              </span>
                              <strong className="earned-score-points score-col-points">{row.score} pts</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {previewMode === 'gameResult' ? (
                <div className="canvas-result-screen">
                  {ranking.map((participant, index) => (
                    <div key={participant.userId} className={index === 0 ? 'result-rank result-rank-winner' : 'result-rank'}>
                      <strong>{`${index + 1}# ${participant.nickname} ${participant.score} pts`}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="tool-row">
              <div className="tool-main-actions">
                <button
                  type="button"
                  className={tool === 'PEN' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setTool('PEN')}
                >
                  펜
                </button>
                <button
                  type="button"
                  className={tool === 'ERASER' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setTool('ERASER')}
                >
                  지우개
                </button>
                <button
                  type="button"
                  className={tool === 'FILL' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setTool('FILL')}
                >
                  채우기
                </button>
                <button type="button" className="secondary-button" onClick={handleClearCanvas}>
                  전체 지우기
                </button>
              </div>
              <label className="size-control">
                <span className="size-control-label">굵기 {size}</span>
                <input
                  type="range"
                  min={1}
                  max={9}
                  step={1}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                />
              </label>
              <div className="color-palette">
                {TOOL_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Select ${swatch}`}
                    className={swatch === color ? 'color-swatch color-swatch-active' : 'color-swatch'}
                    style={{ background: swatch }}
                    onClick={() => {
                      setTool((currentTool) => (currentTool === 'ERASER' ? 'PEN' : currentTool))
                      setColor(swatch)
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="panel game-side-panel game-side-panel-right">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Chat</p>
            </div>
          </div>

          <div className="chat-panel-box">
            <ul
              ref={chatListRef}
              className="chat-list game-chat-list"
              onScroll={(event) => {
                const list = event.currentTarget
                chatStickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40
                setShowChatScrollButton(!chatStickToBottomRef.current)
              }}
            >
              {visibleChat.map((message) => (
                <li key={message.id} className={`chat-${message.tone}`}>
                  <strong>{message.nickname}</strong>
                  <span>{message.text}</span>
                </li>
              ))}
            </ul>

            {showChatScrollButton ? (
              <button
                type="button"
                className="chat-scroll-to-bottom-button"
                onClick={scrollChatToBottom}
                aria-label="최신 채팅으로 이동"
              />
            ) : null}

            <div className="chat-input-row">
              <input
                value={guessInput}
                maxLength={50}
                placeholder="메시지를 입력하세요"
                onChange={(event) => setGuessInput(event.target.value)}
                onKeyDown={(event) => {
                  if (shouldSkipEnterSubmit(event)) {
                    return
                  }

                  if (event.key === 'Enter') {
                    submitGuess()
                  }
                }}
              />
              <button type="button" className="primary-button" onClick={submitGuess}>
                전송
              </button>
            </div>
          </div>
        </aside>

        <div className="participant-bubble-layer" aria-hidden="true">
          {participantBubbles.map((bubble) => (
            <div
              key={`${bubble.userId}-${bubble.createdAt}`}
              className="participant-bubble-floating"
              style={{ top: `${bubble.top}px`, left: `${bubble.left}px` }}
            >
              <span className="participant-bubble-text">{bubble.text}</span>
            </div>
          ))}
        </div>
      </section>

      <aside className="preview-shortcuts">
        <div className="preview-shortcuts-header">
          <p className="preview-shortcuts-title">바로가기 모음</p>
          <button
            type="button"
            className="secondary-button preview-shortcuts-toggle"
            onClick={() => setShortcutsOpen((open) => !open)}
            aria-expanded={shortcutsOpen}
            aria-controls="preview-shortcuts-grid"
          >
            {shortcutsOpen ? '접기' : '펼치기'}
          </button>
        </div>
        <div
          id="preview-shortcuts-grid"
          className={shortcutsOpen ? 'preview-shortcuts-grid' : 'preview-shortcuts-grid preview-shortcuts-grid-closed'}
          aria-hidden={!shortcutsOpen}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              devTools.resetToLobby()
              setLobbyStrokes([])
              setOverlayPreview('actual')
              setSettingsOpen(true)
            }}
          >
            게임 설정
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              ensureRunning('WORD_CHOICE')
              setOverlayPreview('roundStart')
            }}
          >
            라운드 시작
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              ensureRunning('WORD_CHOICE')
              setOverlayPreview('turnStart')
            }}
          >
            턴 시작
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              ensureRunning('WORD_CHOICE')
              setOverlayPreview('wordChoice')
            }}
          >
            단어 고르기
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              ensureRunning('DRAWING')
              setOverlayPreview('drawingDrawer')
            }}
          >
            그리기(drawer)
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              ensureRunning('DRAWING')
              setOverlayPreview('drawingGuesser')
            }}
          >
            그리기(guesser)
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              ensureRunning('TURN_END')
              setOverlayPreview('turnEnd')
            }}
          >
            턴 종료
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              devTools.finishGame()
              setOverlayPreview('actual')
            }}
          >
            게임 결과
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (roomState === 'RUNNING') {
                devTools.advanceMockFlow()
              }
              setOverlayPreview('actual')
            }}
          >
            실제 흐름
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate(routes.main)}
          >
            첫 화면
          </button>
        </div>
      </aside>
    </div>
  )
}
