import type {
  CanvasStroke,
  DrawingTool,
} from '../../../../entities/game/model'
import { createUUID } from '../../../../shared/lib/createUUID'
import {
  decodeCompactStroke,
  isRecord,
  readFiniteNumber,
  readNonEmptyString,
} from '../appStateHelpers'

function normalizeCanvasStroke(raw: unknown): CanvasStroke | null {
  if (!isRecord(raw)) {
    return null
  }

  const tool: DrawingTool =
    raw.tool === 'PEN' || raw.tool === 'ERASER' || raw.tool === 'FILL'
      ? raw.tool
      : 'PEN'
  const size = readFiniteNumber(raw.size) ?? 5
  const points = Array.isArray(raw.points)
    ? raw.points
        .filter((point): point is Record<string, unknown> => isRecord(point))
        .map((point) => {
          const x = readFiniteNumber(point.x)
          const y = readFiniteNumber(point.y)
          if (x === undefined || y === undefined) {
            return null
          }

          return { x, y }
        })
        .filter((point): point is { x: number; y: number } => point !== null)
    : []

  return {
    id: readNonEmptyString(raw.id) ?? createUUID(),
    tool,
    color: readNonEmptyString(raw.color) ?? '#203247',
    size,
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
