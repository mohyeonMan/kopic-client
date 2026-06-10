import { useMemo, useRef, type CSSProperties } from 'react'
import {
  defaultSettings,
  type CanvasStroke,
  type ChatMessage,
  type Participant,
} from '@/entities/game/model'
import { useAppState } from '@/app/store/useAppState'
import { useGameControls } from '@/features/game-board/model/useGameControls'
import { useGameSoundPreference } from '@/features/game-board/model/useGameSoundPreference'
import { useGameSounds } from '@/features/game-board/model/useGameSounds'
import { useGameStageOverlay } from '@/features/game-board/model/useGameStageOverlay'
import {
  EMPTY_SESSION_IDS,
  buildEarnedScores,
  getParticipantAccentColor,
  getVisibleOrder,
  type ViewerRole,
} from '@/features/game-board/model/gameBoardShared'
import { useChatAutoScroll } from '@/features/game-chat/model/useChatAutoScroll'
import { useCountdownSec } from '@/features/game-progress/model/useCountdownSec'
import { useTurnTimer } from '@/features/game-progress/model/useTurnTimer'
import { useAnimatedParticipants } from '@/features/participants/model/useAnimatedParticipants'
import { useParticipantBubbles } from '@/features/participants/model/useParticipantBubbles'
import { useMobileGamePanels } from './useMobileGamePanels'
import { useMobileViewport } from './useMobileViewport'
import { useSideSyncHeight } from './useSideSyncHeight'

const EMPTY_PARTICIPANTS: Participant[] = []
const EMPTY_CANVAS_STROKES: CanvasStroke[] = []
const EMPTY_CHAT: ChatMessage[] = []
const EMPTY_EARNED_POINTS: Record<string, number> = {}

