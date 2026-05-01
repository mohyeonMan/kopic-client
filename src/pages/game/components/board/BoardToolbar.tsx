import type { DrawingTool } from '../../../../entities/game/model'
import {
  TOOL_COLORS,
  TOOL_COLORS_GRAYSCALE,
} from '../../gamePageShared'

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
  size: number
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
  size,
  tool,
}: BoardToolbarProps) {
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
    </div>
  )
}
