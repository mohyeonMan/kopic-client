/**
 * roomSnapshotNormalizer
 *
 * 책임:
 * - server room/game snapshot payload를 game entity shape로 변환
 * - legacy/alternate key를 API boundary에서 흡수해 UI와 store를 보호
 *
 * 주의:
 * - raw response를 UI에 직접 전달하지 않음
 * - 모든 server compatibility는 여기 또는 game-session API layer에서 처리
 * - feature/page 상태를 직접 변경하지 않음
 *
 * 의존:
 * - game entity defaults/types
 *
 * 사용 위치:
 * - gameSessionApi
 */
import { defaultGameSettings, emptyRoomSnapshot } from '@/entities/game/model/gameDefaults'
import { normalizeCanvasStroke } from '@/entities/game/api/canvasStrokeProtocol'
import { normalizeChatMessage } from '@/entities/game/api/chatMessageNormalizer'
import type {
  CanvasStroke,
  GameSettings,
  NormalizedRoomSnapshotResult,
  Participant,
  RoomSnapshot,
  RoomState,
  RoomType,
  RoundSummary,
  TurnPhase,
  TurnSummary,
} from '@/entities/game/model/gameTypes'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeRoomType(value: unknown, fallback: RoomType): RoomType {
  if (value === 'PRIVATE' || value === 'private' || value === 1) {
    return 'PRIVATE'
  }

  if (value === 'RANDOM' || value === 'random' || value === 0) {
    return 'RANDOM'
  }

  return fallback
}

function normalizeRoomState(value: unknown, game: Record<string, unknown> | null): RoomState {
  if (value === 'LOBBY' || value === 'RUNNING' || value === 'RESULT') {
    return value
  }

  const gamePhase = game ? readNonEmptyString(game.gamePhase) : undefined
  if (gamePhase === 'PLAYING') {
    return 'RUNNING'
  }

  if (gamePhase === 'GAME_RESULT') {
    return 'RESULT'
  }

  return 'LOBBY'
}

function normalizeColorIndex(value: unknown) {
  const colorIndex = readFiniteNumber(value)
  if (colorIndex === undefined) {
    return undefined
  }

  const rounded = Math.round(colorIndex)
  return rounded >= 1 && rounded <= 20 ? rounded : undefined
}

function normalizeSettings(raw: unknown, fallback: GameSettings): GameSettings {
  const readInt = (value: unknown, current: number, min = 1) => {
    const next =
      readFiniteNumber(value) ??
      (typeof value === 'string' && value.trim().length > 0 ? Number(value) : undefined)
    if (next === undefined || !Number.isFinite(next)) {
      return current
    }

    return Math.max(min, Math.round(next))
  }

  const readDrawerOrderMode = (value: unknown) => {
    if (value === 'RANDOM' || value === 1) {
      return 'RANDOM'
    }

    return 'JOIN_ORDER'
  }

  const readEndMode = (value: unknown) => {
    if (value === 'FIRST_CORRECT' || value === 0) {
      return 'FIRST_CORRECT'
    }

    return 'TIME_OR_ALL_CORRECT'
  }

  const readCustomWordMode = (value: unknown) => {
    if (value === 'CUSTOM_ONLY' || value === 0) {
      return 'CUSTOM_ONLY'
    }

    return 'BASE_PLUS_CUSTOM'
  }

  if (Array.isArray(raw)) {
    return {
      roundCount: readInt(raw[0], fallback.roundCount),
      drawSec: readInt(raw[1], fallback.drawSec),
      wordChoiceSec: readInt(raw[2], fallback.wordChoiceSec),
      wordChoiceCount: readInt(raw[3], fallback.wordChoiceCount),
      hintRevealSec: readInt(raw[4], fallback.hintRevealSec),
      hintLetterCount: readInt(raw[5], fallback.hintLetterCount),
      drawerOrderMode: readDrawerOrderMode(raw[6]),
      endMode: readEndMode(raw[7]),
      customWordMode: readCustomWordMode(raw[8]),
      customWordsRaw: typeof raw[9] === 'string' ? raw[9] : fallback.customWordsRaw,
    }
  }

  if (!isRecord(raw)) {
    return fallback
  }

  return {
    roundCount: readInt(raw.roundCount, fallback.roundCount),
    drawSec: readInt(raw.drawSec, fallback.drawSec),
    wordChoiceSec: readInt(raw.wordChoiceSec, fallback.wordChoiceSec),
    wordChoiceCount: readInt(raw.wordChoiceCount, fallback.wordChoiceCount),
    hintRevealSec: readInt(raw.hintRevealSec, fallback.hintRevealSec),
    hintLetterCount: readInt(raw.hintLetterCount, fallback.hintLetterCount),
    drawerOrderMode: readDrawerOrderMode(raw.drawerOrderMode),
    endMode: readEndMode(raw.endMode),
    customWordMode: readCustomWordMode(raw.customWordMode),
    customWordsRaw:
      typeof raw.customWordsRaw === 'string' ? raw.customWordsRaw : fallback.customWordsRaw,
  }
}

