import {
  isRecord,
  readNonEmptyString,
} from '../appStateHelpers'

export type ServerErrorPayload = {
  reason: string
  message: string
  code: number
}

export function decodeServerErrorPayload(
  payload: unknown,
  eventCode: number,
): ServerErrorPayload {
  if (!isRecord(payload)) {
    return {
      reason: `ERROR_${eventCode}`,
      message: '요청을 처리할 수 없습니다.',
      code: eventCode,
    }
  }

  return {
    reason: readNonEmptyString(payload.rsn) ?? `ERROR_${eventCode}`,
    message: readNonEmptyString(payload.msg) ?? '요청을 처리할 수 없습니다.',
    code: eventCode,
  }
}

export function decodeConnectionErrorPayload(
  payload: unknown,
): { reason: string; message: string } | null {
  if (!isRecord(payload)) {
    return null
  }

  const reason = readNonEmptyString(payload.reason)
  const message = readNonEmptyString(payload.message)
  if (!reason || !message) {
    return null
  }

  return {
    reason,
    message,
  }
}
