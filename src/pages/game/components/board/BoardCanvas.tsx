import './BoardCanvas.css'
import type { CanvasStroke, DrawingTool, RoomState, TurnSummary } from '../../../../entities/game/model'
import { CanvasBoard } from '../../../../features/game-canvas/CanvasBoard'
import { getMaskedWord, type ViewerRole } from '../../gamePageShared'

type BoardCanvasProps = {
  activePaletteColor: string
  boardStrokes: CanvasStroke[]
  canDraw: boolean
  currentTurn: TurnSummary | null
  isHost: boolean
  isSecretWordBannerClosed: boolean
  onCommitStroke: (stroke: CanvasStroke) => void
  onSendStrokeChunk: (stroke: CanvasStroke) => void
  onToggleSettings: () => void
  revealedHintCount: number
  roomState: RoomState
  settingsOpen: boolean
  shouldShowSecretWordBanner: boolean
  size: number
  tool: DrawingTool
  viewerRole: ViewerRole
}

export function BoardCanvas({
  activePaletteColor,
  boardStrokes,
  canDraw,
  currentTurn,
  isHost,
  isSecretWordBannerClosed,
  onCommitStroke,
  onSendStrokeChunk,
  onToggleSettings,
  revealedHintCount,
  roomState,
  settingsOpen,
  shouldShowSecretWordBanner,
  size,
  tool,
  viewerRole,
}: BoardCanvasProps) {
  return (
    <>
      <div className="grid-overlay" />
      <CanvasBoard
        strokes={boardStrokes}
        canDraw={canDraw}
        tool={tool}
        color={tool === 'ERASER' ? '#ffffff' : activePaletteColor}
        size={Math.max(2, size * 2)}
        onSendStrokeChunk={onSendStrokeChunk}
        onCommitStroke={onCommitStroke}
      />

      {roomState === 'LOBBY' ? (
        <button
          type="button"
          className={
            settingsOpen
              ? 'board-settings-toggle secondary-button board-settings-toggle-hidden'
              : 'board-settings-toggle secondary-button'
          }
          onClick={onToggleSettings}
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
    </>
  )
}
