import type {
  GeDrawingStartedPayload,
  GeGameResultPayload,
  GeGameStartedPayload,
  GeGuessCorrectPayload,
  GeReturnToLobbyPayload,
  GeRoundStartedPayload,
  GeTurnEndedPayload,
  GeTurnStartedPayload,
  GeWordChoiceOpenedPayload,
} from '../appStateContextValue'
import {
  isRecord,
  normalizeParticipantColorIndex,
  readFiniteNumber,
  readNonEmptyString,
} from './appStateHelpers'

export type ServerRoomJoinedPayload = {
  sessionId: string
  nickname: string
  colorIndex?: number
}

export type ServerRoomLeftPayload = {
  sid: string
  nextHostSid?: string
}

export function decodeGeGameStartedPayload(payload: unknown): GeGameStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  if (!gameId) {
    return null
  }

  return { gameId }
}

export function decodeGeRoundStartedPayload(payload: unknown): GeRoundStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const roundNo = readFiniteNumber(payload.round)
  const drawerSessionIds = Array.isArray(payload.drawerSids)
    ? payload.drawerSids
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : []

  if (!gameId || roundNo === undefined || drawerSessionIds.length === 0) {
    return null
  }

  return {
    gameId,
    roundNo,
    drawerSessionIds,
  }
}

export function decodeGeTurnStartedPayload(payload: unknown): GeTurnStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const roundNo = readFiniteNumber(payload.round)
  const turnId = readNonEmptyString(payload.turn) ?? readNonEmptyString(payload.turnId)
  const drawerSessionId = readNonEmptyString(payload.drawerSid) ?? readNonEmptyString(payload.sid)
  const remainingSec = readFiniteNumber(payload.turnStartSec)

  if (
    !gameId ||
    roundNo === undefined ||
    !turnId ||
    !drawerSessionId ||
    remainingSec === undefined
  ) {
    return null
  }

  return {
    gameId,
    roundNo,
    turnId,
    drawerSessionId,
    remainingSec,
  }
}

export function decodeGeGuessCorrectPayload(payload: unknown): GeGuessCorrectPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const sessionId = readNonEmptyString(payload.sid) ?? readNonEmptyString(payload.sessionId)
  if (!gameId || !sessionId) {
    return null
  }

  return {
    gameId,
    sessionId,
  }
}

export function decodeGeWordChoiceOpenedPayload(
  payload: unknown,
): GeWordChoiceOpenedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const drawerSessionId = readNonEmptyString(payload.sid) ?? readNonEmptyString(payload.drawerSid)
  const remainingSec = readFiniteNumber(payload.wordChoiceSec)
  if (!drawerSessionId || remainingSec === undefined) {
    return null
  }

  const wordChoices = Array.isArray(payload.words)
    ? payload.words
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : []

  return {
    drawerSessionId,
    remainingSec,
    wordChoices,
  }
}

export function decodeGeDrawingStartedPayload(
  payload: unknown,
): GeDrawingStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const drawerSessionId = readNonEmptyString(payload.drawerSid) ?? readNonEmptyString(payload.sid)
  const remainingSec = readFiniteNumber(payload.drawSec)
  if (!gameId || !drawerSessionId || remainingSec === undefined) {
    return null
  }

  const selectedWord = payload.answer === null ? null : readNonEmptyString(payload.answer) ?? null
  const answerLength = readFiniteNumber(payload.answerLength)

  return {
    gameId,
    drawerSessionId,
    remainingSec,
    selectedWord,
    answerLength,
  }
}

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

export function decodeGeTurnEndedPayload(payload: unknown): GeTurnEndedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const turnId = readNonEmptyString(payload.turn) ?? readNonEmptyString(payload.turnId)
  const reason = readNonEmptyString(payload.reason)
  if (!gameId || !turnId || !reason) {
    return null
  }

  const answer = payload.answer === null ? null : readNonEmptyString(payload.answer) ?? null

  return {
    gameId,
    turnId,
    reason,
    answer,
    earnedPoints: readPointsMap(payload.earnedPoints),
  }
}

