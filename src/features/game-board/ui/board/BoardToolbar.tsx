import './BoardToolbar.css'
import type { DrawingTool } from '@/entities/game/model'
import {
  TOOL_COLORS,
  TOOL_COLORS_GRAYSCALE,
} from '@/features/game-board/model/gameBoardShared'

type BoardToolbarProps = {
  activePaletteColor: string
  canDraw: boolean
  canRedoCanvas: boolean
  canUndoCanvas: boolean
  canUseFullPalette: boolean
  forcedPaletteColor?: string
  isSharedDrawingPhase: boolean
  onClearCanvas: () => void
  onSetColor: (color: string) => void
  onSetSize: (size: number) => void
  onSetTool: (tool: DrawingTool) => void
  onToggleSoundEnabled: () => void
  onRedoCanvas: () => void
  onUndoCanvas: () => void
  size: number
  soundEnabled: boolean
  tool: DrawingTool
}

export function BoardToolbar({
  activePaletteColor,
  canDraw,
  canRedoCanvas,
  canUndoCanvas,
  canUseFullPalette,
  forcedPaletteColor,
  isSharedDrawingPhase,
  onClearCanvas,
  onSetColor,
  onSetSize,
  onSetTool,
  onToggleSoundEnabled,
  onRedoCanvas,
  onUndoCanvas,
  size,
  soundEnabled,
  tool,
}: BoardToolbarProps) {
  const soundToggleLabel = soundEnabled ? '효과음 켬' : '효과음 끔'

  return (
    <div className="tool-row">
      <div className="tool-main-actions">
        <button
          type="button"
          className={tool === 'PEN' ? 'primary-button' : 'secondary-button'}
          onClick={() => onSetTool('PEN')}
          disabled={!canDraw}
        >
          펜
        </button>
        <button
          type="button"
          className={tool === 'ERASER' ? 'primary-button' : 'secondary-button'}
          onClick={() => onSetTool('ERASER')}
          disabled={!canDraw}
        >
          지우개
        </button>
        <button
          type="button"
          className={tool === 'FILL' ? 'primary-button' : 'secondary-button'}
          onClick={() => onSetTool('FILL')}
          disabled={!canDraw}
        >
          채우기
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onClearCanvas}
          disabled={!canDraw}
        >
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
          onChange={(event) => onSetSize(Number(event.target.value))}
          disabled={!canDraw}
        />
      </label>
      <div className="tool-bottom-row">
        <div className="color-palette">
          {TOOL_COLORS.map((swatch, swatchIndex) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Select ${swatch}`}
              className={swatch === activePaletteColor ? 'color-swatch color-swatch-active' : 'color-swatch'}
              style={
                canUseFullPalette
                  ? { background: swatch }
                  : isSharedDrawingPhase && swatch === forcedPaletteColor
                    ? { background: swatch }
                    : { background: TOOL_COLORS_GRAYSCALE[swatchIndex] }
              }
              onClick={() => onSetColor(swatch)}
              disabled={!canUseFullPalette}
            />
          ))}
        </div>
        <div className="tool-history-actions">
          <button
            type="button"
            aria-label="되돌리기"
            className="history-button"
            title="되돌리기"
            onClick={onUndoCanvas}
            disabled={!canUndoCanvas}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 7 4 12l5 5v-3h5.5a4.5 4.5 0 0 0 0-9H11v2h3.5a2.5 2.5 0 0 1 0 5H9V7Z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="다시 실행"
            className="history-button"
            title="다시 실행"
            onClick={onRedoCanvas}
            disabled={!canRedoCanvas}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 7 5 5-5 5v-3H9.5a4.5 4.5 0 0 1 0-9H13v2H9.5a2.5 2.5 0 0 0 0 5H15V7Z" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          aria-label={soundToggleLabel}
          aria-checked={soundEnabled}
          className={
            soundEnabled
              ? 'sound-toggle-button sound-toggle-button-on'
              : 'sound-toggle-button sound-toggle-button-off'
          }
          role="switch"
          title={soundToggleLabel}
          onClick={onToggleSoundEnabled}
        >
          <span className="sound-toggle-text">효과음</span>
          <span className="sound-toggle-switch" aria-hidden="true">
            <span className="sound-toggle-knob" />
          </span>
        </button>
      </div>
    </div>
  )
}
