import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type {
  AnimationEvent as ReactAnimationEvent,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  TransitionEvent as ReactTransitionEvent,
} from 'react'
import { defaultSettings } from '../../app/store/mockAppState'
import type { CanvasStroke, DrawingTool, Participant } from '../../app/store/mockAppState'
import { useAppState } from '../../app/store/useAppState'
import { CanvasBoard } from '../../features/game-canvas/CanvasBoard'

type OverlayPreview =
  | 'actual'
  | 'gameStart'
  | 'roundStart'
  | 'turnStart'
  | 'wordChoice'
  | 'drawingDrawer'
  | 'drawingGuesser'
  | 'turnEnd'
  | 'gameResult'

type StageOverlayPhase = 'gameStart' | 'roundStart' | 'turnStart' | 'wordChoice' | 'turnEnd'

const TOOL_COLORS = [
  '#000000',
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

function toGrayscaleHex(hexColor: string) {
  const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor
  if (hex.length !== 6) {
    return hexColor
  }

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)

  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
    return hexColor
  }

  const luminance = Math.round(red * 0.299 + green * 0.587 + blue * 0.114)
  const channel = luminance.toString(16).padStart(2, '0')
  return `#${channel}${channel}${channel}`
}

const TOOL_COLORS_GRAYSCALE = TOOL_COLORS.map((color) => toGrayscaleHex(color))

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

const STAGE_OVERLAY_PHASES: readonly StageOverlayPhase[] = ['gameStart', 'roundStart', 'turnStart', 'wordChoice', 'turnEnd']
const TRANSIENT_STAGE_OVERLAY_MS = 5000

type NumericSettingKey = keyof typeof SETTING_OPTIONS

type EarnedScore = {
  sessionId: string
  nickname: string
  score: number
  role: 'drawer' | 'correct' | 'miss'
}

type VisibleOrderEntry = {
  sessionId: string
  nickname: string
}

type TurnEndOverlaySnapshot = {
  turnId: string
  answerText: string
  earnedScores: EarnedScore[]
}

type ParticipantBubblePosition = {
  sessionId: string
  text: string
  createdAt: number
  top: number
  left: number
}

type AnimatedParticipantItem = {
  participant: Participant
  phase: 'stable' | 'enter' | 'exit'
}

const EMPTY_SESSION_IDS: string[] = []

function participantTone(participant: Participant, drawerSessionId?: string, correctSessionIds?: string[]) {
  if (participant.sessionId === drawerSessionId) {
    return 'participant-card participant-card-drawer'
  }

  if (correctSessionIds?.includes(participant.sessionId)) {
    return 'participant-card participant-card-correct'
  }

  return 'participant-card'
}

function buildEarnedScores(
  participants: Participant[],
  correctSessionIds: string[],
  earnedPoints: Record<string, number>,
  drawerSessionId?: string,
) {
  const rows: EarnedScore[] = participants.map((participant) => {
    const earnedPoint = earnedPoints[participant.sessionId] ?? 0

    if (participant.sessionId === drawerSessionId) {
      return { sessionId: participant.sessionId, nickname: participant.nickname, score: earnedPoint, role: 'drawer' }
    }

    if (correctSessionIds.includes(participant.sessionId)) {
      return { sessionId: participant.sessionId, nickname: participant.nickname, score: earnedPoint, role: 'correct' }
    }

    return { sessionId: participant.sessionId, nickname: participant.nickname, score: earnedPoint, role: 'miss' }
  })

  return rows.sort((left, right) => right.score - left.score)
}

function getVisibleOrder(participants: Participant[], drawerOrder: string[] | undefined) {
  if (!drawerOrder || drawerOrder.length === 0) {
    return []
  }

  return drawerOrder
    .map((sessionId) => {
      const participant = participants.find((item) => item.sessionId === sessionId)
      if (!participant) {
        return null
      }

      return {
        sessionId: participant.sessionId,
        nickname: participant.nickname,
      }
    })
    .filter((entry): entry is VisibleOrderEntry => entry !== null)
}

