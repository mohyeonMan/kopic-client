import './board/BoardOverlayShared.css'
import './GameBoardPanel.css'
import type { RefObject, TransitionEvent as ReactTransitionEvent } from 'react'
import type {
  CanvasStroke,
  DrawingTool,
  GameSettings,
  Participant,
  RoundSummary,
  RoomState,
  TurnSummary,
} from '../../../entities/game/model'
import type {
  EarnedScore,
  NumericSettingKey,
  OverlayPreview,
  StageOverlayPhase,
  TurnEndOverlaySnapshot,
  ViewerRole,
} from '../gamePageShared'
import { BoardCanvas } from './board/BoardCanvas'
import { BoardToolbar } from './board/BoardToolbar'
import { LobbySettingsOverlay } from './board/LobbySettingsOverlay'
import { TurnOverlay } from './board/TurnOverlay'

type GameBoardPanelProps = {
  activePaletteColor: string
  activeStageOverlay: StageOverlayPhase | null
  boardStrokes: CanvasStroke[]
  canDraw: boolean
  canUseFullPalette: boolean
  centerPanelRef: RefObject<HTMLElement | null>
  participantCount: number
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  drawerName: string
  earnedScores: EarnedScore[]
  forcedPaletteColor?: string
  gameStartCountdownSec?: number
  isHost: boolean
  isPrivateRoom: boolean
  isCorrectHighlightActive: boolean
  isSecretWordBannerClosed: boolean
  isSharedDrawingPhase: boolean
  nextTurnCountdownSec?: number
  nextDrawerName: string | null
  onApplyEndMode: (value: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT') => void
  onApplyCustomWordMode: (value: 'CUSTOM_ONLY' | 'BASE_PLUS_CUSTOM') => void
  onApplyCustomWordsRaw: (value: string) => void
  onApplySetting: (key: NumericSettingKey, value: string) => void
  onClearCanvas: () => void
  onCloseSettings: () => void
  onCommitStroke: (stroke: CanvasStroke) => void
  onRequestWordChoice: (choiceIndex: number) => void
  onSendStrokeChunk: (stroke: CanvasStroke) => void
  onSetColor: (color: string) => void
  onSetSize: (size: number) => void
  onSetTool: (tool: DrawingTool) => void
  onStageOverlayTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  onStartGame: () => void
  onToggleSettings: () => void
  previewMode: OverlayPreview
  returnToLobbyCountdownSec?: number
  ranking: Participant[]
  revealedHintCount: number
  roomState: RoomState
  roundStartCountdownSec?: number
  settings: GameSettings
  settingsOpen: boolean
  shouldShowSecretWordBanner: boolean
  size: number
  stageOverlayOpen: boolean
  tool: DrawingTool
  turnStartCountdownSec?: number
  turnEndOverlaySnapshot: TurnEndOverlaySnapshot | null
  viewerRole: ViewerRole
  wordChoiceCountdownSec?: number
}

export function GameBoardPanel({
  activePaletteColor,
  activeStageOverlay,
  boardStrokes,
  canDraw,
  canUseFullPalette,
  centerPanelRef,
  participantCount,
  currentRound,
  currentTurn,
  drawerName,
  earnedScores,
  forcedPaletteColor,
  gameStartCountdownSec,
  isHost,
  isPrivateRoom,
  isCorrectHighlightActive,
  isSecretWordBannerClosed,
  isSharedDrawingPhase,
  nextTurnCountdownSec,
  nextDrawerName,
  onApplyEndMode,
  onApplyCustomWordMode,
  onApplyCustomWordsRaw,
  onApplySetting,
  onClearCanvas,
  onCloseSettings,
  onCommitStroke,
  onRequestWordChoice,
  onSendStrokeChunk,
  onSetColor,
  onSetSize,
  onSetTool,
  onStageOverlayTransitionEnd,
  onStartGame,
  onToggleSettings,
  previewMode,
  returnToLobbyCountdownSec,
  ranking,
  revealedHintCount,
  roomState,
  roundStartCountdownSec,
  settings,
  settingsOpen,
  shouldShowSecretWordBanner,
  size,
  stageOverlayOpen,
  tool,
  turnStartCountdownSec,
  turnEndOverlaySnapshot,
  viewerRole,
  wordChoiceCountdownSec,
}: GameBoardPanelProps) {
  const isCustomOnlyWithoutRaw =
    !isPrivateRoom &&
    settings.customWordMode === 'CUSTOM_ONLY' &&
    settings.customWordsRaw.trim().length === 0
  const hasMinimumParticipants = participantCount >= 2
  const canStartGame = isHost && hasMinimumParticipants && !isCustomOnlyWithoutRaw
  const shouldShowPrivateStartButton = isPrivateRoom && isHost

  return (
    <section ref={centerPanelRef} className="panel game-center-panel">
      <div className="board-shell">
        <div
          className={
            isCorrectHighlightActive
              ? 'board-frame board-frame-correct-highlight'
              : 'board-frame'
          }
        >
          <BoardCanvas
            activePaletteColor={activePaletteColor}
            boardStrokes={boardStrokes}
            canDraw={canDraw}
            currentTurn={currentTurn}
            isHost={isHost}
            isSecretWordBannerClosed={isSecretWordBannerClosed}
            onCommitStroke={onCommitStroke}
            onSendStrokeChunk={onSendStrokeChunk}
            onStartGame={onStartGame}
            onToggleSettings={onToggleSettings}
            revealedHintCount={revealedHintCount}
            roomState={roomState}
            settingsOpen={settingsOpen}
            shouldShowPrivateStartButton={shouldShowPrivateStartButton}
            isStartReady={canStartGame}
            shouldShowSecretWordBanner={shouldShowSecretWordBanner}
            size={size}
            tool={tool}
            viewerRole={viewerRole}
          />

          <LobbySettingsOverlay
            isHost={isHost}
            isPrivateRoom={isPrivateRoom}
            onApplyEndMode={onApplyEndMode}
            onApplyCustomWordMode={onApplyCustomWordMode}
            onApplyCustomWordsRaw={onApplyCustomWordsRaw}
            onApplySetting={onApplySetting}
            onCloseSettings={onCloseSettings}
            onStartGame={onStartGame}
            roomState={roomState}
            settings={settings}
            settingsOpen={settingsOpen}
          />

          <TurnOverlay
            activeStageOverlay={activeStageOverlay}
            currentRound={currentRound}
            currentTurn={currentTurn}
            drawerName={drawerName}
            earnedScores={earnedScores}
            gameStartCountdownSec={gameStartCountdownSec}
            nextTurnCountdownSec={nextTurnCountdownSec}
            nextDrawerName={nextDrawerName}
            onRequestWordChoice={onRequestWordChoice}
            onStageOverlayTransitionEnd={onStageOverlayTransitionEnd}
            previewMode={previewMode}
            returnToLobbyCountdownSec={returnToLobbyCountdownSec}
            ranking={ranking}
            roomState={roomState}
            roundStartCountdownSec={roundStartCountdownSec}
            stageOverlayOpen={stageOverlayOpen}
            turnStartCountdownSec={turnStartCountdownSec}
            turnEndOverlaySnapshot={turnEndOverlaySnapshot}
            viewerRole={viewerRole}
            wordChoiceCountdownSec={wordChoiceCountdownSec}
          />
        </div>

        <BoardToolbar
          activePaletteColor={activePaletteColor}
          canDraw={canDraw}
          canUseFullPalette={canUseFullPalette}
          forcedPaletteColor={forcedPaletteColor}
          isSharedDrawingPhase={isSharedDrawingPhase}
          onClearCanvas={onClearCanvas}
          onSetColor={onSetColor}
          onSetSize={onSetSize}
          onSetTool={onSetTool}
          size={size}
          tool={tool}
        />
      </div>
    </section>
  )
}
