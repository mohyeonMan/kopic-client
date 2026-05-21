import {
  normalizeParticipantColorIndex,
  readNonEmptyString,
} from '../gameProtocol'

export type ServerRoomJoinedPayload = {
  sessionId: string
  nickname: string
  colorIndex?: number
}

export type ServerRoomLeftPayload = {
  sid: string
  nextHostSid?: string
}

export function decodeRoomJoinedPayload(payload: unknown): ServerRoomJoinedPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, n, ci } = payload as {
    sid?: unknown
    n?: unknown
    ci?: unknown
  }
  const participantSessionId =
    typeof sid === 'string' && sid.trim().length > 0
      ? sid
      : null

  if (!participantSessionId) {
    return null
  }

  const participantNickname =
    typeof n === 'string' && n.trim().length > 0
      ? n.trim()
      : null
  if (!participantNickname) {
    return null
  }

  return {
    sessionId: participantSessionId.trim(),
    nickname: participantNickname,
    colorIndex: normalizeParticipantColorIndex(ci),
  }
}

export function decodeRoomLeftPayload(payload: unknown): ServerRoomLeftPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, nh } = payload as {
    sid?: unknown
    nh?: unknown
  }
  const participantSessionId =
    typeof sid === 'string' && sid.trim().length > 0
      ? sid
      : null

  if (!participantSessionId) {
    return null
  }

  return {
    sid: participantSessionId.trim(),
    nextHostSid: readNonEmptyString(nh),
  }
}