function getMaskedWord(word: string | null, revealedCount: number, answerLength?: number) {
  if (!word) {
    if (typeof answerLength === 'number' && answerLength > 0) {
      return '●'.repeat(answerLength)
    }

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
  const isDrawer = state.session.sessionId === currentTurn?.drawerSessionId
  const viewerRole =
    overlayPreview === 'drawingGuesser' ? 'guesser' : overlayPreview === 'drawingDrawer' ? 'drawer' : isDrawer ? 'drawer' : 'guesser'
  const visibleOrderEntries = getVisibleOrder(participants, currentRound?.drawerOrder)
  const nextDrawerName = (() => {
    if (!currentRound || currentRound.drawerOrder.length === 0) {
      return null
    }

    return (
      participants.find((participant) => participant.sessionId === currentRound.drawerOrder[0])?.nickname ??
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
            <strong>{currentTurn ? `${displayedRemainingSec}s` : '-'}</strong>
          </div>
          <div className="order-strip-box">
            <span className="order-strip-label">이번 라운드 그림 순서</span>
            <div className="order-strip" role="list">
              {visibleOrderEntries.map((entry) => (
                <span key={entry.sessionId} className="order-pill" role="listitem">
                  {entry.nickname}
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
	                {animatedParticipants.map(({ participant, phase }) => (
                <li
                  key={participant.sessionId}
                  ref={(element) => {
                    participantItemRefs.current.set(participant.sessionId, element)
                  }}
                  className={
                    `${
                      participant.sessionId === state.session.sessionId
                        ? `${participantTone(participant, currentTurn?.drawerSessionId, currentCorrectIds)} participant-card-self`
                        : participantTone(participant, currentTurn?.drawerSessionId, currentCorrectIds)
                    }${
                      phase === 'enter'
                        ? ' participant-card-enter'
                        : phase === 'exit'
                          ? ' participant-card-exit'
                          : ''
                    }`
                  }
                  onAnimationEnd={(event) =>
                    handleParticipantCardAnimationEnd(event, participant.sessionId, phase)
                  }
                >
                    <div className="participant-main">
                      <div className="participant-heading participant-heading-top">
                        <strong>{participant.nickname}</strong>
                      </div>
                      <div className="participant-meta-row">
                        {participant.isHost ? <span className="host-badge">Host</span> : <span className="host-badge-placeholder" aria-hidden="true" />}
                        <p className="participant-score">{participant.score} pts</p>
                      </div>
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
                onSendStrokeChunk={handleSendStrokeChunk}
                onCommitStroke={handleCommitStroke}
              />

              {roomState === 'LOBBY' ? (
                <button
                  type="button"
                  className={settingsOpen ? 'board-settings-toggle secondary-button board-settings-toggle-hidden' : 'board-settings-toggle secondary-button'}
                  onClick={() => setSettingsOpen((open) => !open)}
                >
                  {isHost ? '설정 열기' : '설정 보기'}
                </button>
              ) : null}

              {shouldShowSecretWordBanner && currentTurn ? (
                <div
                  key={
                    viewerRole === 'drawer'
                      ? `${currentTurn.turnId}-${currentTurn.selectedWord ?? 'hidden'}`
                      : `${currentTurn.turnId}-masked-${currentTurn.answerLength ?? 'unknown'}`
                  }
                  className={
                    isSecretWordBannerClosed
                      ? `secret-word-banner${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-closed`
                      : `secret-word-banner secret-word-banner-landing${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-open`
                  }
                >
                  {viewerRole === 'drawer'
                    ? currentTurn.selectedWord ?? getMaskedWord(null, 0, currentTurn.answerLength)
                    : getMaskedWord(currentTurn.selectedWord, revealedHintCount, currentTurn.answerLength)}
                </div>
              ) : null}

              {roomState === 'LOBBY' ? (
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
                        className={!isHost ? 'select-no-caret' : undefined}
                        disabled={!isHost}
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
                        className={!isHost ? 'select-no-caret' : undefined}
                        disabled={!isHost}
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
                        className={!isHost ? 'select-no-caret' : undefined}
                        disabled={!isHost}
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
                        className={!isHost ? 'select-no-caret' : undefined}
                        disabled={!isHost}
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
                        className={!isHost ? 'select-no-caret' : undefined}
                        disabled={!isHost}
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
                        className={!isHost ? 'select-no-caret' : undefined}
                        disabled={!isHost}
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
                        className={!isHost ? 'select-no-caret' : undefined}
                        disabled={!isHost}
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
                    {isHost ? (
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
                    ) : null}
                    <button type="button" className="secondary-button settings-close-button" onClick={() => setSettingsOpen(false)}>
                      닫기
                    </button>
                  </div>
                </div>
              ) : null}

              {roomState === 'RUNNING' ? (
                <div
                  className={
                    activeStageOverlay === 'gameStart' && stageOverlayOpen
                      ? 'canvas-full-overlay canvas-full-overlay-open'
                      : 'canvas-full-overlay canvas-full-overlay-closed'
                  }
                  aria-hidden={activeStageOverlay !== 'gameStart'}
                  onTransitionEnd={handleStageOverlayTransitionEnd}
                >
                  <strong>게임을 시작합니다.</strong>
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
                  <strong>{currentRound ? `${currentRound.roundNo}라운드` : '1라운드'}</strong>
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
                    <strong>
                      {viewerRole === 'drawer' && currentTurn.wordChoices.length > 0
                        ? '제시어를 선택해주세요.'
                        : `${drawer?.nickname ?? '출제자'}님이 제시어를 선택중입니다.`}
                    </strong>
                  </div>
                  {currentTurn.wordChoices.length > 0 ? (
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
                  ) : null}
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
                  <strong>{`${drawer?.nickname ?? '출제자'}님이 그림을 그립니다.`}</strong>
                  {nextDrawerName ? <span>{`다음은 ${nextDrawerName}님`}</span> : null}
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
                    <div className="turn-end-summary">
                      <p className="turn-end-answer">
                        <span className="turn-end-answer-prefix">정답은</span>
                        <strong className="turn-end-answer-word">
                          {turnEndOverlaySnapshot?.answerText ?? currentTurn?.selectedWord ?? getMaskedWord(null, 0, currentTurn?.answerLength)}
                        </strong>
                        <span className="turn-end-answer-suffix">입니다.</span>
                      </p>
                      <div className="earned-score-content turn-end-earned-score-content">
                        <div className="earned-score-table">
                          <div className="earned-score-table-head" aria-hidden="true">
                            <span className="score-col-rank">순위</span>
                            <span className="score-col-name">참여자</span>
                            <span className="score-col-result">결과</span>
                            <span className="score-col-points">점수</span>
                          </div>
                          <div className="earned-score-table-body">
                            {(turnEndOverlaySnapshot?.earnedScores ?? earnedScores).map((row, index) => (
                              <div
                                key={row.sessionId}
                                className={
                                  row.role === 'correct'
                                    ? 'earned-score-row earned-score-row-correct'
                                    : row.role === 'drawer'
                                      ? 'earned-score-row earned-score-row-drawer'
                                      : 'earned-score-row'
                                }
                              >
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
                </div>
              ) : null}

              {previewMode === 'gameResult' ? (
                <div className="canvas-result-screen">
                  {ranking.map((participant, index) => (
                    <div key={participant.sessionId} className={index === 0 ? 'result-rank result-rank-winner' : 'result-rank'}>
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
                  disabled={!canDraw}
                >
                  펜
                </button>
                <button
                  type="button"
                  className={tool === 'ERASER' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setTool('ERASER')}
                  disabled={!canDraw}
                >
                  지우개
                </button>
                <button
                  type="button"
                  className={tool === 'FILL' ? 'primary-button' : 'secondary-button'}
                  onClick={() => setTool('FILL')}
                  disabled={!canDraw}
                >
                  채우기
                </button>
                <button type="button" className="secondary-button" onClick={handleClearCanvas} disabled={!canDraw}>
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
                  disabled={!canDraw}
                />
              </label>
              <div className="color-palette">
                {TOOL_COLORS.map((swatch, swatchIndex) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Select ${swatch}`}
                    className={swatch === color ? 'color-swatch color-swatch-active' : 'color-swatch'}
                    style={
                      canDraw
                        ? { background: swatch }
                        : { background: TOOL_COLORS_GRAYSCALE[swatchIndex] }
                    }
                    onClick={() => {
                      setTool((currentTool) => (currentTool === 'ERASER' ? 'PEN' : currentTool))
                      setColor(swatch)
                    }}
                    disabled={!canDraw}
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
                <li
                  key={message.id}
                  className={`chat-${message.tone}`}
                >
                  <strong
                    className={
                      message.mine === true
                        ? 'chat-nickname chat-nickname-mine'
                        : 'chat-nickname'
                    }
                  >
                    {message.nickname}
                  </strong>
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
              key={`${bubble.sessionId}-${bubble.createdAt}`}
              className="participant-bubble-floating"
              style={{ top: `${bubble.top}px`, left: `${bubble.left}px` }}
            >
              <span className="participant-bubble-text">{bubble.text}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
