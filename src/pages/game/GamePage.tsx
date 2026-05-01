import { useMemo, useRef, type CSSProperties } from 'react'
import { defaultSettings } from '../../entities/game/model'
import { useAppState } from '../../app/store/useAppState'
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
import { useGameStageOverlay } from './hooks/useGameStageOverlay'
import { useParticipantBubbles } from './hooks/useParticipantBubbles'
import { useSideSyncHeight } from './hooks/useSideSyncHeight'
import { useTurnTimer } from './hooks/useTurnTimer'

export function GamePage() {
  const { state, actions, server } = useAppState()
  const stageRef = useRef<HTMLElement | null>(null)
  const centerPanelRef = useRef<HTMLElement | null>(null)
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null)

  const { currentRound, currentTurn, roomState, hostSessionId } = state.room
  const participants = Array.isArray(state.room.participants) ? state.room.participants : []
  const lobbyCanvasStrokes = Array.isArray(state.room.lobbyCanvasStrokes)
    ? state.room.lobbyCanvasStrokes
    : []
  const chat = Array.isArray(state.room.chat) ? state.room.chat : []
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
  const currentEarnedPoints = currentTurn?.earnedPoints ?? {}

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
    gameId: state.room.gameId,
    isDrawer,
    roomState,
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
    applyEndMode,
    applySetting,
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
  const drawerName = drawer?.nickname ?? '출제자'
  const stageStyle: CSSProperties | undefined =
    sideSyncHeight && sideSyncHeight > 0
      ? ({ ['--game-side-sync-height' as string]: `${sideSyncHeight}px` } as CSSProperties)
      : undefined

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
          canDraw={canDraw}
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
