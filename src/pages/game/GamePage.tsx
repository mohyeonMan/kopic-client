import './GamePage.css'
import { useMemo, useRef, type CSSProperties } from 'react'
import {
  defaultSettings,
  type CanvasStroke,
  type ChatMessage,
  type Participant,
} from '../../entities/game/model'
import { useAppState } from '../../app/store/useAppState'
import { ActionErrorModal } from './components/ActionErrorModal'
import { GameBoardPanel } from './components/GameBoardPanel'
import { GameChatPanel } from './components/GameChatPanel'
import { GameStatusBar } from './components/GameStatusBar'
import { ParticipantBubbleLayer } from './components/ParticipantBubbleLayer'
import { ParticipantPanel } from './components/ParticipantPanel'
import {
  EMPTY_SESSION_IDS,
  buildEarnedScores,
  getParticipantAccentColor,
  getVisibleOrder,
} from './gamePageShared'
import { useAnimatedParticipants } from './hooks/useAnimatedParticipants'
import { useChatAutoScroll } from './hooks/useChatAutoScroll'
import { useGameControls } from './hooks/useGameControls'
import { useGameSounds } from './hooks/useGameSounds'
import { useGameStageOverlay } from './hooks/useGameStageOverlay'
import { useParticipantBubbles } from './hooks/useParticipantBubbles'
import { useCountdownSec } from './hooks/useCountdownSec'
import { useMobileGamePanels } from './hooks/useMobileGamePanels'
import { useMobileViewport } from './hooks/useMobileViewport'
import { useSideSyncHeight } from './hooks/useSideSyncHeight'
import { useTurnTimer } from './hooks/useTurnTimer'

const EMPTY_PARTICIPANTS: Participant[] = []
const EMPTY_CANVAS_STROKES: CanvasStroke[] = []
const EMPTY_CHAT: ChatMessage[] = []
const EMPTY_EARNED_POINTS: Record<string, number> = {}

