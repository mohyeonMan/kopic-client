import './BoardToolbar.css'
import type { DrawingTool } from '@/entities/game/model'
import {
  TOOL_COLORS,
  TOOL_COLORS_GRAYSCALE,
} from '@/features/game-board/model/gameBoardShared'

type BoardToolbarProps = {
  activePaletteColor: string
  canDraw: boolean
  canUseFullPalette: boolean
  forcedPaletteColor?: string
  isSharedDrawingPhase: boolean
  onClearCanvas: () => void
  onSetColor: (color: string) => void
  onSetSize: (size: number) => void
  onSetTool: (tool: DrawingTool) => void
  onToggleSoundEnabled: () => void
  size: number
  soundEnabled: boolean
  tool: DrawingTool
}

export function BoardToolbar({
  activePaletteColor,
  canDraw,
  canUseFullPalette,
  forcedPaletteColor,
  isSharedDrawingPhase,
  onClearCanvas,
  onSetColor,
  onSetSize,
  onSetTool,
  onToggleSoundEnabled,
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
