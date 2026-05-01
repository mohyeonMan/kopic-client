import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type {
  AnimationEvent as ReactAnimationEvent,
  CSSProperties,
  TransitionEvent as ReactTransitionEvent,
} from 'react'
import { defaultSettings } from '../../app/store/mockAppState'
import type { CanvasStroke, DrawingTool } from '../../app/store/mockAppState'
import { useAppState } from '../../app/store/useAppState'
import { GameBoardPanel } from './components/GameBoardPanel'
import { GameChatPanel } from './components/GameChatPanel'
import { GameStatusBar } from './components/GameStatusBar'
import { ParticipantBubbleLayer } from './components/ParticipantBubbleLayer'
import { ParticipantPanel } from './components/ParticipantPanel'
import {
  EMPTY_SESSION_IDS,
  STAGE_OVERLAY_PHASES,
  TOOL_COLORS,
  TRANSIENT_STAGE_OVERLAY_MS,
  buildEarnedScores,
  getBubbleText,
  getMaskedWord,
  getParticipantAccentColor,
  getVisibleOrder,
  type AnimatedParticipantItem,
  type NumericSettingKey,
  type OverlayPreview,
  type ParticipantBubblePosition,
  type StageOverlayPhase,
  type TurnEndOverlaySnapshot,
} from './gamePageShared'

