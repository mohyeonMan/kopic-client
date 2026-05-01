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
  resolveChatTone,
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

  const gamePhase = snapshotGame ? readNonEmptyString(snapshotGame.gamePhase) : undefined
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
    }
  }

  if (!isRecord(raw)) {
    return fallback
  }

  const drawerOrderMode = readDrawerOrderMode(raw.drawerOrderMode, fallback.drawerOrderMode)
  const endMode = readEndMode(raw.endMode, fallback.endMode)

  return {
    roundCount: readInt(raw.roundCount, fallback.roundCount),
    drawSec: readInt(raw.drawSec, fallback.drawSec),
    wordChoiceSec: readInt(raw.wordChoiceSec, fallback.wordChoiceSec),
    wordChoiceCount: readInt(raw.wordChoiceCount, fallback.wordChoiceCount),
    hintRevealSec: readInt(raw.hintRevealSec, fallback.hintRevealSec),
    hintLetterCount: readInt(raw.hintLetterCount, fallback.hintLetterCount),
    drawerOrderMode,
    endMode,
  }
}

function readRawSettingsPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return undefined
  }

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

export function decodeSettingsUpdatePayload(
  payload: unknown,
  fallback: GameSettings,
): GameSettings | null {
  const rawSettings = readRawSettingsPayload(payload) ?? payload

  if (Array.isArray(rawSettings)) {
    return normalizeGameSettings(rawSettings, fallback)
  }

  if (!isRecord(rawSettings)) {
    return null
  }

  const hasSettingKeys =
    Object.prototype.hasOwnProperty.call(rawSettings, 'roundCount') ||
    Object.prototype.hasOwnProperty.call(rawSettings, 'drawSec') ||
    Object.prototype.hasOwnProperty.call(rawSettings, 'wordChoiceSec') ||
    Object.prototype.hasOwnProperty.call(rawSettings, 'wordChoiceCount') ||
    Object.prototype.hasOwnProperty.call(rawSettings, 'hintRevealSec') ||
    Object.prototype.hasOwnProperty.call(rawSettings, 'hintLetterCount') ||
    Object.prototype.hasOwnProperty.call(rawSettings, 'drawerOrderMode') ||
    Object.prototype.hasOwnProperty.call(rawSettings, 'endMode')

  if (!hasSettingKeys) {
    return null
  }

  return normalizeGameSettings(rawSettings, fallback)
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
  const rawParticipants = Array.isArray(raw)
    ? raw
    : isRecord(raw)
      ? Object.entries(raw).map(([sessionId, participant]) =>
          isRecord(participant)
            ? { ...participant, sessionId: readNonEmptyString(participant.sessionId) ?? sessionId }
            : { sessionId },
        )
      : []

  const nextParticipants: Participant[] = []
  const knownSessionIds = new Set<string>()

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

    nextParticipants.push({
      sessionId,
      nickname:
        readNonEmptyString(participant.nickname) ??
        readNonEmptyString(participant.n) ??
        `Guest${index + 1}`,
      colorIndex:
        normalizeParticipantColorIndex(participant.colorIndex) ??
        normalizeParticipantColorIndex(participant.ci) ??
        normalizeParticipantColorIndex(participant.color) ??
        normalizeParticipantColorIndex(participant.c),
      isHost: sessionId === hostSessionId,
      score: readFiniteNumber(participant.score) ?? 0,
      isOnline:
        typeof participant.isOnline === 'boolean'
          ? participant.isOnline
          : true,
      joinOrder: readFiniteNumber(participant.joinOrder) ?? index + 1,
      joinedMidRound:
        typeof participant.joinedMidRound === 'boolean'
          ? participant.joinedMidRound
          : roomState === 'RUNNING',
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

  const roundNo = readFiniteNumber(raw.roundNo) ?? readFiniteNumber(raw.round) ?? 1
  const parsedDrawerOrder = Array.isArray(raw.drawerSids)
    ? raw.drawerSids
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : Array.isArray(raw.drawerOrder)
      ? raw.drawerOrder
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : []
  const drawerSessionId =
    readNonEmptyString(raw.drawerSid) ??
    readNonEmptyString(raw.drawerSessionId)
  const turnCursorFromDrawer =
    drawerSessionId && parsedDrawerOrder.length > 0
      ? parsedDrawerOrder.findIndex((sessionId) => sessionId === drawerSessionId)
      : -1

  return {
    roundNo,
    totalRounds: readFiniteNumber(raw.totalRounds) ?? settings.roundCount,
    turnCursor:
      readFiniteNumber(raw.turnCursor) ??
      (turnCursorFromDrawer >= 0 ? turnCursorFromDrawer : 0),
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
  const drawerSessionId =
    readNonEmptyString(raw.drawerSessionId) ??
    readNonEmptyString(raw.drawerUserId) ??
    readNonEmptyString(raw.drawerSid) ??
    fallbackDrawerSessionId
  const phase =
    normalizeSnapshotTurnPhase(raw.phase) ??
    normalizeSnapshotTurnPhase(raw.turnPhase) ??
    'WORD_CHOICE'
  const correctSessionIdsSource = Array.isArray(raw.correctSessionIds)
    ? raw.correctSessionIds
    : Array.isArray(raw.correctUserIds)
      ? raw.correctUserIds
      : Array.isArray(raw.correctAnswerSids)
        ? raw.correctAnswerSids
        : []
  const earnedPoints = readPointsMap(raw.earnedPoints)
  const wordChoices = Array.isArray(raw.wordChoices)
    ? raw.wordChoices
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : Array.isArray(raw.words)
      ? raw.words
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : []
  const canvasStrokes = Array.isArray(raw.canvasStrokes)
    ? raw.canvasStrokes
        .map(normalizeCanvasStroke)
        .filter((stroke): stroke is CanvasStroke => stroke !== null)
    : []
  const selectedWord =
    raw.selectedWord === null || raw.answer === null
      ? null
      : readNonEmptyString(raw.selectedWord) ??
        readNonEmptyString(raw.answer) ??
        null
  const roundNo =
    readFiniteNumber(raw.roundNo) ??
    readFiniteNumber(raw.round) ??
    currentRound?.roundNo ??
    1
  const turnNo =
    readFiniteNumber(raw.turnNo) ??
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
    readFiniteNumber(raw.answerLength) ??
    (selectedWord !== null ? Array.from(selectedWord).length : undefined)

  return {
    roundNo,
    turnNo,
    turnId:
      readNonEmptyString(raw.turnId) ??
      readNonEmptyString(raw.turn) ??
      `turn-r${roundNo}-${turnNo}`,
    drawerSessionId,
    phase,
    remainingSec:
      readFiniteNumber(raw.remainingSec) ??
      (phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0),
    deadlineAtMs: readFiniteNumber(raw.deadlineAtMs),
    correctSessionIds,
    earnedPoints,
    wordChoices,
    selectedWord,
    answerLength,
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

function normalizeChatMessages(
  raw: unknown,
  ownSessionId: string,
  fallback: ChatMessage[],
  currentTurn: TurnSummary | null,
): ChatMessage[] {
  if (!Array.isArray(raw)) {
    return fallback
  }

  const nextMessages: ChatMessage[] = []
  for (const item of raw) {
    if (!isRecord(item)) {
      continue
    }

    const senderSessionId =
      readNonEmptyString(item.senderSessionId) ??
      readNonEmptyString(item.sid) ??
      readNonEmptyString(item.sessionId)
    const text = readNonEmptyString(item.text)
    if (!text) {
      continue
    }

    const tone = resolveChatTone(item.tone, item.sealed)
    const message: ChatMessage = {
      id: readNonEmptyString(item.id) ?? createUUID(),
      nickname: readNonEmptyString(item.nickname) ?? '알수없음',
      text,
      tone,
      privilegedVisible:
        typeof item.privilegedVisible === 'boolean'
          ? item.privilegedVisible
          : resolvePrivilegedChatVisibility(tone, currentTurn, ownSessionId, senderSessionId),
      mine:
        typeof item.mine === 'boolean'
          ? item.mine
          : senderSessionId === ownSessionId,
      createdAt: readFiniteNumber(item.createdAt) ?? Date.now(),
      displayInChat:
        typeof item.displayInChat === 'boolean'
          ? item.displayInChat
          : undefined,
    }

    if (senderSessionId) {
      message.senderSessionId = senderSessionId
    }

    nextMessages.push(message)
  }

  return nextMessages
}

function resolveOwnSessionIdFromSnapshotPayload(
  payload: Record<string, unknown>,
  participants: Participant[],
  state: AppState,
): string {
  const explicitSessionId =
    readNonEmptyString(payload.mySessionId) ??
    readNonEmptyString(payload.mySid) ??
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.sessionId)

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

  const hostSessionId =
    readNonEmptyString(payload.hostSessionId) ??
    readNonEmptyString(payload.hostUserId) ??
    ''
  const snapshotGame = isRecord(payload.game) ? payload.game : null
  const roomState = normalizeSnapshotRoomState(payload.roomState, snapshotGame)
  const hasParticipants = Object.prototype.hasOwnProperty.call(payload, 'participants')
  const participants = hasParticipants
    ? normalizeParticipants(payload.participants, hostSessionId, roomState)
    : []
  const ownSessionId = resolveOwnSessionIdFromSnapshotPayload(payload, participants, state)
  const rawSettings = readRawSettingsPayload(payload)
  const settings =
    rawSettings === undefined
      ? state.room.settings
      : normalizeGameSettings(rawSettings, state.room.settings)
  const hasCurrentRound = Object.prototype.hasOwnProperty.call(payload, 'currentRound')
  const hasCurrentTurn = Object.prototype.hasOwnProperty.call(payload, 'currentTurn')
  const hasCurrentCanvas = Object.prototype.hasOwnProperty.call(payload, 'currentCanvas')
  const serverNowMs = readFiniteNumber(payload.serverNowMs)
  const deadlineAtMs = readFiniteNumber(payload.deadlineAtMs)
  const currentCanvasStrokes = hasCurrentCanvas
    ? normalizeSnapshotCanvasStrokes(payload.currentCanvas)
    : null
  const inferredCurrentRound = hasCurrentRound
    ? normalizeCurrentRound(payload.currentRound, settings)
    : snapshotGame
      ? normalizeCurrentRound(snapshotGame, settings)
      : null
  const currentRound = roomState === 'LOBBY' ? null : inferredCurrentRound
  const inferredCurrentTurn = hasCurrentTurn
    ? normalizeCurrentTurn(payload.currentTurn, settings, participants, currentRound)
    : snapshotGame
      ? normalizeCurrentTurn(snapshotGame, settings, participants, currentRound)
      : null
  const currentTurn = roomState === 'LOBBY' ? null : inferredCurrentTurn
  const payloadCurrentTurn = isRecord(payload.currentTurn) ? payload.currentTurn : null
  const hasTurnCanvasStrokes =
    payloadCurrentTurn &&
    Object.prototype.hasOwnProperty.call(payloadCurrentTurn, 'canvasStrokes')
  const preservedTurnCanvasStrokes =
    currentTurn &&
    !hasTurnCanvasStrokes &&
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
  const lobbyCanvasStrokes = Array.isArray(payload.lobbyCanvasStrokes)
    ? payload.lobbyCanvasStrokes
        .map(normalizeCanvasStroke)
        .filter((stroke): stroke is CanvasStroke => stroke !== null)
    : currentCanvasStrokes
      ? currentCanvasStrokes
      : state.room.lobbyCanvasStrokes ?? []
  const snapshotTotalPoints = snapshotGame
    ? readPointsMap(snapshotGame.totalPoints)
    : readPointsMap(payload.totalPoints)
  const normalizedParticipants = applyTotalPointsToParticipants(participants, snapshotTotalPoints)
  const chat = normalizeChatMessages(payload.chat, ownSessionId, state.room.chat, normalizedCurrentTurn)

  return {
    ownSessionId,
    roomSnapshot: {
      ...state.room,
      roomId: state.room.roomId,
      roomCode: readNonEmptyString(payload.roomCode) ?? '',
      roomType: payload.roomType === 'PRIVATE' ? 'PRIVATE' : 'PRIVATE',
      hostSessionId,
      participants: normalizedParticipants,
      lobbyCanvasStrokes,
      settings,
      roomState,
      gameId:
        roomState === 'LOBBY'
          ? null
          : payload.gameId === null
            ? null
            : readNonEmptyString(payload.gameId) ??
              (snapshotGame ? readNonEmptyString(snapshotGame.gid) : undefined) ??
              null,
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

  const explicitSessionId =
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.sessionId) ??
    readNonEmptyString(payload.mySid) ??
    readNonEmptyString(payload.mySessionId)
  const explicitRoomCode = readNonEmptyString(payload.roomCode)
  const explicitHostSessionId =
    readNonEmptyString(payload.hostSessionId) ??
    readNonEmptyString(payload.hostUserId)
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
  const normalized = normalizeRoomSnapshotPayload(normalizedSnapshotPayload, state)

  if (!normalized) {
    return null
  }

  return {
    roomSnapshot: normalized.roomSnapshot,
    ownSessionId: explicitSessionId ?? normalized.ownSessionId,
  }
}