function readRawSettings(payload: Record<string, unknown>) {
  if (Object.prototype.hasOwnProperty.call(payload, 'settings')) {
    return payload.settings
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'setting')) {
    return payload.setting
  }

  if (Object.prototype.hasOwnProperty.call(payload, 's')) {
    return payload.s
  }

  return undefined
}

function normalizeParticipants(
  raw: unknown,
  hostSessionId: string,
  roomState: RoomState,
): Participant[] {
  const rawParticipants = Array.isArray(raw)
    ? raw
    : isRecord(raw)
      ? Object.entries(raw).map(([sessionId, participant]) =>
          isRecord(participant)
            ? { ...participant, sessionId: readNonEmptyString(participant.sessionId) ?? sessionId }
            : { sessionId },
        )
      : []

  const knownSessionIds = new Set<string>()
  const participants: Participant[] = []

  for (let index = 0; index < rawParticipants.length; index += 1) {
    const participant = rawParticipants[index]
    if (!isRecord(participant)) {
      continue
    }

    const sessionId =
      readNonEmptyString(participant.sessionId) ??
      readNonEmptyString(participant.sid) ??
      readNonEmptyString(participant.userId)
    if (!sessionId || knownSessionIds.has(sessionId)) {
      continue
    }

    knownSessionIds.add(sessionId)
    participants.push({
      sessionId,
      nickname:
        readNonEmptyString(participant.nickname) ??
        readNonEmptyString(participant.n) ??
        `Guest${index + 1}`,
      colorIndex:
        normalizeColorIndex(participant.colorIndex) ??
        normalizeColorIndex(participant.ci) ??
        normalizeColorIndex(participant.color) ??
        normalizeColorIndex(participant.c),
      isHost: sessionId === hostSessionId,
      score: readFiniteNumber(participant.score) ?? 0,
      isOnline:
        typeof participant.isOnline === 'boolean' ? participant.isOnline : true,
      joinOrder: readFiniteNumber(participant.joinOrder) ?? index + 1,
      joinedMidRound:
        typeof participant.joinedMidRound === 'boolean'
          ? participant.joinedMidRound
          : roomState === 'RUNNING',
    })
  }

  return participants.sort((left, right) => {
    if (left.joinOrder !== right.joinOrder) {
      return left.joinOrder - right.joinOrder
    }

    return left.sessionId.localeCompare(right.sessionId)
  })
}

