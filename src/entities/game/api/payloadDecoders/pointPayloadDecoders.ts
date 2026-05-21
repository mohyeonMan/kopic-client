import {
  isRecord,
  readFiniteNumber,
} from '../gameProtocol'

export function readPointsMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, number> = {}
  for (const [sessionId, rawPoint] of Object.entries(value)) {
    if (!sessionId || sessionId.trim().length === 0) {
      continue
    }

    const point = readFiniteNumber(rawPoint)
    if (point === undefined) {
      continue
    }

    next[sessionId] = point
  }

  return next
}