export function GamePage() {
  const [tool, setTool] = useState<DrawingTool>('PEN')
  const [size, setSize] = useState(5)
  const [color, setColor] = useState<string>(TOOL_COLORS[0])
  const [guessInput, setGuessInput] = useState('')
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [overlayPreview, setOverlayPreview] = useState<OverlayPreview>('actual')
  const [activeStageOverlay, setActiveStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [pendingStageOverlay, setPendingStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [stageOverlayOpen, setStageOverlayOpen] = useState(false)
  const [participantBubbles, setParticipantBubbles] = useState<ParticipantBubblePosition[]>([])
  const [showChatScrollButton, setShowChatScrollButton] = useState(false)
  const stageOverlayOpenRafRef = useRef<number | null>(null)
  const overlayPreviewTimeoutIdsRef = useRef<number[]>([])
  const autoPreviewGameKeyRef = useRef<string | null>(null)
  const autoPreviewRoundKeyRef = useRef<string | null>(null)
  const autoPreviewTurnKeyRef = useRef<string | null>(null)
  const chatSeenAtByIdRef = useRef(new Map<string, number>())
  const chatListRef = useRef<HTMLUListElement | null>(null)
  const chatStickToBottomRef = useRef(true)
  const stageRef = useRef<HTMLElement | null>(null)
  const centerPanelRef = useRef<HTMLElement | null>(null)
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null)
  const participantItemRefs = useRef(new Map<string, HTMLLIElement | null>())
  const [sideSyncHeight, setSideSyncHeight] = useState<number | null>(null)
  const [turnEndOverlaySnapshot, setTurnEndOverlaySnapshot] = useState<TurnEndOverlaySnapshot | null>(null)
  const { state, actions, server } = useAppState()

  const { currentRound, currentTurn, roomState, hostSessionId } = state.room
  const participants = Array.isArray(state.room.participants) ? state.room.participants : []
  const [animatedParticipants, setAnimatedParticipants] = useState<AnimatedParticipantItem[]>(() =>
    participants.map((participant) => ({
      participant,
      phase: 'stable',
    })),
  )
  const lobbyCanvasStrokes = Array.isArray(state.room.lobbyCanvasStrokes) ? state.room.lobbyCanvasStrokes : []
  const chat = Array.isArray(state.room.chat) ? state.room.chat : []
  const settings = state.room.settings ?? defaultSettings
  const isHost = hostSessionId === state.session.sessionId
  const drawer = participants.find((participant) => participant.sessionId === currentTurn?.drawerSessionId)
  const me = participants.find((participant) => participant.sessionId === state.session.sessionId)
  const isDrawer = state.session.sessionId === currentTurn?.drawerSessionId
  const viewerRole =
    overlayPreview === 'drawingGuesser' ? 'guesser' : overlayPreview === 'drawingDrawer' ? 'drawer' : isDrawer ? 'drawer' : 'guesser'
  const visibleOrderEntries = getVisibleOrder(participants, currentRound?.drawerOrder)
  const nextDrawerName = (() => {
    if (!currentRound || currentRound.drawerOrder.length === 0) {
      return null
    }

    const nextDrawerSessionId = currentRound.drawerOrder[currentRound.turnCursor + 1]

    if (!nextDrawerSessionId) {
      return null
    }

    return (
      participants.find((participant) => participant.sessionId === nextDrawerSessionId)?.nickname ??
      null
    )
  })()
  const ranking = participants.slice().sort((left, right) => right.score - left.score).slice(0, 3)
  const currentCorrectIds = currentTurn?.correctSessionIds ?? EMPTY_SESSION_IDS
  const currentEarnedPoints = currentTurn?.earnedPoints ?? {}
  const displayedRemainingSec =
    currentTurn?.deadlineAtMs !== undefined
      ? Math.max(0, Math.ceil((currentTurn.deadlineAtMs - timerNowMs) / 1000))
      : currentTurn?.remainingSec ?? 0
  const revealedHintCount = (() => {
    if (!currentTurn || currentTurn.phase !== 'DRAWING' || !currentTurn.selectedWord) {
      return 0
    }

    const interval = Math.max(1, settings.hintRevealSec)
    const lettersPerReveal = Math.max(1, settings.hintLetterCount)
    const elapsedSec = Math.max(0, settings.drawSec - displayedRemainingSec)
    return Math.floor(elapsedSec / interval) * lettersPerReveal
  })()
  const earnedScores = useMemo(
    () =>
      buildEarnedScores(
        participants,
        currentCorrectIds,
        currentEarnedPoints,
        currentTurn?.drawerSessionId,
      ),
    [currentCorrectIds, currentEarnedPoints, currentTurn?.drawerSessionId, participants],
  )
  const canDraw =
    roomState === 'LOBBY'
      ? !settingsOpen
      : roomState === 'RUNNING'
        ? viewerRole === 'drawer' && currentTurn?.phase === 'DRAWING'
        : false
  const isDrawerDrawingPhase =
    roomState === 'RUNNING' && viewerRole === 'drawer' && currentTurn?.phase === 'DRAWING'
  const isSharedDrawingPhase = roomState === 'LOBBY' && !settingsOpen
  const canUseFullPalette = isDrawerDrawingPhase
  const forcedPaletteColor = getParticipantAccentColor(me?.colorIndex)
  const activePaletteColor = isSharedDrawingPhase && forcedPaletteColor ? forcedPaletteColor : color
  const boardStrokes =
    roomState === 'LOBBY'
      ? lobbyCanvasStrokes
      : currentTurn?.canvasStrokes ?? lobbyCanvasStrokes
  const visibleChat = useMemo(
    () =>
      chat.filter((message) => {
        if (message.tone === 'system') {
          return false
        }

        return true
      }),
    [chat],
  )

  const participantBubbleById = useMemo(() => {
    const map = new Map<string, { text: string; createdAt: number }>()
    const now = Date.now()
    const seenAtById = chatSeenAtByIdRef.current
    const visibleIds = new Set<string>()

    for (const message of visibleChat) {
      visibleIds.add(message.id)
      if (seenAtById.has(message.id)) {
        continue
      }

      const createdAt =
        'createdAt' in message && typeof message.createdAt === 'number'
          ? message.createdAt
          : now

      seenAtById.set(message.id, createdAt)
    }

    for (const [id, createdAt] of seenAtById.entries()) {
      if (visibleIds.has(id)) {
        continue
      }

      if (now - createdAt > 60000) {
        seenAtById.delete(id)
      }
    }

    for (const message of visibleChat.slice(-8)) {
      const createdAt = seenAtById.get(message.id)
      if (!createdAt || now - createdAt > 3000) {
        continue
      }

      const author = message.senderSessionId
        ? participants.find((participant) => participant.sessionId === message.senderSessionId)
        : undefined

      if (author) {
        map.set(author.sessionId, { text: message.text, createdAt })
      }
    }

    return map
  }, [participants, visibleChat])

  useEffect(() => {
    if (roomState !== 'LOBBY') {
      setSettingsOpen(false)
    }
  }, [roomState])

  useEffect(() => {
    setAnimatedParticipants((current) => {
      const nextMap = new Map(
        participants.map((participant) => [participant.sessionId, participant]),
      )
      const seenSessionIds = new Set<string>()
      const merged: AnimatedParticipantItem[] = []

      for (const currentItem of current) {
        const sessionId = currentItem.participant.sessionId
        const nextParticipant = nextMap.get(sessionId)
        if (nextParticipant) {
          merged.push({
            participant: nextParticipant,
            phase: currentItem.phase === 'exit' ? 'enter' : currentItem.phase,
          })
          seenSessionIds.add(sessionId)
          continue
        }

        merged.push({
          participant: currentItem.participant,
          phase: 'exit',
        })
      }

      const getActiveOrderIndex = (sessionId: string) =>
        participants.findIndex((participant) => participant.sessionId === sessionId)

      for (const nextParticipant of participants) {
        if (seenSessionIds.has(nextParticipant.sessionId)) {
          continue
        }

        const targetIndex = getActiveOrderIndex(nextParticipant.sessionId)
        let insertAt = merged.findIndex((item) => {
          const itemIndex = getActiveOrderIndex(item.participant.sessionId)
          return itemIndex !== -1 && itemIndex > targetIndex
        })
        if (insertAt < 0) {
          insertAt = merged.length
        }

        merged.splice(insertAt, 0, {
          participant: nextParticipant,
          phase: 'enter',
        })
      }

      return merged
    })
  }, [participants])

  const handleParticipantCardAnimationEnd = (
    event: ReactAnimationEvent<HTMLLIElement>,
    sessionId: string,
    phase: AnimatedParticipantItem['phase'],
  ) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (phase === 'stable') {
      return
    }

    setAnimatedParticipants((current) => {
      let didChange = false
      const next: AnimatedParticipantItem[] = []

      for (const item of current) {
        if (item.participant.sessionId !== sessionId) {
          next.push(item)
          continue
        }

        if (phase === 'exit') {
          didChange = true
          continue
        }

        if (item.phase !== 'stable') {
          didChange = true
          next.push({
            ...item,
            phase: 'stable',
          })
          continue
        }

        next.push(item)
      }

      return didChange ? next : current
    })
  }

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

  const handleChatScroll = (list: HTMLUListElement) => {
    chatStickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40
    setShowChatScrollButton(!chatStickToBottomRef.current)
  }

  const handleParticipantItemRefChange = (sessionId: string, element: HTMLLIElement | null) => {
    participantItemRefs.current.set(sessionId, element)
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

      for (const [sessionId, bubble] of participantBubbleById.entries()) {
        const item = participantItemRefs.current.get(sessionId)

        if (!item) {
          continue
        }

        const itemRect = item.getBoundingClientRect()
        nextBubbles.push({
          sessionId,
          text: getBubbleText(bubble.text),
          createdAt: bubble.createdAt,
          top: itemRect.top - stageRect.top + itemRect.height / 2,
          left: itemRect.right - stageRect.left + 14,
        })
      }

      setParticipantBubbles((current) => {
        if (current.length !== nextBubbles.length) {
          return nextBubbles
        }

        const isSame = current.every((bubble, index) => {
          const next = nextBubbles[index]
          return (
            bubble.sessionId === next.sessionId &&
            bubble.text === next.text &&
            bubble.createdAt === next.createdAt &&
            bubble.top === next.top &&
            bubble.left === next.left
          )
        })

        return isSame ? current : nextBubbles
      })
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
    if (!isHost) {
      return
    }

    actions.patchLobbySettings({ [key]: Number(value) })
  }

  const applyEndMode = (value: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT') => {
    if (!isHost) {
      return
    }

    actions.patchLobbySettings({ endMode: value })
  }

  const submitGuess = () => {
    const nextText = guessInput.trim().slice(0, 50)

    if (!nextText) {
      return
    }

    actions.submitGuess(nextText)
    setGuessInput('')
  }

  const handleSendStrokeChunk = (stroke: CanvasStroke) => {
    if (roomState !== 'RUNNING' && roomState !== 'LOBBY') {
      return
    }

    actions.sendCanvasStroke(stroke)
  }

  const handleCommitStroke = (stroke: CanvasStroke) => {
    server.applyCanvasStroke(stroke)
  }

  const handleClearCanvas = () => {
    if (!canDraw) {
      return
    }

    actions.requestCanvasClear()
  }

  const handleToggleSettings = () => {
    setSettingsOpen((open) => !open)
  }

  const handleCloseSettings = () => {
    setSettingsOpen(false)
  }

  const handleStartGame = () => {
    setSettingsOpen(false)
    actions.requestGameStart()
  }

  const handleRequestWordChoice = (word: string) => {
    setOverlayPreview('actual')
    actions.requestWordChoice(word)
  }

  const handleToolChange = (nextTool: DrawingTool) => {
    setTool(nextTool)
  }

  const handleSizeChange = (nextSize: number) => {
    setSize(nextSize)
  }

  const handleColorChange = (nextColor: string) => {
    if (!canUseFullPalette) {
      return
    }

    setTool((currentTool) => (currentTool === 'ERASER' ? 'PEN' : currentTool))
    setColor(nextColor)
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

    if (currentTurn?.phase === 'READY') {
      return 'actual'
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
    (Boolean(currentTurn?.selectedWord) || typeof currentTurn?.answerLength === 'number') &&
    (viewerRole === 'drawer' || currentTurn?.phase === 'DRAWING' || previewMode === 'turnEnd')
  const isSecretWordBannerClosed = previewMode === 'turnEnd'

  useEffect(() => {
    if (roomState !== 'RUNNING' || !currentTurn || currentTurn.phase !== 'TURN_END') {
      return
    }

    setTurnEndOverlaySnapshot({
      turnId: currentTurn.turnId,
      answerText: currentTurn.selectedWord ?? getMaskedWord(null, 0, currentTurn.answerLength),
      earnedScores,
    })
  }, [
    currentTurn,
    earnedScores,
    roomState,
  ])

  const queueStageOverlayOpen = () => {
    if (stageOverlayOpenRafRef.current !== null) {
      window.cancelAnimationFrame(stageOverlayOpenRafRef.current)
    }

    stageOverlayOpenRafRef.current = window.requestAnimationFrame(() => {
      stageOverlayOpenRafRef.current = null
      setStageOverlayOpen(true)
    })
  }

  const clearOverlayPreviewTimers = () => {
    for (const timeoutId of overlayPreviewTimeoutIdsRef.current) {
      window.clearTimeout(timeoutId)
    }
    overlayPreviewTimeoutIdsRef.current = []
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
      clearOverlayPreviewTimers()
      if (stageOverlayOpenRafRef.current !== null) {
        window.cancelAnimationFrame(stageOverlayOpenRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (roomState === 'RUNNING') {
      return
    }

    autoPreviewGameKeyRef.current = null
    autoPreviewRoundKeyRef.current = null
    autoPreviewTurnKeyRef.current = null
    clearOverlayPreviewTimers()
    if (overlayPreview !== 'actual') {
      setOverlayPreview('actual')
    }
  }, [overlayPreview, roomState])

  useEffect(() => {
    if (!currentTurn?.deadlineAtMs || roomState !== 'RUNNING') {
      setTimerNowMs(Date.now())
      return
    }

    setTimerNowMs(Date.now())

    const timerId = window.setInterval(() => {
      setTimerNowMs(Date.now())
    }, 250)

    return () => {
      window.clearInterval(timerId)
    }
  }, [currentTurn?.deadlineAtMs, roomState])

  useEffect(() => {
    const gameKey =
      roomState === 'RUNNING' && state.room.gameId
        ? `${state.room.gameId}`
        : null
    const roundKey =
      roomState === 'RUNNING' && currentRound
        ? `${state.room.gameId ?? 'no-game'}:round:${currentRound.roundNo}`
        : null
    const turnKey =
      roomState === 'RUNNING' && currentTurn
        ? `${state.room.gameId ?? 'no-game'}:turn:${currentTurn.turnId}`
        : null

    if (!gameKey) {
      autoPreviewGameKeyRef.current = null
      autoPreviewRoundKeyRef.current = null
      autoPreviewTurnKeyRef.current = null
      clearOverlayPreviewTimers()
      return
    }

    if (gameKey !== autoPreviewGameKeyRef.current) {
      autoPreviewGameKeyRef.current = gameKey
      autoPreviewRoundKeyRef.current = null
      autoPreviewTurnKeyRef.current = null
      setOverlayPreview('gameStart')
      return
    }

    if (!roundKey) {
      autoPreviewRoundKeyRef.current = null
      autoPreviewTurnKeyRef.current = null
      clearOverlayPreviewTimers()
      return
    }

    if (roundKey !== autoPreviewRoundKeyRef.current) {
      autoPreviewRoundKeyRef.current = roundKey
      autoPreviewTurnKeyRef.current = null
      setOverlayPreview('roundStart')
      return
    }

    if (!turnKey || turnKey === autoPreviewTurnKeyRef.current) {
      return
    }

    autoPreviewTurnKeyRef.current = turnKey
    setOverlayPreview('turnStart')
  }, [
    currentRound,
    currentTurn,
    overlayPreview,
    roomState,
    state.room.gameId,
  ])

  useEffect(() => {
    if (
      overlayPreview !== 'gameStart' &&
      overlayPreview !== 'roundStart' &&
      overlayPreview !== 'turnStart'
    ) {
      return
    }

    clearOverlayPreviewTimers()
    const currentPreview = overlayPreview
    const timeoutId = window.setTimeout(() => {
      setOverlayPreview((preview) => (preview === currentPreview ? 'actual' : preview))
    }, TRANSIENT_STAGE_OVERLAY_MS)
    overlayPreviewTimeoutIdsRef.current.push(timeoutId)

    return () => {
      clearOverlayPreviewTimers()
    }
  }, [
    overlayPreview,
  ])

  useEffect(() => {
    if (overlayPreview === 'turnStart' && currentTurn?.phase && currentTurn.phase !== 'READY') {
      clearOverlayPreviewTimers()
      setOverlayPreview('actual')
    }
  }, [currentTurn?.phase, overlayPreview])

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
  const drawerName = drawer?.nickname ?? '출제자'

  return (
    <div className="gamepage-shell">
      <GameStatusBar
        currentRound={currentRound}
        currentTurn={currentTurn}
        displayedRemainingSec={displayedRemainingSec}
        visibleOrderEntries={visibleOrderEntries}
      />

      <section ref={stageRef} className="game-stage-layout" style={stageStyle}>
        <ParticipantPanel
          participantCount={participants.length}
          animatedParticipants={animatedParticipants}
          mySessionId={state.session.sessionId}
          drawerSessionId={currentTurn?.drawerSessionId}
          currentCorrectIds={currentCorrectIds}
          sidePanelScrollRef={sidePanelScrollRef}
          onParticipantItemRefChange={handleParticipantItemRefChange}
          onParticipantCardAnimationEnd={handleParticipantCardAnimationEnd}
        />

        <GameBoardPanel
          centerPanelRef={centerPanelRef}
          roomState={roomState}
          boardStrokes={boardStrokes}
          canDraw={Boolean(canDraw)}
          tool={tool}
          activePaletteColor={activePaletteColor}
          size={size}
          isHost={isHost}
          settingsOpen={settingsOpen}
          settings={settings}
          currentRound={currentRound}
          currentTurn={currentTurn}
          viewerRole={viewerRole}
          drawerName={drawerName}
          nextDrawerName={nextDrawerName}
          previewMode={previewMode}
          activeStageOverlay={activeStageOverlay}
          stageOverlayOpen={stageOverlayOpen}
          shouldShowSecretWordBanner={shouldShowSecretWordBanner}
          isSecretWordBannerClosed={isSecretWordBannerClosed}
          revealedHintCount={revealedHintCount}
          turnEndOverlaySnapshot={turnEndOverlaySnapshot}
          earnedScores={earnedScores}
          ranking={ranking}
          canUseFullPalette={canUseFullPalette}
          isSharedDrawingPhase={isSharedDrawingPhase}
          forcedPaletteColor={forcedPaletteColor}
          onSendStrokeChunk={handleSendStrokeChunk}
          onCommitStroke={handleCommitStroke}
          onToggleSettings={handleToggleSettings}
          onApplySetting={applySetting}
          onApplyEndMode={applyEndMode}
          onStartGame={handleStartGame}
          onCloseSettings={handleCloseSettings}
          onStageOverlayTransitionEnd={handleStageOverlayTransitionEnd}
          onRequestWordChoice={handleRequestWordChoice}
          onSetTool={handleToolChange}
          onClearCanvas={handleClearCanvas}
          onSetSize={handleSizeChange}
          onSetColor={handleColorChange}
        />

        <GameChatPanel
          visibleChat={visibleChat}
          chatListRef={chatListRef}
          showChatScrollButton={showChatScrollButton}
          guessInput={guessInput}
          onGuessInputChange={setGuessInput}
          onGuessSubmit={submitGuess}
          onChatScroll={handleChatScroll}
          onScrollToBottom={scrollChatToBottom}
        />

        <ParticipantBubbleLayer participantBubbles={participantBubbles} />
      </section>

    </div>
  )
}
