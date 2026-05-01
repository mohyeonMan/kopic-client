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
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  drawerName: string
  earnedScores: EarnedScore[]
  forcedPaletteColor?: string
  isHost: boolean
  isSecretWordBannerClosed: boolean
  isSharedDrawingPhase: boolean
  nextDrawerName: string | null
  onApplyEndMode: (value: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT') => void
  onApplySetting: (key: NumericSettingKey, value: string) => void
  onClearCanvas: () => void
  onCloseSettings: () => void
  onCommitStroke: (stroke: CanvasStroke) => void
  onRequestWordChoice: (word: string) => void
  onSendStrokeChunk: (stroke: CanvasStroke) => void
  onSetColor: (color: string) => void
  onSetSize: (size: number) => void
  onSetTool: (tool: DrawingTool) => void
  onStageOverlayTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  onStartGame: () => void
  onToggleSettings: () => void
  previewMode: OverlayPreview
  ranking: Participant[]
  revealedHintCount: number
  roomState: RoomState
  settings: GameSettings
  settingsOpen: boolean
  shouldShowSecretWordBanner: boolean
  size: number
  stageOverlayOpen: boolean
  tool: DrawingTool
  turnEndOverlaySnapshot: TurnEndOverlaySnapshot | null
  viewerRole: ViewerRole
}

export function GameBoardPanel({
  activePaletteColor,
  activeStageOverlay,
  boardStrokes,
  canDraw,
  canUseFullPalette,
  centerPanelRef,
  currentRound,
  currentTurn,
  drawerName,
  earnedScores,
  forcedPaletteColor,
  isHost,
  isSecretWordBannerClosed,
  isSharedDrawingPhase,
  nextDrawerName,
  onApplyEndMode,
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
  ranking,
  revealedHintCount,
  roomState,
  settings,
  settingsOpen,
  shouldShowSecretWordBanner,
  size,
  stageOverlayOpen,
  tool,
  turnEndOverlaySnapshot,
  viewerRole,
}: GameBoardPanelProps) {
  return (
    <section ref={centerPanelRef} className="panel game-center-panel">
      <div className="board-shell">
        <div className="board-frame">
          <BoardCanvas
            activePaletteColor={activePaletteColor}
            boardStrokes={boardStrokes}
            canDraw={canDraw}
            currentTurn={currentTurn}
            isHost={isHost}
            isSecretWordBannerClosed={isSecretWordBannerClosed}
            onCommitStroke={onCommitStroke}
            onSendStrokeChunk={onSendStrokeChunk}
            onToggleSettings={onToggleSettings}
            revealedHintCount={revealedHintCount}
            roomState={roomState}
            settingsOpen={settingsOpen}
            shouldShowSecretWordBanner={shouldShowSecretWordBanner}
            size={size}
            tool={tool}
            viewerRole={viewerRole}
          />

          <LobbySettingsOverlay
            isHost={isHost}
            onApplyEndMode={onApplyEndMode}
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
            nextDrawerName={nextDrawerName}
            onRequestWordChoice={onRequestWordChoice}
            onStageOverlayTransitionEnd={onStageOverlayTransitionEnd}
            previewMode={previewMode}
            ranking={ranking}
            roomState={roomState}
            stageOverlayOpen={stageOverlayOpen}
            turnEndOverlaySnapshot={turnEndOverlaySnapshot}
            viewerRole={viewerRole}
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