function normalizeCanvasStrokes(raw: unknown): CanvasStroke[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map(normalizeCanvasStroke)
    .filter((stroke): stroke is CanvasStroke => stroke !== null)
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function normalizePointsMap(value: unknown) {
  if (!isRecord(value)) {
    return {}
  }

  const points: Record<string, number> = {}
  for (const [sessionId, rawPoint] of Object.entries(value)) {
    const point = readFiniteNumber(rawPoint)
    if (sessionId.trim().length > 0 && point !== undefined) {
      points[sessionId] = point
    }
  }

  return points
}

function normalizeTurnPhase(value: unknown): TurnPhase | null {
  if (value === 'READY' || value === 'WORD_CHOICE' || value === 'DRAWING' || value === 'TURN_END') {
    return value
  }

  if (value === 'CHOOSING') {
    return 'WORD_CHOICE'
  }

  if (value === 'ENDED') {
    return 'TURN_END'
  }

  return null
}

function normalizeRoundSummary(
  raw: unknown,
  participants: Participant[],
  settings: GameSettings,
): RoundSummary | null {
  if (!isRecord(raw)) {
    return null
  }

  const roundNo = readFiniteNumber(raw.roundNo) ?? readFiniteNumber(raw.round) ?? 1
  const drawerOrder =
    normalizeStringArray(raw.drawerSids).length > 0
      ? normalizeStringArray(raw.drawerSids)
      : normalizeStringArray(raw.drawerOrder)
  const fallbackOrder = participants
    .filter((participant) => !participant.joinedMidRound)
    .map((participant) => participant.sessionId)
  const resolvedDrawerOrder = drawerOrder.length > 0 ? drawerOrder : fallbackOrder
  const drawerSessionId =
    readNonEmptyString(raw.drawerSid) ?? readNonEmptyString(raw.drawerSessionId)
  const drawerCursor =
    drawerSessionId && resolvedDrawerOrder.length > 0
      ? resolvedDrawerOrder.findIndex((sessionId) => sessionId === drawerSessionId)
      : -1

  return {
    roundNo,
    totalRounds: readFiniteNumber(raw.totalRounds) ?? settings.roundCount,
    turnCursor: readFiniteNumber(raw.turnCursor) ?? (drawerCursor >= 0 ? drawerCursor : 0),
    drawerOrder: resolvedDrawerOrder,
  }
}

function normalizeTurnSummary(
  raw: unknown,
  currentRound: RoundSummary | null,
  settings: GameSettings,
  fallback: TurnSummary | null,
): TurnSummary | null {
  if (!isRecord(raw)) {
    return null
  }

  const drawerSessionId =
    readNonEmptyString(raw.drawerSessionId) ??
    readNonEmptyString(raw.drawerUserId) ??
    readNonEmptyString(raw.drawerSid) ??
    readNonEmptyString(raw.sid)
  if (!drawerSessionId) {
    return null
  }

  const phase =
    normalizeTurnPhase(raw.phase) ??
    normalizeTurnPhase(raw.turnPhase) ??
    fallback?.phase ??
    'WORD_CHOICE'
  const selectedWord =
    raw.selectedWord === null || raw.answer === null
      ? null
      : readNonEmptyString(raw.selectedWord) ?? readNonEmptyString(raw.answer) ?? fallback?.selectedWord ?? null
  const roundNo =
    readFiniteNumber(raw.roundNo) ?? readFiniteNumber(raw.round) ?? currentRound?.roundNo ?? 1
  const turnNo =
    readFiniteNumber(raw.turnNo) ??
    (currentRound ? currentRound.turnCursor + 1 : undefined) ??
    fallback?.turnNo ??
    1
  const wordChoices =
    normalizeStringArray(raw.wordChoices).length > 0
      ? normalizeStringArray(raw.wordChoices)
      : normalizeStringArray(raw.words)
  const earnedPoints = normalizePointsMap(raw.earnedPoints)
  const correctSessionIdsSource =
    normalizeStringArray(raw.correctSessionIds).length > 0
      ? normalizeStringArray(raw.correctSessionIds)
      : Object.keys(earnedPoints).filter((sessionId) => sessionId !== drawerSessionId)

  return {
    roundNo,
    turnNo,
    turnId:
      readNonEmptyString(raw.turnId) ??
      readNonEmptyString(raw.turn) ??
      fallback?.turnId ??
      `turn-r${roundNo}-${turnNo}`,
    drawerSessionId,
    phase,
    remainingSec:
      readFiniteNumber(raw.remainingSec) ??
      readFiniteNumber(raw.drawSec) ??
      readFiniteNumber(raw.wordChoiceSec) ??
      (phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0),
    deadlineAtMs: readFiniteNumber(raw.deadlineAtMs) ?? fallback?.deadlineAtMs,
    correctSessionIds: correctSessionIdsSource,
    earnedPoints,
    wordChoices: wordChoices.length > 0 ? wordChoices : fallback?.wordChoices ?? [],
    selectedWord,
    selectedWordDescription:
      raw.selectedWordDescription === null || raw.answerDescription === null
        ? null
        : typeof raw.selectedWordDescription === 'string'
          ? raw.selectedWordDescription
          : typeof raw.answerDescription === 'string'
            ? raw.answerDescription
            : fallback?.selectedWordDescription,
    answerLength:
      readFiniteNumber(raw.answerLength) ??
      (selectedWord ? Array.from(selectedWord).length : fallback?.answerLength),
    hintPattern:
      raw.hintPattern === null
        ? null
        : typeof raw.hintPattern === 'string'
          ? raw.hintPattern
          : fallback?.hintPattern,
    canvasStrokes: normalizeCanvasStrokes(raw.canvasStrokes ?? raw.currentCanvas),
  }
}

function resolveOwnSessionId(payload: Record<string, unknown>, participants: Participant[]) {
  const explicitSessionId =
    readNonEmptyString(payload.mySessionId) ??
    readNonEmptyString(payload.mySid) ??
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.sessionId)

  if (explicitSessionId) {
    return explicitSessionId
  }

  return participants[0]?.sessionId ?? ''
}

