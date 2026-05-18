import type {
  AppState,
  CanvasStroke,
  ChatMessage,
  DrawingTool,
  GameSettings,
  Participant,
  RoomSnapshot,
  RoomState,
  RoundSummary,
  TurnPhase,
  TurnSummary,
} from '../../../entities/game/model'
import { createUUID } from '../../utils/createUUID'
import {
  decodeCompactStroke,
  isRecord,
  normalizeParticipantColorIndex,
  readFiniteNumber,
  readNonEmptyString,
} from './appStateHelpers'
import { readPointsMap } from './appStatePayloadDecoders'

export type NormalizedRoomSnapshotResult = {
  roomSnapshot: RoomSnapshot
  ownSessionId: string
}

export function sortParticipantsByJoinOrder(participants: Participant[]): Participant[] {
  return participants
    .slice()
    .sort((left, right) => {
      if (left.joinOrder !== right.joinOrder) {
        return left.joinOrder - right.joinOrder
      }

      return left.sessionId.localeCompare(right.sessionId)
    })
}

function isRoomState(value: unknown): value is RoomState {
  return value === 'LOBBY' || value === 'RUNNING' || value === 'RESULT'
}

function normalizeSnapshotRoomType(
  value: unknown,
  fallback: RoomSnapshot['roomType'],
): RoomSnapshot['roomType'] {
  if (value === 'PRIVATE' || value === 'private' || value === 1) {
    return 'PRIVATE'
  }

  if (value === 'RANDOM' || value === 'random' || value === 0) {
    return 'RANDOM'
  }

  return fallback
}

function readSnapshotRoomTypeValue(payload: Record<string, unknown>): unknown {
  return payload.rt
}

function isTurnPhase(value: unknown): value is TurnPhase {
  return value === 'READY' || value === 'WORD_CHOICE' || value === 'DRAWING' || value === 'TURN_END'
}

function normalizeSnapshotRoomState(
  rawRoomState: unknown,
  snapshotGame: Record<string, unknown> | null,
): RoomState {
  if (isRoomState(rawRoomState)) {
    return rawRoomState
  }

  const gamePhase = snapshotGame ? readNonEmptyString(snapshotGame.gp) : undefined
  if (gamePhase === 'PLAYING') {
    return 'RUNNING'
  }

  if (gamePhase === 'GAME_RESULT') {
    return 'RESULT'
  }

  return 'LOBBY'
}

function normalizeSnapshotTurnPhase(value: unknown): TurnPhase | null {
  if (isTurnPhase(value)) {
    return value
  }

  if (value === 'STARTING') {
    return 'READY'
  }

  if (value === 'TURN_RESULT') {
    return 'TURN_END'
  }

  return null
}

function normalizeGameSettings(raw: unknown, fallback: GameSettings): GameSettings {
  const readInt = (value: unknown, current: number, min = 1) => {
    const next =
      readFiniteNumber(value) ??
      (typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : undefined)
    if (next === undefined) {
      return current
    }

    return Math.max(min, Math.round(next))
  }

  const readDrawerOrderMode = (
    value: unknown,
    current: GameSettings['drawerOrderMode'],
  ): GameSettings['drawerOrderMode'] => {
    if (value === 'JOIN_ORDER' || value === 0) {
      return 'JOIN_ORDER'
    }

    if (value === 'RANDOM' || value === 1) {
      return 'RANDOM'
    }

    return current
  }

  const readEndMode = (
    value: unknown,
    current: GameSettings['endMode'],
  ): GameSettings['endMode'] => {
    if (value === 'FIRST_CORRECT' || value === 0) {
      return 'FIRST_CORRECT'
    }

    if (value === 'TIME_OR_ALL_CORRECT' || value === 1) {
      return 'TIME_OR_ALL_CORRECT'
    }

    return current
  }

  const readCustomWordMode = (
    value: unknown,
    current: GameSettings['customWordMode'],
  ): GameSettings['customWordMode'] => {
    if (value === 'CUSTOM_ONLY' || value === 0) {
      return 'CUSTOM_ONLY'
    }

    if (value === 'BASE_PLUS_CUSTOM' || value === 1) {
      return 'BASE_PLUS_CUSTOM'
    }

    return current
  }

  const readCustomWordsRaw = (value: unknown, current: string): string => {
    if (typeof value === 'string') {
      return value
    }

    if (value === null) {
      return ''
    }

    return current
  }

  if (Array.isArray(raw)) {
    return {
      roundCount: readInt(raw[0], fallback.roundCount),
      drawSec: readInt(raw[1], fallback.drawSec),
      wordChoiceSec: readInt(raw[2], fallback.wordChoiceSec),
      wordChoiceCount: readInt(raw[3], fallback.wordChoiceCount),
      hintRevealSec: readInt(raw[4], fallback.hintRevealSec),
      hintLetterCount: readInt(raw[5], fallback.hintLetterCount),
      drawerOrderMode: readDrawerOrderMode(raw[6], fallback.drawerOrderMode),
      endMode: readEndMode(raw[7], fallback.endMode),
      customWordMode: readCustomWordMode(raw[8], fallback.customWordMode),
      customWordsRaw: readCustomWordsRaw(raw[9], fallback.customWordsRaw),
    }
  }

  return fallback
}

function readRawSettingsPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return undefined
  }

  return payload.st
}

export function decodeSettingsUpdatePayload(
  payload: unknown,
  fallback: GameSettings,
): GameSettings | null {
  const rawSettings = readRawSettingsPayload(payload) ?? payload

  if (Array.isArray(rawSettings)) {
    return normalizeGameSettings(rawSettings, fallback)
  }

  return null
}

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

function normalizeSnapshotCanvasStrokes(raw: unknown): CanvasStroke[] | null {
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

function normalizeParticipants(
  raw: unknown,
  hostSessionId: string,
  roomState: RoomState,
): Participant[] {
  const rawParticipants: Record<string, unknown>[] = isRecord(raw)
    ? Object.entries(raw).map(([sessionId, participant]) =>
        isRecord(participant) ? { ...participant, sid: sessionId } : { sid: sessionId },
      )
    : []

  const nextParticipants: Participant[] = []
  const knownSessionIds = new Set<string>()

  for (let index = 0; index < rawParticipants.length; index += 1) {
    const participant = rawParticipants[index]
    if (!isRecord(participant)) {
      continue
    }

    const sessionId = readNonEmptyString(participant.sid)
    if (!sessionId || knownSessionIds.has(sessionId)) {
      continue
    }

    knownSessionIds.add(sessionId)

    nextParticipants.push({
      sessionId,
      nickname: readNonEmptyString(participant.n) ?? `Guest${index + 1}`,
      colorIndex:
        normalizeParticipantColorIndex(participant.ci),
      isHost: sessionId === hostSessionId,
      score: 0,
      isOnline: true,
      joinOrder: index + 1,
      joinedMidRound: roomState === 'RUNNING',
    })
  }

  return sortParticipantsByJoinOrder(nextParticipants)
}

function normalizeCurrentRound(
  raw: unknown,
  settings: GameSettings,
): RoundSummary | null {
  if (raw === null) {
    return null
  }

  if (!isRecord(raw)) {
    return null
  }

  const roundNo = readFiniteNumber(raw.r) ?? 1
  const parsedDrawerOrder = Array.isArray(raw.dss)
    ? raw.dss
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : []
  const drawerSessionId = readNonEmptyString(raw.ds)
  const turnCursorFromDrawer =
    drawerSessionId && parsedDrawerOrder.length > 0
      ? parsedDrawerOrder.findIndex((sessionId) => sessionId === drawerSessionId)
      : -1

  return {
    roundNo,
    totalRounds: settings.roundCount,
    turnCursor: turnCursorFromDrawer >= 0 ? turnCursorFromDrawer : 0,
    drawerOrder: parsedDrawerOrder,
  }
}

function normalizeCurrentTurn(
  raw: unknown,
  settings: GameSettings,
  participants: Participant[],
  currentRound?: RoundSummary | null,
): TurnSummary | null {
  if (raw === null) {
    return null
  }

  if (!isRecord(raw)) {
    return null
  }

  const fallbackDrawerSessionId =
    sortParticipantsByJoinOrder(participants)[0]?.sessionId ??
    'unknown'
  const drawerSessionId = readNonEmptyString(raw.ds) ?? fallbackDrawerSessionId
  const phase =
    normalizeSnapshotTurnPhase(raw.tp) ??
    'WORD_CHOICE'
  const correctSessionIdsSource = Array.isArray(raw.ca) ? raw.ca : []
  const earnedPoints = readPointsMap(raw.ep)
  const wordChoices: string[] = []
  const canvasStrokes: CanvasStroke[] = []
  const selectedWord =
    raw.ans === null
      ? null
      : readNonEmptyString(raw.ans) ?? null
  const selectedWordDescription = undefined
  const roundNo =
    readFiniteNumber(raw.r) ??
    currentRound?.roundNo ??
    1
  const turnNo =
    (currentRound ? currentRound.turnCursor + 1 : undefined) ??
    1
  const correctSessionIds = (
    correctSessionIdsSource.length > 0
      ? correctSessionIdsSource
      : phase === 'TURN_END'
        ? Object.keys(earnedPoints).filter((sessionId) => sessionId !== drawerSessionId)
        : []
  )
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  const answerLength =
    readFiniteNumber(raw.al) ??
    (selectedWord !== null ? Array.from(selectedWord).length : undefined)
  const hintPattern =
    raw.hp === null
      ? null
      : typeof raw.hp === 'string'
        ? raw.hp
        : undefined

  return {
    roundNo,
    turnNo,
    turnId: readNonEmptyString(raw.tid) ?? `turn-r${roundNo}-${turnNo}`,
    drawerSessionId,
    phase,
    remainingSec:
      readFiniteNumber(raw.remainingSec) ??
      (phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0),
    deadlineAtMs: undefined,
    correctSessionIds,
    earnedPoints,
    wordChoices,
    selectedWord,
    selectedWordDescription,
    answerLength,
    hintPattern,
    canvasStrokes,
  }
}

function isPrivilegedViewerForTurn(currentTurn: TurnSummary | null, ownSessionId: string) {
  if (!currentTurn) {
    return false
  }

  return (
    currentTurn.drawerSessionId === ownSessionId ||
    currentTurn.correctSessionIds.includes(ownSessionId)
  )
}

function isPrivilegedSenderForTurn(currentTurn: TurnSummary | null, senderSessionId?: string) {
  if (!currentTurn || !senderSessionId) {
    return false
  }

  return (
    currentTurn.drawerSessionId === senderSessionId ||
    currentTurn.correctSessionIds.includes(senderSessionId)
  )
}

export function resolvePrivilegedChatVisibility(
  tone: ChatMessage['tone'],
  currentTurn: TurnSummary | null,
  ownSessionId: string,
  senderSessionId?: string,
) {
  if (tone === 'sealed') {
    return true
  }

  return (
    isPrivilegedViewerForTurn(currentTurn, ownSessionId) &&
    isPrivilegedSenderForTurn(currentTurn, senderSessionId)
  )
}

function resolveOwnSessionIdFromSnapshotPayload(
  payload: Record<string, unknown>,
  participants: Participant[],
  state: AppState,
): string {
  const explicitSessionId = readNonEmptyString(payload.sid)

  if (explicitSessionId) {
    return explicitSessionId
  }

  if (participants.some((participant) => participant.sessionId === state.session.sessionId)) {
    return state.session.sessionId
  }

  const sameNicknameParticipants = participants.filter(
    (participant) => participant.nickname === state.session.nickname,
  )
  if (sameNicknameParticipants.length === 1) {
    return sameNicknameParticipants[0].sessionId
  }

  return state.session.sessionId
}

export function applyTotalPointsToParticipants(
  participants: Participant[],
  totalPoints: Record<string, number>,
): Participant[] {
  if (Object.keys(totalPoints).length === 0) {
    return participants
  }

  return participants.map((participant) => ({
    ...participant,
    score: totalPoints[participant.sessionId] ?? participant.score,
  }))
}

export function normalizeRoomSnapshotPayload(
  payload: unknown,
  state: AppState,
): NormalizedRoomSnapshotResult | null {
  if (!isRecord(payload)) {
    return null
  }

  const hostSessionId = readNonEmptyString(payload.hs) ?? ''
  const snapshotGame = isRecord(payload.g) ? payload.g : null
  const roomState = normalizeSnapshotRoomState(undefined, snapshotGame)
  const participants = normalizeParticipants(payload.ps, hostSessionId, roomState)
  const ownSessionId = resolveOwnSessionIdFromSnapshotPayload(payload, participants, state)
  const rawSettings = readRawSettingsPayload(payload)
  const settings =
    rawSettings === undefined
      ? state.room.settings
      : normalizeGameSettings(rawSettings, state.room.settings)
  const serverNowMs = readFiniteNumber(payload.now)
  const deadlineAtMs = readFiniteNumber(payload.dl)
  const currentCanvasStrokes = normalizeSnapshotCanvasStrokes(payload.cv)
  const inferredCurrentRound = snapshotGame
    ? normalizeCurrentRound(snapshotGame, settings)
    : null
  const currentRound = roomState === 'LOBBY' ? null : inferredCurrentRound
  const inferredCurrentTurn = snapshotGame
    ? normalizeCurrentTurn(snapshotGame, settings, participants, currentRound)
    : null
  const currentTurn = roomState === 'LOBBY' ? null : inferredCurrentTurn
  const preservedTurnCanvasStrokes =
    currentTurn &&
    !currentCanvasStrokes &&
    state.room.currentTurn?.turnId === currentTurn.turnId
      ? state.room.currentTurn.canvasStrokes
      : undefined
  const normalizedCurrentTurn = currentTurn
    ? {
        ...currentTurn,
        ...(serverNowMs !== undefined &&
        deadlineAtMs !== undefined &&
        (currentTurn.phase === 'DRAWING' || currentTurn.phase === 'WORD_CHOICE')
          ? {
              deadlineAtMs: Date.now() + Math.max(0, deadlineAtMs - serverNowMs),
              remainingSec: Math.max(0, Math.ceil((deadlineAtMs - serverNowMs) / 1000)),
            }
          : {}),
        canvasStrokes: currentCanvasStrokes ?? preservedTurnCanvasStrokes ?? currentTurn.canvasStrokes,
      }
    : null
  const lobbyCanvasStrokes = currentCanvasStrokes ?? state.room.lobbyCanvasStrokes ?? []
  const snapshotTotalPoints = snapshotGame
    ? readPointsMap(snapshotGame.pts)
    : {}
  const normalizedParticipants = applyTotalPointsToParticipants(participants, snapshotTotalPoints)
  const chat = state.room.chat

  return {
    ownSessionId,
    roomSnapshot: {
      ...state.room,
      roomId: state.room.roomId,
      roomCode: readNonEmptyString(payload.rc) ?? '',
      roomType: normalizeSnapshotRoomType(
        readSnapshotRoomTypeValue(payload),
        state.room.roomType,
      ),
      hostSessionId,
      participants: normalizedParticipants,
      lobbyCanvasStrokes,
      settings,
      roomState,
      gameId:
        roomState === 'LOBBY'
          ? null
          : snapshotGame
            ? readNonEmptyString(snapshotGame.gid) ?? null
            : null,
      gameStartRemainingSec: undefined,
      gameStartDeadlineAtMs: undefined,
      roundStartRemainingSec: undefined,
      roundStartDeadlineAtMs: undefined,
      resultRemainingSec: undefined,
      resultDeadlineAtMs: undefined,
      currentRound,
      currentTurn: normalizedCurrentTurn,
      chat,
    },
  }
}

export function decodeSnapshotEnvelopePayload(
  payload: unknown,
  state: AppState,
): NormalizedRoomSnapshotResult | null {
  if (!isRecord(payload)) {
    return null
  }

  const explicitSessionId = readNonEmptyString(payload.sid)
  const snapshotPayload = isRecord(payload.s) ? payload.s : null
  const normalized = normalizeRoomSnapshotPayload(snapshotPayload, state)

  if (!normalized) {
    return null
  }

  return {
    roomSnapshot: normalized.roomSnapshot,
    ownSessionId: explicitSessionId ?? normalized.ownSessionId,
  }
}