export function decodeGeGameResultPayload(payload: unknown): GeGameResultPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const resultSec = readFiniteNumber(payload.resultSec)
  if (!gameId || resultSec === undefined) {
    return null
  }

  return {
    gameId,
    resultSec,
    totalPoints: readPointsMap(payload.totalPoints),
  }
}

export function decodeGeReturnToLobbyPayload(
  payload: unknown,
): GeReturnToLobbyPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const reason = readNonEmptyString(payload.reason)
  if (!gameId || !reason) {
    return null
  }

  return {
    gameId,
    reason,
    restartSec: readFiniteNumber(payload.restartSec),
  }
}

export function isCanvasClearPayload(payload: unknown) {
  if (Array.isArray(payload) && payload.length > 0 && payload[0] === 3) {
    return true
  }

  if (!payload || typeof payload !== 'object') {
    return false
  }

  const { clear, type, op } = payload as { clear?: unknown; type?: unknown; op?: unknown }
  if (clear === true) {
    return true
  }

  return type === 'CANVAS_CLEAR' || op === 'CANVAS_CLEAR'
}

export function decodeRoomJoinedPayload(payload: unknown): ServerRoomJoinedPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, sessionId, nickname, n, colorIndex, ci, color, c } = payload as {
    sid?: unknown
    sessionId?: unknown
    nickname?: unknown
    n?: unknown
    colorIndex?: unknown
    ci?: unknown
    color?: unknown
    c?: unknown
  }
  const participantSessionId =
    typeof sid === 'string' && sid.trim().length > 0
      ? sid
      : typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId
        : null

  if (!participantSessionId) {
    return null
  }

  const participantNickname =
    typeof n === 'string' && n.trim().length > 0
      ? n.trim()
      : typeof nickname === 'string' && nickname.trim().length > 0
        ? nickname.trim()
        : null
  if (!participantNickname) {
    return null
  }

  return {
    sessionId: participantSessionId.trim(),
    nickname: participantNickname,
    colorIndex:
      normalizeParticipantColorIndex(colorIndex) ??
      normalizeParticipantColorIndex(ci) ??
      normalizeParticipantColorIndex(color) ??
      normalizeParticipantColorIndex(c),
  }
}

export function decodeRoomLeftPayload(payload: unknown): ServerRoomLeftPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, sessionId, nextHost, nextHostSid, nextHostSessionId } = payload as {
    sid?: unknown
    sessionId?: unknown
    nextHost?: unknown
    nextHostSid?: unknown
    nextHostSessionId?: unknown
  }
  const participantSessionId =
    typeof sid === 'string' && sid.trim().length > 0
      ? sid
      : typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId
        : null

  if (!participantSessionId) {
    return null
  }

  const decodedNextHostSid =
    readNonEmptyString(nextHostSid) ??
    readNonEmptyString(nextHostSessionId) ??
    (typeof nextHost === 'string'
      ? readNonEmptyString(nextHost)
      : isRecord(nextHost)
        ? readNonEmptyString(nextHost.sid) ??
          readNonEmptyString(nextHost.sessionId) ??
          readNonEmptyString(nextHost.userId)
        : undefined)

  return {
    sid: participantSessionId.trim(),
    nextHostSid: decodedNextHostSid,
  }
}

export function decodeJoinFailedPayload(payload: unknown): { reason: string; message: string } {
  if (!isRecord(payload)) {
    return {
      reason: 'JOIN_FAILED',
      message: '방 입장에 실패했습니다.',
    }
  }

  const reason = readNonEmptyString(payload.reason) ?? 'JOIN_FAILED'
  const rawMessage = readNonEmptyString(payload.message)
  if (rawMessage) {
    return {
      reason,
      message: rawMessage,
    }
  }

  if (reason === 'ROOM_NOT_FOUND') {
    return {
      reason,
      message: '입력한 방 코드를 찾을 수 없습니다.',
    }
  }

  return {
    reason,
    message: '방 입장에 실패했습니다.',
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