export function useGamePageModel() {
  const { state, actions, server } = useAppState()
  const statusBarRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLElement | null>(null)
  const centerPanelRef = useRef<HTMLElement | null>(null)
  const participantPanelRef = useRef<HTMLElement | null>(null)
  const chatPanelRef = useRef<HTMLElement | null>(null)
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null)
  const {
    activeMobilePanel,
    focusMobilePanel,
    handleChatComposerBlur,
    handleChatComposerFocus,
    isChatComposerFocused,
  } = useMobileGamePanels({
    chatPanelRef,
    participantPanelRef,
    statusBarRef,
  })

  const { currentRound, currentTurn, roomState, hostSessionId } = state.room
  const participants = Array.isArray(state.room.participants)
    ? state.room.participants
    : EMPTY_PARTICIPANTS
  const lobbyCanvasStrokes = Array.isArray(state.room.lobbyCanvasStrokes)
    ? state.room.lobbyCanvasStrokes
    : EMPTY_CANVAS_STROKES
  const chat = Array.isArray(state.room.chat) ? state.room.chat : EMPTY_CHAT
  const settings = state.room.settings ?? defaultSettings
  const isHost = hostSessionId === state.session.sessionId
  const drawer = participants.find(
    (participant) => participant.sessionId === currentTurn?.drawerSessionId,
  )
  const me = participants.find(
    (participant) => participant.sessionId === state.session.sessionId,
  )
  const isDrawer = state.session.sessionId === currentTurn?.drawerSessionId
  const currentCorrectIds = currentTurn?.correctSessionIds ?? EMPTY_SESSION_IDS
  const currentEarnedPoints = currentTurn?.earnedPoints ?? EMPTY_EARNED_POINTS
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
  const ranking = participants.slice().sort((left, right) => right.score - left.score)
  const visibleChat = useMemo(
    () => chat.filter((message) => message.tone !== 'system'),
    [chat],
  )
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
  const displayedRemainingSec = useTurnTimer({
    currentTurn,
    roomState,
  })
  const gameStartRemainingSec = useCountdownSec({
    active: roomState === 'RUNNING',
    deadlineAtMs: state.room.gameStartDeadlineAtMs,
    fallbackSec: state.room.gameStartRemainingSec,
  })
  const roundStartRemainingSec = useCountdownSec({
    active: roomState === 'RUNNING',
    deadlineAtMs: state.room.roundStartDeadlineAtMs,
    fallbackSec: state.room.roundStartRemainingSec,
  })
  const gameStartCountdownActive =
    typeof state.room.gameStartDeadlineAtMs === 'number' ||
    typeof state.room.gameStartRemainingSec === 'number'
  const roundStartCountdownActive =
    typeof state.room.roundStartDeadlineAtMs === 'number' ||
    typeof state.room.roundStartRemainingSec === 'number'
  const turnEndRemainingSec = useCountdownSec({
    active: roomState === 'RUNNING' && currentTurn?.phase === 'TURN_END',
    deadlineAtMs: currentTurn?.phase === 'TURN_END' ? currentTurn.deadlineAtMs : undefined,
    fallbackSec: currentTurn?.phase === 'TURN_END' ? currentTurn.remainingSec : 0,
  })
  const resultRemainingSec = useCountdownSec({
    active: roomState === 'RESULT',
    deadlineAtMs: state.room.resultDeadlineAtMs,
    fallbackSec: state.room.resultRemainingSec,
  })
  const {
    activeStageOverlay,
    handleStageOverlayTransitionEnd,
    isSecretWordBannerClosed,
    overlayPreview,
    previewMode,
    setOverlayPreview,
    shouldShowSecretWordBanner,
    stageOverlayOpen,
    turnEndOverlaySnapshot,
  } = useGameStageOverlay({
    currentRound,
    currentTurn,
    earnedScores,
    gameStartCountdownActive,
    gameId: state.room.gameId,
    isDrawer,
    roomState,
    roundStartCountdownActive,
  })
  const viewerRole: ViewerRole =
    overlayPreview === 'drawingGuesser'
      ? 'guesser'
      : overlayPreview === 'drawingDrawer'
        ? 'drawer'
        : isDrawer
          ? 'drawer'
          : 'guesser'
  const forcedPaletteColor = getParticipantAccentColor(me?.colorIndex)
  const boardStrokes =
    roomState === 'LOBBY'
      ? lobbyCanvasStrokes
      : currentTurn?.canvasStrokes ?? lobbyCanvasStrokes
  const {
    activePaletteColor,
    applyDrawerOrderMode,
    applyEndMode,
    applySetting,
    applyCustomWordMode,
    applyCustomWordsRaw,
    canDraw,
    canRedoCanvas,
    canUndoCanvas,
    canUseFullPalette,
    guessInput,
    handleClearCanvas,
    handleCloseSettings,
    handleColorChange,
    handleCommitStroke,
    handleRequestWordChoice,
    handleRedoCanvas,
    handleSendStrokeChunk,
    handleSizeChange,
    handleStartGame,
    handleToggleSettings,
    handleToolChange,
    handleUndoCanvas,
    isSharedDrawingPhase,
    setGuessInput,
    settingsOpen,
    size,
    submitGuess,
    tool,
  } = useGameControls({
    actions,
    canvasRedoStack: state.room.canvasRedoStack,
    canvasStrokes: boardStrokes,
    forcedPaletteColor,
    isHost,
    onBeforeRequestWordChoice: () => setOverlayPreview('actual'),
    roomState,
    server,
    viewerRole,
    currentTurnPhase: currentTurn?.phase,
    currentTurnWordChoices: currentTurn?.wordChoices,
  })
  const { animatedParticipants, handleParticipantCardAnimationEnd } =
    useAnimatedParticipants(participants)
  const {
    chatListRef,
    handleChatScroll,
    scrollChatToBottom,
    showChatScrollButton,
  } = useChatAutoScroll(visibleChat)
  const {
    handleParticipantItemRefChange,
    participantBubbles,
  } = useParticipantBubbles({
    participants,
    sidePanelScrollRef,
    stageRef,
    visibleChat,
  })
  const sideSyncHeight = useSideSyncHeight(centerPanelRef)
  const { soundEnabled, toggleSoundEnabled } = useGameSoundPreference()
  useMobileViewport()

  const revealedHintCount = (() => {
    if (!currentTurn || currentTurn.phase !== 'DRAWING' || !currentTurn.selectedWord) {
      return 0
    }

    const interval = Math.max(1, settings.hintRevealSec)
    const lettersPerReveal = Math.max(1, settings.hintLetterCount)
    const elapsedSec = Math.max(0, settings.drawSec - displayedRemainingSec)
    return Math.floor(elapsedSec / interval) * lettersPerReveal
  })()
  const drawerName = drawer?.nickname ?? '출제자'
  const currentTurnId = currentTurn?.turnId ?? null
  const isMeCorrectInCurrentTurn =
    currentTurn !== null && (currentTurn.phase === 'DRAWING' || currentTurn.phase === 'TURN_END')
      ? currentTurn.correctSessionIds.includes(state.session.sessionId) &&
        state.session.sessionId !== currentTurn.drawerSessionId
      : false
  const correctHighlightTurnId = isMeCorrectInCurrentTurn ? currentTurnId : null
  const isCorrectHighlightActive =
    roomState === 'RUNNING' &&
    currentTurnId !== null &&
    currentTurnId === correctHighlightTurnId &&
    !isDrawer
  const stageStyle: CSSProperties | undefined =
    ({
      ...(sideSyncHeight && sideSyncHeight > 0
        ? { ['--game-side-sync-height' as string]: `${sideSyncHeight}px` }
        : null),
    }) as CSSProperties
  const pageClassName = `gamepage-shell gamepage-shell-mobile-${activeMobilePanel}`

  useGameSounds({
    enabled: soundEnabled,
    soundEvents: state.soundEvents,
  })

  return {
    actionError: state.session.actionError,
    chatPanelProps: {
      chatListRef,
      containerRef: chatPanelRef,
      guessInput,
      isComposerFocused: isChatComposerFocused,
      isMobileActive: activeMobilePanel === 'chat',
      onChatScroll: handleChatScroll,
      onComposerBlur: handleChatComposerBlur,
      onComposerFocus: handleChatComposerFocus,
      onGuessInputChange: setGuessInput,
      onGuessSubmit: submitGuess,
      onScrollToBottom: scrollChatToBottom,
      showChatScrollButton,
      visibleChat,
    },
    dismissActionError: actions.dismissActionError,
    focusMobilePanel,
    gameBoardPanelProps: {
      activePaletteColor,
      activeStageOverlay,
      boardStrokes,
      canDraw,
      canRedoCanvas,
      canUndoCanvas,
      canUseFullPalette,
      centerPanelRef,
      currentRound,
      currentTurn,
      drawerName,
      earnedScores,
      forcedPaletteColor,
      gameStartCountdownSec: gameStartRemainingSec,
      isCorrectHighlightActive,
      isHost,
      isPrivateRoom: state.room.roomType === 'PRIVATE',
      isSecretWordBannerClosed,
      isSharedDrawingPhase,
      mySessionId: state.session.sessionId,
      nextDrawerName,
      nextTurnCountdownSec: currentTurn?.phase === 'TURN_END' ? turnEndRemainingSec : undefined,
      onApplyCustomWordMode: applyCustomWordMode,
      onApplyCustomWordsRaw: applyCustomWordsRaw,
      onApplyDrawerOrderMode: applyDrawerOrderMode,
      onApplyEndMode: applyEndMode,
      onApplySetting: applySetting,
      onClearCanvas: handleClearCanvas,
      onCloseSettings: handleCloseSettings,
      onCommitStroke: handleCommitStroke,
      onRequestWordChoice: handleRequestWordChoice,
      onRedoCanvas: handleRedoCanvas,
      onSendStrokeChunk: handleSendStrokeChunk,
      onSetColor: handleColorChange,
      onSetSize: handleSizeChange,
      onSetTool: handleToolChange,
      onToggleSoundEnabled: toggleSoundEnabled,
      onUndoCanvas: handleUndoCanvas,
      onStageOverlayTransitionEnd: handleStageOverlayTransitionEnd,
      onStartGame: handleStartGame,
      onToggleSettings: handleToggleSettings,
      participantCount: participants.length,
      previewMode,
      ranking,
      returnToLobbyCountdownSec: roomState === 'RESULT' ? resultRemainingSec : undefined,
      revealedHintCount,
      roomState,
      roundStartCountdownSec: roundStartRemainingSec,
      settings,
      settingsOpen,
      shouldShowSecretWordBanner,
      size,
      soundEnabled,
      stageOverlayOpen,
      tool,
      turnEndOverlaySnapshot,
      turnStartCountdownSec: currentTurn?.phase === 'READY' ? displayedRemainingSec : undefined,
      viewerRole,
      wordChoiceCountdownSec: currentTurn?.phase === 'WORD_CHOICE' ? displayedRemainingSec : undefined,
    },
    mobilePanel: {
      activeMobilePanel,
      participantCount: participants.length,
    },
    pageClassName,
    participantBubbles,
    participantPanelProps: {
      animatedParticipants,
      containerRef: participantPanelRef,
      currentCorrectIds,
      drawerSessionId: currentTurn?.drawerSessionId,
      isMobileActive: activeMobilePanel === 'participants',
      mySessionId: state.session.sessionId,
      onParticipantCardAnimationEnd: handleParticipantCardAnimationEnd,
      onParticipantItemRefChange: handleParticipantItemRefChange,
      sidePanelScrollRef,
    },
    stageRef,
    stageStyle,
    statusBarProps: {
      containerRef: statusBarRef,
      currentRound,
      currentTurn,
      displayedRemainingSec,
      visibleOrderEntries,
    },
  }
}
