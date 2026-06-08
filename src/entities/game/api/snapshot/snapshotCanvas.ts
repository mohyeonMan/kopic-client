import {
  DEFAULT_CANVAS_COLOR,
  type CanvasStroke,
  type DrawingTool,
} from '@/entities/game/model'
import { createUUID } from '@/shared/lib/createUUID'
import {
  decodeCompactStroke,
  isRecord,
  readFiniteNumber,
  readNonEmptyString,
} from '../gameProtocol'

function normalizeCanvasStroke(raw: unknown): CanvasStroke | null {
  if (!isRecord(raw)) {
    return null
  }

  const tool: DrawingTool =
    raw.tool === 'PEN' || raw.tool === 'ERASER' || raw.tool === 'FILL'
      ? raw.tool
      : 'PEN'
  const points = Array.isArray(raw.points)
    ? raw.points
        .filter((point): point is Record<string, unknown> => isRecord(point))
        .map((point) => {
          const x = readFiniteNumber(point.x)
          const y = readFiniteNumber(point.y)
          const size = readFiniteNumber(point.size)
          if (x === undefined || y === undefined || size === undefined || size <= 0) {
            return null
          }

          return { x, y, size }
        })
        .filter((point): point is { x: number; y: number; size: number } => point !== null)
    : []

  return {
    id: readNonEmptyString(raw.id) ?? createUUID(),
    ...(readNonEmptyString(raw.cid) ? { cid: readNonEmptyString(raw.cid) } : {}),
    tool,
    color: readNonEmptyString(raw.color) ?? DEFAULT_CANVAS_COLOR,
    points,
  }
}

export function normalizeSnapshotCanvasStrokes(raw: unknown): CanvasStroke[] | null {
  if (!Array.isArray(raw)) {
    return null
  }

  const strokes: CanvasStroke[] = []
  for (const item of raw) {
    const compactStroke = decodeCompactStroke(item)
    if (compactStroke) {
      strokes.push(compactStroke)
      continue
    }

    const fullStroke = normalizeCanvasStroke(item)
    if (fullStroke) {
      strokes.push(fullStroke)
    }
  }

  return strokes
}