export function GamePage() {
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
  const actionError = state.session.actionError
  const isPrivateRoom = state.room.roomType === 'PRIVATE'
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
  const ranking = participants.slice().sort((left, right) => right.score - left.score).slice(0, 3)

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
  const viewerRole =
    overlayPreview === 'drawingGuesser'
      ? 'guesser'
      : overlayPreview === 'drawingDrawer'
        ? 'drawer'
        : isDrawer
          ? 'drawer'
          : 'guesser'
  const forcedPaletteColor = getParticipantAccentColor(me?.colorIndex)
  const {
    activePaletteColor,
    applyDrawerOrderMode,
    applyEndMode,
    applySetting,
    applyCustomWordMode,
    applyCustomWordsRaw,
    canDraw,
    canUseFullPalette,
    guessInput,
    handleClearCanvas,
    handleCloseSettings,
    handleColorChange,
    handleCommitStroke,
    handleRequestWordChoice,
    handleSendStrokeChunk,
    handleSizeChange,
    handleStartGame,
    handleToggleSettings,
    handleToolChange,
    isSharedDrawingPhase,
    setGuessInput,
    settingsOpen,
    size,
    submitGuess,
    tool,
  } = useGameControls({
    actions,
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
  const boardStrokes =
    roomState === 'LOBBY'
      ? lobbyCanvasStrokes
      : currentTurn?.canvasStrokes ?? lobbyCanvasStrokes
  const canvasSoundKey =
    roomState === 'LOBBY'
      ? 'lobby'
      : roomState === 'RUNNING' && currentTurn
        ? currentTurn.turnId
        : null
  const drawerName = drawer?.nickname ?? '출제자'
  const currentTurnId = currentTurn?.turnId ?? null
  const isMeCorrectInCurrentTurn =
    currentTurn !== null && currentTurn.phase === 'DRAWING'
      ? currentTurn.correctSessionIds.includes(state.session.sessionId) &&
        state.session.sessionId !== currentTurn.drawerSessionId
      : false
  const correctHighlightTurnId = isMeCorrectInCurrentTurn ? currentTurnId : null
  const isCorrectHighlightActive =
    roomState === 'RUNNING' &&
    currentTurnId !== null &&
    currentTurnId === correctHighlightTurnId &&
    !isDrawer
  const secretWordBannerSoundKey =
    shouldShowSecretWordBanner && !isSecretWordBannerClosed && currentTurn
      ? viewerRole === 'drawer'
        ? `${currentTurn.turnId}-${currentTurn.selectedWord ?? 'hidden'}`
        : `${currentTurn.turnId}-masked-${
            currentTurn.hintPattern ?? currentTurn.answerLength ?? 'unknown'
          }`
      : null

  const stageStyle: CSSProperties | undefined =
    ({
      ...(sideSyncHeight && sideSyncHeight > 0
        ? { ['--game-side-sync-height' as string]: `${sideSyncHeight}px` }
        : null),
    }) as CSSProperties
  const pageClassName = `gamepage-shell gamepage-shell-mobile-${activeMobilePanel}`

  useGameSounds({
    activeStageOverlay,
    canvasSoundKey,
    canvasStrokeCount: boardStrokes.length,
    isCorrectHighlightActive,
    participants,
    roomState,
    secretWordBannerSoundKey,
    settingsOpen,
    stageOverlayOpen,
  })

  return (
    <div className={pageClassName}>
      <GameStatusBar
        containerRef={statusBarRef}
        currentRound={currentRound}
        currentTurn={currentTurn}
        displayedRemainingSec={displayedRemainingSec}
        visibleOrderEntries={visibleOrderEntries}
      />

      <ActionErrorModal
        actionError={actionError}
        onDismiss={actions.dismissActionError}
      />

      <section ref={stageRef} className="game-stage-layout" style={stageStyle}>
        <ParticipantPanel
          containerRef={participantPanelRef}
          animatedParticipants={animatedParticipants}
          mySessionId={state.session.sessionId}
          drawerSessionId={currentTurn?.drawerSessionId}
          currentCorrectIds={currentCorrectIds}
          isMobileActive={activeMobilePanel === 'participants'}
          sidePanelScrollRef={sidePanelScrollRef}
          onParticipantItemRefChange={handleParticipantItemRefChange}
          onParticipantCardAnimationEnd={handleParticipantCardAnimationEnd}
        />

        <GameBoardPanel
          centerPanelRef={centerPanelRef}
          participantCount={participants.length}
          isPrivateRoom={isPrivateRoom}
          roomState={roomState}
          boardStrokes={boardStrokes}
          canDraw={canDraw}
          tool={tool}
          activePaletteColor={activePaletteColor}
          size={size}
          isHost={isHost}
          isCorrectHighlightActive={isCorrectHighlightActive}
          settingsOpen={settingsOpen}
          settings={settings}
          currentRound={currentRound}
          currentTurn={currentTurn}
          viewerRole={viewerRole}
          drawerName={drawerName}
          nextDrawerName={nextDrawerName}
          previewMode={previewMode}
          gameStartCountdownSec={gameStartRemainingSec}
          roundStartCountdownSec={roundStartRemainingSec}
          turnStartCountdownSec={currentTurn?.phase === 'READY' ? displayedRemainingSec : undefined}
          wordChoiceCountdownSec={
            currentTurn?.phase === 'WORD_CHOICE' ? displayedRemainingSec : undefined
          }
          nextTurnCountdownSec={currentTurn?.phase === 'TURN_END' ? turnEndRemainingSec : undefined}
          returnToLobbyCountdownSec={roomState === 'RESULT' ? resultRemainingSec : undefined}
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
          onApplyDrawerOrderMode={applyDrawerOrderMode}
          onApplySetting={applySetting}
          onApplyCustomWordMode={applyCustomWordMode}
          onApplyCustomWordsRaw={applyCustomWordsRaw}
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

        <div className="game-mobile-panel-switcher" role="tablist" aria-label="모바일 하단 패널">
          <button
            type="button"
            role="tab"
            aria-selected={activeMobilePanel === 'chat'}
            className={
              activeMobilePanel === 'chat'
                ? 'game-mobile-panel-switcher-button game-mobile-panel-switcher-button-active'
                : 'game-mobile-panel-switcher-button'
            }
            onClick={() => focusMobilePanel('chat')}
          >
            채팅
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMobilePanel === 'participants'}
            className={
              activeMobilePanel === 'participants'
                ? 'game-mobile-panel-switcher-button game-mobile-panel-switcher-button-active'
                : 'game-mobile-panel-switcher-button'
            }
            onClick={() => focusMobilePanel('participants')}
          >
            참여자 {participants.length}
          </button>
        </div>

        <GameChatPanel
          containerRef={chatPanelRef}
          visibleChat={visibleChat}
          chatListRef={chatListRef}
          showChatScrollButton={showChatScrollButton}
          guessInput={guessInput}
          isComposerFocused={isChatComposerFocused}
          isMobileActive={activeMobilePanel === 'chat'}
          onGuessInputChange={setGuessInput}
          onGuessSubmit={submitGuess}
          onChatScroll={handleChatScroll}
          onComposerBlur={handleChatComposerBlur}
          onComposerFocus={handleChatComposerFocus}
          onScrollToBottom={scrollChatToBottom}
        />

        <ParticipantBubbleLayer participantBubbles={participantBubbles} />
      </section>
    </div>
  )
}
