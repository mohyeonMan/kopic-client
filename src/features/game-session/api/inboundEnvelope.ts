import type { Envelope } from './gameSessionEvents'

export function decodeInboundEnvelope(raw: unknown): Envelope<unknown, number> | null {
  if (typeof raw !== 'string') {
    return null
  }

  const tryParse = (source: string): Envelope<unknown, number> | null => {
    try {
      const parsed = JSON.parse(source) as Envelope<unknown, number>
      return typeof parsed?.e === 'number' ? parsed : null
    } catch {
      return null
    }
  }

  const trimmed = raw.trim()
  const parsed = tryParse(trimmed)
  if (parsed) {
    return parsed
  }

  const lastBraceIndex = trimmed.lastIndexOf('}')
  if (lastBraceIndex < 0) {
    return null
  }

  return tryParse(trimmed.slice(0, lastBraceIndex + 1))
}