export function normalizeRoomSnapshotPayload(
  payload: unknown,
  fallback: RoomSnapshot = emptyRoomSnapshot,
): NormalizedRoomSnapshotResult | null {
  if (!isRecord(payload)) {
    return null
  }

  const rawRoom = isRecord(payload.room) ? payload.room : null
  const game = isRecord(payload.game) ? payload.game : null
  const hostSessionId =
    readNonEmptyString(payload.hostSessionId) ??
    readNonEmptyString(payload.hostUserId) ??
    (rawRoom ? readNonEmptyString(rawRoom.hostSessionId) : undefined) ??
    (rawRoom ? readNonEmptyString(rawRoom.hostUserId) : undefined) ??
    fallback.hostSessionId
  const roomState = normalizeRoomState(payload.roomState, game)
  const participants = normalizeParticipants(payload.participants, hostSessionId, roomState)
  const settings = normalizeSettings(readRawSettings(payload), fallback.settings ?? defaultGameSettings)
  const currentCanvas = Object.prototype.hasOwnProperty.call(payload, 'currentCanvas')
    ? normalizeCanvasStrokes(payload.currentCanvas)
    : []
  const lobbyCanvasStrokes = Array.isArray(payload.lobbyCanvasStrokes)
    ? normalizeCanvasStrokes(payload.lobbyCanvasStrokes)
    : currentCanvas.length > 0
      ? currentCanvas
      : fallback.lobbyCanvasStrokes
  const currentRound = normalizeRoundSummary(
    payload.currentRound ?? (game ? game.currentRound : undefined) ?? game,
    participants,
    settings,
  )
  const currentTurn = normalizeTurnSummary(
    payload.currentTurn ?? (game ? game.currentTurn : undefined) ?? game,
    currentRound,
    settings,
    fallback.currentTurn,
  )
  const roomSnapshot: RoomSnapshot = {
    roomId:
      readNonEmptyString(payload.roomId) ??
      (rawRoom ? readNonEmptyString(rawRoom.roomId) : undefined) ??
      fallback.roomId,
    roomCode:
      readNonEmptyString(payload.roomCode) ??
      (rawRoom ? readNonEmptyString(rawRoom.roomCode) : undefined) ??
      fallback.roomCode,
    roomType: normalizeRoomType(
      payload.roomType ?? (rawRoom ? rawRoom.roomType : undefined),
      fallback.roomType,
    ),
    hostSessionId,
    roomState,
    gameId:
      roomState === 'LOBBY'
        ? null
        : readNonEmptyString(payload.gameId) ??
          (game ? readNonEmptyString(game.gid) : undefined) ??
          fallback.gameId,
    participants,
    settings,
    lobbyCanvasStrokes: roomState === 'RUNNING' ? [] : lobbyCanvasStrokes,
    currentRound: roomState === 'RUNNING' ? currentRound : null,
    currentTurn:
      roomState === 'RUNNING' && currentTurn
        ? {
            ...currentTurn,
            canvasStrokes:
              currentTurn.canvasStrokes.length > 0 ? currentTurn.canvasStrokes : currentCanvas,
          }
        : null,
    chat: Array.isArray(payload.chat)
      ? payload.chat
          .map((item) =>
            normalizeChatMessage({
              currentTurn:
                roomState === 'RUNNING' && currentTurn
                  ? {
                      ...currentTurn,
                      canvasStrokes:
                        currentTurn.canvasStrokes.length > 0 ? currentTurn.canvasStrokes : currentCanvas,
                    }
                  : null,
              ownSessionId: resolveOwnSessionId(payload, participants),
              participants,
              payload: item,
            }),
          )
          .filter((message) => message !== null)
      : fallback.chat,
  }

  return {
    ownSessionId: resolveOwnSessionId(payload, participants),
    roomSnapshot,
  }
}

export function normalizeSnapshotEnvelopePayload(
  payload: unknown,
  fallback: RoomSnapshot = emptyRoomSnapshot,
): NormalizedRoomSnapshotResult | null {
  if (!isRecord(payload)) {
    return null
  }

  const explicitSessionId =
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.sessionId) ??
    readNonEmptyString(payload.mySid) ??
    readNonEmptyString(payload.mySessionId)
  const explicitRoomCode = readNonEmptyString(payload.roomCode)
  const explicitHostSessionId =
    readNonEmptyString(payload.hostSessionId) ?? readNonEmptyString(payload.hostUserId)
  const snapshotPayload = isRecord(payload.snap) ? payload.snap : payload
  const normalizedSnapshotPayload = {
    ...snapshotPayload,
    ...(explicitRoomCode && readNonEmptyString(snapshotPayload.roomCode) === undefined
      ? { roomCode: explicitRoomCode }
      : {}),
    ...(explicitHostSessionId && readNonEmptyString(snapshotPayload.hostSessionId) === undefined
      ? { hostSessionId: explicitHostSessionId }
      : {}),
  }
  const normalized = normalizeRoomSnapshotPayload(normalizedSnapshotPayload, fallback)

  if (!normalized) {
    return null
  }

  return {
    ownSessionId: explicitSessionId ?? normalized.ownSessionId,
    roomSnapshot: normalized.roomSnapshot,
  }
}
