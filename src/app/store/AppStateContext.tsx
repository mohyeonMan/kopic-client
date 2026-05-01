import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import {
  type AppState,
  type CanvasStroke,
  type DrawingTool,
  type ChatMessage,
  type ConnectionStatus,
  initialAppState,
  type GameSettings,
  type Participant,
  type RoomState,
  type RoomSnapshot,
  type RoundSummary,
  type TurnPhase,
  type TurnSummary,
} from './mockAppState'
import {
  AppStateContext,
  type AppStateContextValue,
  type GeDrawingStartedPayload,
  type GeGameResultPayload,
  type GeGameStartedPayload,
  type GeGuessCorrectPayload,
  type GeRoundStartedPayload,
  type GeReturnToLobbyPayload,
  type GeTurnStartedPayload,
  type GeTurnEndedPayload,
  type GeWordChoiceOpenedPayload,
  type ServerGameStartedPayload,
  type ServerWordChoicePayload,
} from './appStateContextValue'
import {
  clientEventMeta,
  type ClientEventCode,
  type Envelope,
} from '../../ws/protocol/events'
import { wsSessionManager } from '../../ws/client/wsSessionManager'
import { createUUID } from '../utils/createUUID'

type AppAction =
  | { type: 'local/sessionNicknameUpdated'; payload: string }
  | { type: 'local/sessionIdSynced'; payload: string }
  | { type: 'local/joinRequested'; payload?: { roomCode?: string; action?: 0 | 1 } }
  | { type: 'local/joinAccepted' }
  | { type: 'local/joinFailed'; payload: { reason: string; message: string } }
  | { type: 'local/joinErrorDismissed' }
  | { type: 'local/connectionErrorReported'; payload: { reason: string; message: string } }
  | { type: 'local/connectionErrorDismissed' }
  | { type: 'local/roomCacheCleared' }
  | { type: 'local/lobbySettingsPatched'; payload: Partial<GameSettings> }
  | { type: 'local/guessSubmitted'; payload: string }
  | { type: 'connection/statusChanged'; payload: ConnectionStatus }
  | { type: 'server/roomSnapshotApplied'; payload: RoomSnapshot }
  | { type: 'server/roomJoinedApplied'; payload: ServerRoomJoinedPayload }
  | { type: 'server/roomLeftApplied'; payload: ServerRoomLeftPayload }
  | { type: 'server/geGameStartedApplied'; payload: GeGameStartedPayload }
  | { type: 'server/geRoundStartedApplied'; payload: GeRoundStartedPayload }
  | { type: 'server/geTurnStartedApplied'; payload: GeTurnStartedPayload }
  | { type: 'server/geGuessCorrectApplied'; payload: GeGuessCorrectPayload }
  | { type: 'server/geWordChoiceOpenedApplied'; payload: GeWordChoiceOpenedPayload }
  | { type: 'server/geDrawingStartedApplied'; payload: GeDrawingStartedPayload }
  | { type: 'server/geTurnEndedApplied'; payload: GeTurnEndedPayload }
  | { type: 'server/geGameResultApplied'; payload: GeGameResultPayload }
  | { type: 'server/geReturnToLobbyApplied'; payload: GeReturnToLobbyPayload }
  | { type: 'server/gameStartedApplied'; payload: ServerGameStartedPayload }
  | { type: 'server/wordChoiceApplied'; payload: ServerWordChoicePayload }
  | { type: 'server/chatReceived'; payload: ChatMessage }
  | { type: 'server/canvasStrokeReceived'; payload: CanvasStroke }
  | { type: 'server/canvasStrokesReceived'; payload: CanvasStroke[] }
  | { type: 'server/canvasCleared' }
  | { type: 'server/gameEndedApplied' }
  | { type: 'dev/turnPhaseForced'; payload: TurnPhase }
  | { type: 'dev/mockFlowAdvanced' }

const mockWordPool = ['사과', '기차', '고양이', '우주선', '피아노']

type ClientEventName = (typeof clientEventMeta)[number]['name']
type CompactPoint = [number, number]
type CompactStrokePayload = [number, number, number, CompactPoint[]]
type CompactGameSettingsPayload = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]
type ServerRoomJoinedPayload = {
  sessionId: string
  nickname: string
}
type ServerRoomLeftPayload = {
  sid: string
  nextHostSid?: string
}

const WS_COLOR_PALETTE = [
  '#203247',
  '#345a74',
  '#56758f',
  '#d14b3f',
  '#ea6f58',
  '#ef9b47',
  '#f2c14e',
  '#5f8d4e',
  '#7aac63',
  '#1d6b4e',
  '#1f8a8a',
  '#4aa3b8',
  '#5f6dd9',
  '#6f55c6',
  '#9656a2',
  '#bd6a88',
  '#8d6e63',
  '#6f5a4b',
  '#9aa5b1',
  '#ffffff',
] as const

const colorIndexByHex = new Map<string, number>(
  WS_COLOR_PALETTE.map((color, index) => [color, index]),
)
const TOOL_CODE_BY_NAME: Record<DrawingTool, number> = {
  PEN: 0,
  ERASER: 1,
  FILL: 2,
}
const TOOL_NAME_BY_CODE: DrawingTool[] = ['PEN', 'ERASER', 'FILL']
const CANVAS_CLEAR_MARKER: CompactStrokePayload = [3, 0, 0, []]

const clientEventCodeByName = new Map<ClientEventName, ClientEventCode>(
  clientEventMeta.map((event) => [event.name, event.code]),
)

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function encodeCompactStroke(stroke: CanvasStroke): CompactStrokePayload {
  const toolCode = TOOL_CODE_BY_NAME[stroke.tool]
  const colorIndex = colorIndexByHex.get(stroke.color) ?? colorIndexByHex.get('#203247') ?? 0

  return [
    toolCode,
    colorIndex,
    roundTo(stroke.size, 1),
    stroke.points.map((point) => [roundTo(point.x, 3), roundTo(point.y, 3)]),
  ]
}

function encodeCompactGameSettings(settings: GameSettings): CompactGameSettingsPayload {
  const drawerOrderMode = settings.drawerOrderMode === 'RANDOM' ? 1 : 0
  const endMode = settings.endMode === 'TIME_OR_ALL_CORRECT' ? 1 : 0

  return [
    settings.roundCount,
    settings.drawSec,
    settings.wordChoiceSec,
    settings.wordChoiceCount,
    settings.hintRevealSec,
    settings.hintLetterCount,
    drawerOrderMode,
    endMode,
  ]
}

function decodeCompactStroke(payload: unknown): CanvasStroke | null {
  if (!Array.isArray(payload)) {
    return null
  }

  const [toolCode, color, size, points] = payload
  const tool = TOOL_NAME_BY_CODE[toolCode]
  if (
    !tool ||
    typeof color !== 'number' ||
    typeof size !== 'number' ||
    !Array.isArray(points)
  ) {
    return null
  }

  const colorHex = WS_COLOR_PALETTE[color] ?? '#203247'
  const normalizedPoints = points
    .filter((point): point is [number, number] =>
      Array.isArray(point) &&
      point.length === 2 &&
      typeof point[0] === 'number' &&
      typeof point[1] === 'number',
    )
    .map(([x, y]) => ({ x, y }))

  return {
    id: createUUID(),
    tool,
    color: colorHex,
    size,
    points: normalizedPoints,
  }
}

function createSystemMessage(text: string): ChatMessage {
  return {
    id: createUUID(),
    nickname: 'system',
    text,
    tone: 'system',
  }
}

function createPresenceMessage(nickname: string, joined: boolean): ChatMessage {
  return {
    id: createUUID(),
    nickname: '알림',
    text: `${nickname} 님이 ${joined ? '입장' : '퇴장'} 하셨습니다`,
    tone: 'alert',
    createdAt: Date.now(),
  }
}

function createHostChangedMessage(nickname: string): ChatMessage {
  return {
    id: createUUID(),
    nickname: '알림',
    text: `${nickname}님이 새로운 방장이 되셨습니다.`,
    tone: 'alert',
    createdAt: Date.now(),
  }
}

function createCorrectAnswerAlertMessage(nickname: string): ChatMessage {
  return {
    id: createUUID(),
    nickname: '알림',
    text: `${nickname} 님이 정답을 맞혔습니다.`,
    tone: 'alert-success',
    createdAt: Date.now(),
  }
}

function isSealedChatValue(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function resolveChatTone(rawTone: unknown, sealed: unknown): ChatMessage['tone'] {
  if (rawTone === 'sealed' || isSealedChatValue(sealed)) {
    return 'sealed'
  }

  return rawTone === 'system' ||
    rawTone === 'guess' ||
    rawTone === 'correct' ||
    rawTone === 'alert' ||
    rawTone === 'alert-success'
    ? rawTone
    : 'guess'
}

function decodeGuessSubmittedMessage(payload: unknown): ChatMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, sessionId, t, text, sealed } = payload as {
    sid?: unknown
    sessionId?: unknown
    t?: unknown
    text?: unknown
    sealed?: unknown
  }
  const rawText =
    typeof t === 'string'
      ? t
      : typeof text === 'string'
        ? text
        : null

  if (!rawText || rawText.trim().length === 0) {
    return null
  }

  const senderSessionId =
    typeof sid === 'string' && sid.trim().length > 0
      ? sid.trim()
      : typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId.trim()
        : undefined

  return {
    id: createUUID(),
    nickname: '알수없음',
    text: rawText.slice(0, 50),
    tone: resolveChatTone(undefined, sealed),
    senderSessionId,
    mine: false,
    createdAt: Date.now(),
  }
}

function decodeInboundEnvelope(raw: unknown): Envelope<unknown, number> | null {
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

function sortParticipantsByJoinOrder(participants: Participant[]): Participant[] {
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

function decodeSettingsUpdatePayload(payload: unknown, fallback: GameSettings): GameSettings | null {
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
            ? { ...participant, sessionId: readNonEmptyString((participant as Record<string, unknown>).sessionId) ?? sessionId }
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

function normalizeChatMessages(
  raw: unknown,
  ownSessionId: string,
  fallback: ChatMessage[],
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

function normalizeRoomSnapshotPayload(
  payload: unknown,
  state: AppState,
): { roomSnapshot: RoomSnapshot; ownSessionId: string } | null {
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
  const chat = normalizeChatMessages(payload.chat, ownSessionId, state.room.chat)

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

function decodeSnapshotEnvelopePayload(
  payload: unknown,
  state: AppState,
): { roomSnapshot: RoomSnapshot; ownSessionId: string } | null {
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

function getDrawerOrder(participants: Participant[]) {
  return participants
    .filter((participant) => !participant.joinedMidRound)
    .sort((left, right) => {
      if (left.joinOrder !== right.joinOrder) {
        return left.joinOrder - right.joinOrder
      }

      return left.sessionId.localeCompare(right.sessionId)
    })
    .map((participant) => participant.sessionId)
}

function getWordChoices(count: number) {
  const safeCount = Math.max(3, Math.min(5, count))
  return mockWordPool.slice(0, safeCount)
}

function createMockTurn(
  roundNo: number,
  turnNo: number,
  drawerSessionId: string,
  phase: TurnPhase,
  settings: GameSettings,
): TurnSummary {
  const wordChoices = getWordChoices(settings.wordChoiceCount)
  const turnEndCorrectSessionIds =
    settings.endMode === 'FIRST_CORRECT'
      ? ['u-200']
      : ['u-200', 'u-300', 'u-400', 'u-500', 'u-600', 'u-700', 'u-800', 'u-900', 'u-1000']
  const remainingSec =
    phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0
  const earnedPoints =
    phase === 'TURN_END'
      ? Object.fromEntries(
          [
            [drawerSessionId, 40],
            ...turnEndCorrectSessionIds.map((sessionId) => [sessionId, 80] as const),
          ],
        )
      : {}

  return {
    roundNo,
    turnNo,
    turnId: `turn-r${roundNo}-${turnNo}`,
    drawerSessionId,
    phase,
    remainingSec,
    deadlineAtMs: remainingSec > 0 ? Date.now() + remainingSec * 1000 : undefined,
    correctSessionIds: phase === 'TURN_END' ? turnEndCorrectSessionIds : [],
    earnedPoints,
    wordChoices,
    selectedWord: phase === 'DRAWING' || phase === 'TURN_END' ? wordChoices[0] : null,
    canvasStrokes: [],
  }
}

function createMockGameStartedPayload(state: AppState): ServerGameStartedPayload {
  const drawerOrder = getDrawerOrder(state.room.participants)
  const firstDrawerSessionId = drawerOrder[0] ?? state.session.sessionId
  const currentRound: RoundSummary = {
    roundNo: 1,
    totalRounds: state.room.settings.roundCount,
    turnCursor: 0,
    drawerOrder,
  }

  return {
    gameId: 'game-20260323-01',
    currentRound,
    currentTurn: createMockTurn(1, 1, firstDrawerSessionId, 'WORD_CHOICE', state.room.settings),
    chatMessages: [
      createSystemMessage('GAME_STARTED'),
      createSystemMessage('303 ROUND_STARTED with drawerOrder snapshot'),
      createSystemMessage('304 TURN_STARTED'),
    ],
  }
}

function createGeTurnId(gameId: string | null, roundNo: number, turnNo: number) {
  const resolvedGameId = gameId && gameId.trim().length > 0 ? gameId : 'ge-game'
  return `ge:${resolvedGameId}:r${roundNo}:t${turnNo}`
}

function createDeadlineAtMs(remainingSec: number) {
  return remainingSec > 0 ? Date.now() + remainingSec * 1000 : undefined
}

function resolveDrawerTurnCursor(
  drawerOrder: string[],
  drawerSessionId: string,
  fallbackTurnCursor = 0,
) {
  const resolvedIndex = drawerOrder.findIndex((sessionId) => sessionId === drawerSessionId)
  return resolvedIndex >= 0 ? resolvedIndex : fallbackTurnCursor
}

function resolveRunningRoundSummary(state: AppState): RoundSummary {
  if (state.room.currentRound) {
    return state.room.currentRound
  }

  return {
    roundNo: 1,
    totalRounds: state.room.settings.roundCount,
    turnCursor: 0,
    drawerOrder: getDrawerOrder(state.room.participants),
  }
}

function applyEarnedPointsToParticipants(
  participants: Participant[],
  earnedPoints: Record<string, number>,
): Participant[] {
  if (Object.keys(earnedPoints).length === 0) {
    return participants
  }

  return participants.map((participant) => ({
    ...participant,
    score: participant.score + (earnedPoints[participant.sessionId] ?? 0),
  }))
}

function applyTotalPointsToParticipants(
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

function resetParticipantsForLobby(participants: Participant[]): Participant[] {
  return participants.map((participant) => ({
    ...participant,
    score: 0,
    joinedMidRound: false,
  }))
}

function decodeGeGameStartedPayload(payload: unknown): GeGameStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  if (!gameId) {
    return null
  }

  return { gameId }
}

function decodeGeRoundStartedPayload(payload: unknown): GeRoundStartedPayload | null {
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

function decodeGeTurnStartedPayload(payload: unknown): GeTurnStartedPayload | null {
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

function decodeGeGuessCorrectPayload(payload: unknown): GeGuessCorrectPayload | null {
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

function decodeGeWordChoiceOpenedPayload(payload: unknown): GeWordChoiceOpenedPayload | null {
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

function decodeGeDrawingStartedPayload(payload: unknown): GeDrawingStartedPayload | null {
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

function readPointsMap(value: unknown): Record<string, number> {
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

function decodeGeTurnEndedPayload(payload: unknown): GeTurnEndedPayload | null {
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

function decodeGeGameResultPayload(payload: unknown): GeGameResultPayload | null {
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

function decodeGeReturnToLobbyPayload(payload: unknown): GeReturnToLobbyPayload | null {
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

function isCanvasClearPayload(payload: unknown) {
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

function createLobbySnapshot(state: AppState): RoomSnapshot {
  return {
    ...state.room,
    roomState: 'LOBBY',
    gameId: null,
    currentRound: null,
    currentTurn: null,
    settings: { ...state.room.settings },
    participants: state.room.participants.map((participant) => ({
      ...participant,
      joinedMidRound: false,
    })),
    chat: [
      ...state.room.chat,
      createSystemMessage('room reset to lobby mock state'),
    ],
  }
}

function createForcedTurn(currentTurn: TurnSummary, phase: TurnPhase, settings: GameSettings): TurnSummary {
  const nextTurn = createMockTurn(
    currentTurn.roundNo,
    currentTurn.turnNo,
    currentTurn.drawerSessionId,
    phase,
    settings,
  )

  if (phase === 'DRAWING') {
    return {
      ...nextTurn,
      selectedWord: currentTurn.selectedWord ?? currentTurn.wordChoices[0] ?? nextTurn.selectedWord,
      wordChoices: currentTurn.wordChoices,
      earnedPoints: currentTurn.earnedPoints,
      canvasStrokes: currentTurn.canvasStrokes,
    }
  }

  if (phase === 'TURN_END') {
    return {
      ...nextTurn,
      selectedWord: currentTurn.selectedWord ?? currentTurn.wordChoices[0] ?? nextTurn.selectedWord,
      wordChoices: currentTurn.wordChoices,
      earnedPoints: currentTurn.earnedPoints,
      canvasStrokes: currentTurn.canvasStrokes,
    }
  }

  return nextTurn
}

function decodeRoomJoinedPayload(payload: unknown): ServerRoomJoinedPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, sessionId, nickname, n } = payload as {
    sid?: unknown
    sessionId?: unknown
    nickname?: unknown
    n?: unknown
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
  }
}

function decodeRoomLeftPayload(payload: unknown): ServerRoomLeftPayload | null {
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

function decodeJoinFailedPayload(payload: unknown): { reason: string; message: string } {
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

function decodeConnectionErrorPayload(payload: unknown): { reason: string; message: string } | null {
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

function createClearedRoomState(state: AppState): RoomSnapshot {
  return {
    ...state.room,
    roomCode: '',
    hostSessionId: '',
    participants: [],
    lobbyCanvasStrokes: [],
    settings: { ...state.room.settings },
    roomState: 'LOBBY',
    gameId: null,
    currentRound: null,
    currentTurn: null,
    chat: [],
  }
}

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'local/sessionNicknameUpdated':
      return {
        ...state,
        session: {
          ...state.session,
          nickname: action.payload,
        },
        room: {
          ...state.room,
          participants: state.room.participants.map((participant) =>
            participant.sessionId === state.session.sessionId
              ? { ...participant, nickname: action.payload }
              : participant,
          ),
        },
      }
    case 'local/sessionIdSynced':
      if (!action.payload || action.payload === state.session.sessionId) {
        return state
      }

      return {
        ...state,
        session: {
          ...state.session,
          sessionId: action.payload,
        },
      }
    case 'local/joinRequested':
      return {
        ...state,
        session: {
          ...state.session,
          joinPending: true,
          joinAccepted: false,
          joinRoomCode: action.payload?.roomCode,
          joinAction: action.payload?.action ?? 0,
          joinError: undefined,
          connectionError: undefined,
        },
        room: createClearedRoomState(state),
      }
    case 'local/joinAccepted':
      return {
        ...state,
        session: {
          ...state.session,
          joinPending: false,
          joinAccepted: true,
          joinError: undefined,
          connectionError: undefined,
        },
      }
    case 'local/joinFailed':
      return {
        ...state,
        session: {
          ...state.session,
          joinPending: false,
          joinAccepted: false,
          joinRoomCode: undefined,
          joinAction: undefined,
          joinError: action.payload,
          connectionError: state.session.connectionError,
        },
        room: createClearedRoomState(state),
      }
    case 'local/joinErrorDismissed':
      return {
        ...state,
        session: {
          ...state.session,
          joinError: undefined,
        },
      }
    case 'local/connectionErrorReported':
      return {
        ...state,
        session: {
          ...state.session,
          joinPending: false,
          joinAccepted: false,
          joinRoomCode: undefined,
          joinAction: undefined,
          connectionError: action.payload,
        },
        room: createClearedRoomState(state),
      }
    case 'local/connectionErrorDismissed':
      return {
        ...state,
        session: {
          ...state.session,
          connectionError: undefined,
        },
      }
    case 'local/roomCacheCleared':
      return {
        ...state,
        session: {
          ...state.session,
          joinPending: false,
          joinAccepted: false,
          joinRoomCode: undefined,
          joinAction: undefined,
          joinError: undefined,
          connectionError: state.session.connectionError,
        },
        room: createClearedRoomState(state),
      }
    case 'local/lobbySettingsPatched':
      return {
        ...state,
        room: {
          ...state.room,
          settings: {
            ...state.room.settings,
            ...action.payload,
          },
        },
      }
    case 'local/guessSubmitted':
      return {
        ...state,
        room: {
          ...state.room,
          chat: [
            ...state.room.chat,
            {
              id: createUUID(),
              nickname: state.session.nickname,
              text: action.payload,
              tone: 'guess',
              senderSessionId: state.session.sessionId,
              mine: true,
              createdAt: Date.now(),
            },
          ],
        },
      }
    case 'connection/statusChanged':
      if (action.payload === 'reconnecting') {
        return {
          ...state,
          connectionStatus: action.payload,
        }
      }

      if (action.payload === 'idle') {
        return {
          ...state,
          connectionStatus: action.payload,
          session: {
            ...state.session,
            joinPending: false,
            joinAccepted: false,
            joinRoomCode: undefined,
            joinAction: undefined,
            joinError: state.session.joinError,
            connectionError: state.session.connectionError,
          },
          room: createClearedRoomState(state),
        }
      }

      return {
        ...state,
        connectionStatus: action.payload,
      }
    case 'server/roomSnapshotApplied':
      return {
        ...state,
        room: {
          ...state.room,
          ...action.payload,
          participants: Array.isArray(action.payload.participants)
            ? sortParticipantsByJoinOrder(action.payload.participants)
            : state.room.participants,
          lobbyCanvasStrokes: Array.isArray(action.payload.lobbyCanvasStrokes)
            ? action.payload.lobbyCanvasStrokes
            : [],
          chat: Array.isArray(action.payload.chat)
            ? action.payload.chat
            : state.room.chat,
          settings: action.payload.settings ?? state.room.settings,
        },
      }
    case 'server/roomJoinedApplied': {
      if (state.room.participants.some((participant) => participant.sessionId === action.payload.sessionId)) {
        const updatedParticipants = sortParticipantsByJoinOrder(
          state.room.participants.map((participant) =>
            participant.sessionId === action.payload.sessionId
              ? {
                  ...participant,
                  nickname: action.payload.nickname,
                  isHost: participant.sessionId === state.room.hostSessionId,
                  isOnline: true,
                }
              : participant,
          ),
        )
        return {
          ...state,
          room: {
            ...state.room,
            participants: updatedParticipants,
            chat: [...state.room.chat, createPresenceMessage(action.payload.nickname, true)],
          },
        }
      }

      const maxJoinOrder = state.room.participants.reduce(
        (max, participant) => Math.max(max, participant.joinOrder),
        0,
      )

      const joinedParticipant: Participant = {
        sessionId: action.payload.sessionId,
        nickname: action.payload.nickname,
        isHost: action.payload.sessionId === state.room.hostSessionId,
        score: 0,
        isOnline: true,
        joinOrder: maxJoinOrder + 1,
        joinedMidRound: state.room.roomState === 'RUNNING',
      }

      return {
        ...state,
        room: {
          ...state.room,
          participants: sortParticipantsByJoinOrder([...state.room.participants, joinedParticipant]),
          chat: [...state.room.chat, createPresenceMessage(action.payload.nickname, true)],
        },
      }
    }
    case 'server/roomLeftApplied': {
      const leftParticipant = state.room.participants.find(
        (participant) => participant.sessionId === action.payload.sid,
      )
      const leftNickname = leftParticipant?.nickname ?? action.payload.sid
      const remainingParticipants = state.room.participants.filter(
        (participant) => participant.sessionId !== action.payload.sid,
      )
      const nextHostSessionId =
        action.payload.nextHostSid ??
        (state.room.hostSessionId === action.payload.sid
          ? remainingParticipants[0]?.sessionId
          : state.room.hostSessionId)
      const normalizedRemainingParticipants = remainingParticipants.map((participant) => ({
        ...participant,
        isHost: participant.sessionId === nextHostSessionId,
      }))
      const nextChat = leftNickname
        ? [...state.room.chat, createPresenceMessage(leftNickname, false)]
        : state.room.chat
      const finalChat =
        action.payload.nextHostSid
          ? [
              ...nextChat,
              createHostChangedMessage(
                normalizedRemainingParticipants.find(
                  (participant) => participant.sessionId === action.payload.nextHostSid,
                )?.nickname ?? action.payload.nextHostSid,
              ),
            ]
          : nextChat

      return {
        ...state,
        room: {
          ...state.room,
          hostSessionId: nextHostSessionId ?? state.room.hostSessionId,
          participants: normalizedRemainingParticipants,
          currentRound: state.room.currentRound
            ? {
                ...state.room.currentRound,
                drawerOrder: state.room.currentRound.drawerOrder.filter(
                  (sessionId) => sessionId !== action.payload.sid,
                ),
              }
            : null,
          currentTurn: state.room.currentTurn
            ? {
                ...state.room.currentTurn,
                correctSessionIds: state.room.currentTurn.correctSessionIds.filter(
                  (sessionId) => sessionId !== action.payload.sid,
                ),
              }
            : null,
          chat: finalChat,
        },
      }
    }
    case 'server/gameStartedApplied':
      return {
        ...state,
        connectionStatus: 'synced',
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: action.payload.gameId,
          currentRound: action.payload.currentRound,
          currentTurn: action.payload.currentTurn,
          chat: [...state.room.chat, ...(action.payload.chatMessages ?? [])],
        },
      }
    case 'server/geGameStartedApplied':
      return {
        ...state,
        connectionStatus: 'synced',
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: action.payload.gameId,
          currentRound: null,
          currentTurn: null,
          lobbyCanvasStrokes: [],
          chat: [...state.room.chat, createSystemMessage(`200 GE_GAME_STARTED ${action.payload.gameId}`)],
        },
      }
    case 'server/geRoundStartedApplied':
      return {
        ...state,
        connectionStatus: 'synced',
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: action.payload.gameId,
          currentRound: {
            roundNo: action.payload.roundNo,
            totalRounds: state.room.settings.roundCount,
            turnCursor: 0,
            drawerOrder: action.payload.drawerSessionIds,
          },
          currentTurn: null,
          lobbyCanvasStrokes: [],
          chat: [...state.room.chat, createSystemMessage(`202 GE_ROUND_STARTED R${action.payload.roundNo}`)],
        },
      }
    case 'server/geTurnStartedApplied': {
      const activeRound = resolveRunningRoundSummary(state)
      const nextTurnCursor =
        state.room.currentTurn?.phase === 'TURN_END'
          ? activeRound.turnCursor + 1
          : resolveDrawerTurnCursor(
              activeRound.drawerOrder,
              action.payload.drawerSessionId,
              activeRound.turnCursor,
            )
      const nextRound = {
        ...activeRound,
        roundNo: action.payload.roundNo,
        turnCursor: nextTurnCursor,
        drawerOrder: activeRound.drawerOrder,
      }
      const turnNo =
        state.room.currentTurn?.phase === 'TURN_END'
          ? state.room.currentTurn.turnNo + 1
          : nextTurnCursor + 1

      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: action.payload.gameId,
          currentRound: nextRound,
          currentTurn: {
            roundNo: action.payload.roundNo,
            turnNo,
            turnId: action.payload.turnId,
            drawerSessionId: action.payload.drawerSessionId,
            phase: 'READY',
            remainingSec: action.payload.remainingSec,
            deadlineAtMs: createDeadlineAtMs(action.payload.remainingSec),
            correctSessionIds: [],
            earnedPoints: {},
            wordChoices: [],
            selectedWord: null,
            answerLength: undefined,
            canvasStrokes: [],
          },
          chat: [
            ...state.room.chat,
            createSystemMessage(`209 GE_TURN_STARTED ${action.payload.drawerSessionId}`),
          ],
        },
      }
    }
    case 'server/geGuessCorrectApplied': {
      if (!state.room.currentTurn) {
        return state
      }

      const alreadyCorrect = state.room.currentTurn.correctSessionIds.includes(action.payload.sessionId)
      const correctSessionIds = alreadyCorrect
        ? state.room.currentTurn.correctSessionIds
        : [...state.room.currentTurn.correctSessionIds, action.payload.sessionId]
      const correctNickname =
        state.room.participants.find((participant) => participant.sessionId === action.payload.sessionId)?.nickname ??
        action.payload.sessionId

      return {
        ...state,
        room: {
          ...state.room,
          gameId: action.payload.gameId,
          currentTurn: {
            ...state.room.currentTurn,
            correctSessionIds,
          },
          chat: alreadyCorrect
            ? state.room.chat
            : [...state.room.chat, createCorrectAnswerAlertMessage(correctNickname)],
        },
      }
    }
    case 'server/geWordChoiceOpenedApplied': {
      const activeRound = resolveRunningRoundSummary(state)
      const nextTurnCursor = resolveDrawerTurnCursor(
        activeRound.drawerOrder,
        action.payload.drawerSessionId,
        activeRound.turnCursor,
      )
      const nextRound = {
        ...activeRound,
        turnCursor: nextTurnCursor,
      }
      const turnNo = nextTurnCursor + 1
      const turnId =
        state.room.currentTurn &&
        state.room.currentTurn.roundNo === nextRound.roundNo &&
        state.room.currentTurn.turnNo === turnNo
          ? state.room.currentTurn.turnId
          : createGeTurnId(state.room.gameId, nextRound.roundNo, turnNo)

      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RUNNING',
          currentRound: nextRound,
          currentTurn: {
            roundNo: nextRound.roundNo,
            turnNo,
            turnId,
            drawerSessionId: action.payload.drawerSessionId,
            phase: 'WORD_CHOICE',
            remainingSec: action.payload.remainingSec,
            deadlineAtMs: createDeadlineAtMs(action.payload.remainingSec),
            correctSessionIds: [],
            earnedPoints: {},
            wordChoices: action.payload.wordChoices,
            selectedWord: null,
            answerLength: undefined,
            canvasStrokes: state.room.currentTurn?.canvasStrokes ?? [],
          },
          chat: [
            ...state.room.chat,
            createSystemMessage(`203 GE_WORD_CHOICE_OPEN ${action.payload.drawerSessionId}`),
          ],
        },
      }
    }
    case 'server/geDrawingStartedApplied': {
      const activeRound = resolveRunningRoundSummary(state)
      const previousTurn = state.room.currentTurn
      const turnNo = previousTurn?.turnNo ?? activeRound.turnCursor + 1
      const turnId = previousTurn?.turnId ?? createGeTurnId(action.payload.gameId, activeRound.roundNo, turnNo)
      const selectedWord = action.payload.selectedWord ?? previousTurn?.selectedWord ?? null
      const answerLength =
        action.payload.answerLength ??
        (selectedWord ? Array.from(selectedWord).length : previousTurn?.answerLength)

      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: action.payload.gameId,
          currentRound: activeRound,
          currentTurn: {
            roundNo: activeRound.roundNo,
            turnNo,
            turnId,
            drawerSessionId: action.payload.drawerSessionId,
            phase: 'DRAWING',
            remainingSec: action.payload.remainingSec,
            deadlineAtMs: createDeadlineAtMs(action.payload.remainingSec),
            correctSessionIds: previousTurn?.correctSessionIds ?? [],
            earnedPoints: previousTurn?.earnedPoints ?? {},
            wordChoices: previousTurn?.wordChoices ?? [],
            selectedWord,
            answerLength,
            canvasStrokes: [],
          },
          chat: [
            ...state.room.chat,
            createSystemMessage(`208 GE_DRAWING_STARTED ${action.payload.drawerSessionId}`),
          ],
        },
      }
    }
    case 'server/geTurnEndedApplied': {
      if (!state.room.currentTurn) {
        return state
      }

      const currentDrawerSessionId = state.room.currentTurn.drawerSessionId
      const nextParticipants = applyEarnedPointsToParticipants(
        state.room.participants,
        action.payload.earnedPoints,
      )
      const correctSessionIds = Array.from(
        new Set([
          ...state.room.currentTurn.correctSessionIds,
          ...Object.keys(action.payload.earnedPoints).filter(
            (sessionId) => sessionId !== currentDrawerSessionId,
          ),
        ]),
      )
      const answer = action.payload.answer ?? state.room.currentTurn.selectedWord
      const answerLength =
        answer !== null ? Array.from(answer).length : state.room.currentTurn.answerLength
      const currentRound = state.room.currentRound
      const nextRound = currentRound
        ? {
            ...currentRound,
            drawerOrder: currentRound.drawerOrder.filter(
              (sessionId) => sessionId !== currentDrawerSessionId,
            ),
          }
        : null

      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: action.payload.gameId,
          participants: nextParticipants,
          currentRound: nextRound,
          currentTurn: {
            ...state.room.currentTurn,
            turnId: action.payload.turnId,
            phase: 'TURN_END',
            remainingSec: 0,
            deadlineAtMs: undefined,
            correctSessionIds,
            earnedPoints: action.payload.earnedPoints,
            selectedWord: answer,
            answerLength,
          },
          chat: [...state.room.chat, createSystemMessage(`205 GE_TURN_ENDED ${action.payload.reason}`)],
        },
      }
    }
    case 'server/geGameResultApplied': {
      const nextParticipants = applyTotalPointsToParticipants(
        state.room.participants,
        action.payload.totalPoints,
      )

      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RESULT',
          gameId: action.payload.gameId,
          participants: nextParticipants,
          currentTurn: null,
          chat: [...state.room.chat, createSystemMessage(`206 GE_GAME_RESULT ${action.payload.resultSec}s`)],
        },
      }
    }
    case 'server/geReturnToLobbyApplied':
      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'LOBBY',
          gameId: null,
          currentRound: null,
          currentTurn: null,
          lobbyCanvasStrokes: [],
          participants: resetParticipantsForLobby(state.room.participants),
          chat: [
            ...state.room.chat,
            createSystemMessage(
              action.payload.restartSec !== undefined
                ? `207 GE_RETURN_TO_LOBBY ${action.payload.reason} ${action.payload.restartSec}s`
                : `207 GE_RETURN_TO_LOBBY ${action.payload.reason}`,
            ),
          ],
        },
      }
    case 'server/wordChoiceApplied':
      if (!state.room.currentTurn) {
        return state
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: {
            ...state.room.currentTurn,
            phase: 'DRAWING',
            selectedWord: action.payload.selectedWord,
            remainingSec: action.payload.remainingSec,
            deadlineAtMs: createDeadlineAtMs(action.payload.remainingSec),
            earnedPoints: {},
          },
          chat: action.payload.chatMessage
            ? [...state.room.chat, action.payload.chatMessage]
            : state.room.chat,
        },
      }
    case 'server/chatReceived':
      {
        const senderSessionId = action.payload.senderSessionId
        const senderNickname = senderSessionId
          ? state.room.participants.find((participant) => participant.sessionId === senderSessionId)?.nickname
          : undefined
        const resolvedNickname = senderNickname ?? '알수없음'
        const isMine = senderSessionId === state.session.sessionId

        return {
          ...state,
          room: {
            ...state.room,
            chat: [
              ...state.room.chat,
              {
                ...action.payload,
                nickname: resolvedNickname,
                mine: isMine,
              },
            ],
          },
        }
      }
    case 'server/canvasStrokeReceived':
      if (!state.room.currentTurn) {
        return {
          ...state,
          room: {
            ...state.room,
            lobbyCanvasStrokes: [...(state.room.lobbyCanvasStrokes ?? []), action.payload],
          },
        }
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: {
            ...state.room.currentTurn,
            canvasStrokes: [...state.room.currentTurn.canvasStrokes, action.payload],
          },
        },
      }
    case 'server/canvasStrokesReceived':
      if (action.payload.length === 0) {
        return state
      }

      if (!state.room.currentTurn) {
        return {
          ...state,
          room: {
            ...state.room,
            lobbyCanvasStrokes: [...(state.room.lobbyCanvasStrokes ?? []), ...action.payload],
          },
        }
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: {
            ...state.room.currentTurn,
            canvasStrokes: [...state.room.currentTurn.canvasStrokes, ...action.payload],
          },
        },
      }
    case 'server/canvasCleared':
      if (!state.room.currentTurn) {
        return {
          ...state,
          room: {
            ...state.room,
            lobbyCanvasStrokes: [],
          },
        }
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: {
            ...state.room.currentTurn,
            canvasStrokes: [],
          },
          chat: [...state.room.chat, createSystemMessage('402 CANVAS_CLEAR')],
        },
      }
    case 'server/gameEndedApplied':
      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RESULT',
          currentTurn: null,
          chat: [...state.room.chat, createSystemMessage('307 GAME_ENDED')],
        },
      }
    case 'dev/turnPhaseForced':
      if (!state.room.currentTurn) {
        return state
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: createForcedTurn(state.room.currentTurn, action.payload, state.room.settings),
        },
      }
    case 'dev/mockFlowAdvanced':
      if (!state.room.currentTurn || !state.room.currentRound) {
        return state
      }

      if (state.room.currentTurn.phase !== 'TURN_END') {
        const nextPhase: TurnPhase =
          state.room.currentTurn.phase === 'WORD_CHOICE' ? 'DRAWING' : 'TURN_END'

        return {
          ...state,
          room: {
            ...state.room,
            currentTurn: createForcedTurn(state.room.currentTurn, nextPhase, state.room.settings),
          },
        }
      }

      const currentRound = state.room.currentRound
      const nextCursor = currentRound.turnCursor + 1
      const hasNextTurn = nextCursor < currentRound.drawerOrder.length

      if (hasNextTurn) {
        const nextTurnNo = state.room.currentTurn.turnNo + 1
        const nextDrawerSessionId = currentRound.drawerOrder[nextCursor]

        return {
          ...state,
          room: {
            ...state.room,
            currentRound: {
              ...currentRound,
              turnCursor: nextCursor,
            },
            currentTurn: createMockTurn(
              currentRound.roundNo,
              nextTurnNo,
              nextDrawerSessionId,
              'WORD_CHOICE',
              state.room.settings,
            ),
          },
        }
      }

      const hasNextRound = currentRound.roundNo < currentRound.totalRounds

      if (hasNextRound) {
        const nextRoundNo = currentRound.roundNo + 1

        return {
          ...state,
          room: {
            ...state.room,
            currentRound: {
              ...currentRound,
              roundNo: nextRoundNo,
              turnCursor: 0,
            },
            currentTurn: createMockTurn(
              nextRoundNo,
              1,
              currentRound.drawerOrder[0],
              'WORD_CHOICE',
              state.room.settings,
            ),
            chat: [
              ...state.room.chat,
              createSystemMessage(`306 ROUND_ENDED R${currentRound.roundNo}`),
              createSystemMessage(`303 ROUND_STARTED R${nextRoundNo}`),
            ],
          },
        }
      }

      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RESULT',
          currentTurn: null,
          chat: [...state.room.chat, createSystemMessage('307 GAME_ENDED')],
        },
      }
    default:
      return state
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState)
  const stateRef = useRef(state)
  const inboundStrokeQueueRef = useRef<CanvasStroke[]>([])
  const inboundStrokeFlushRafRef = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const server = useMemo<AppStateContextValue['server']>(
    () => ({
      applyRoomSnapshot: (snapshot) => dispatch({ type: 'server/roomSnapshotApplied', payload: snapshot }),
      applyGameStarted: (payload) => dispatch({ type: 'server/gameStartedApplied', payload }),
      applyWordChoice: (payload) => dispatch({ type: 'server/wordChoiceApplied', payload }),
      applyCanvasStroke: (stroke) => dispatch({ type: 'server/canvasStrokeReceived', payload: stroke }),
      applyCanvasClear: () => dispatch({ type: 'server/canvasCleared' }),
      applyGameEnded: () => dispatch({ type: 'server/gameEndedApplied' }),
    }),
    [],
  )

  const flushInboundStrokeQueue = useCallback(() => {
    inboundStrokeFlushRafRef.current = null
    const pending = inboundStrokeQueueRef.current
    if (pending.length === 0) {
      return
    }

    inboundStrokeQueueRef.current = []
    dispatch({ type: 'server/canvasStrokesReceived', payload: pending })
  }, [])

  const clearInboundStrokeQueue = useCallback(() => {
    inboundStrokeQueueRef.current = []
    if (inboundStrokeFlushRafRef.current !== null) {
      window.cancelAnimationFrame(inboundStrokeFlushRafRef.current)
      inboundStrokeFlushRafRef.current = null
    }
  }, [])

  const enqueueInboundStroke = useCallback(
    (stroke: CanvasStroke) => {
      inboundStrokeQueueRef.current.push(stroke)

      if (inboundStrokeFlushRafRef.current !== null) {
        return
      }

      inboundStrokeFlushRafRef.current = window.requestAnimationFrame(flushInboundStrokeQueue)
    },
    [flushInboundStrokeQueue],
  )

  const handleServerEnvelope = useCallback(
    (envelope: Envelope<unknown, number>) => {
      const payload = envelope.p

      switch (envelope.e) {
        case 200: {
          const gameStartedPayload = decodeGeGameStartedPayload(payload)
          if (gameStartedPayload) {
            dispatch({ type: 'server/geGameStartedApplied', payload: gameStartedPayload })
          }
          return
        }
        case 202: {
          const roundStartedPayload = decodeGeRoundStartedPayload(payload)
          if (roundStartedPayload) {
            dispatch({ type: 'server/geRoundStartedApplied', payload: roundStartedPayload })
          }
          return
        }
        case 209: {
          const turnStartedPayload = decodeGeTurnStartedPayload(payload)
          if (turnStartedPayload) {
            dispatch({ type: 'server/geTurnStartedApplied', payload: turnStartedPayload })
          }
          return
        }
        case 210: {
          const guessCorrectPayload = decodeGeGuessCorrectPayload(payload)
          if (guessCorrectPayload) {
            dispatch({ type: 'server/geGuessCorrectApplied', payload: guessCorrectPayload })
          }
          return
        }
        case 203: {
          const wordChoiceOpenedPayload = decodeGeWordChoiceOpenedPayload(payload)
          if (wordChoiceOpenedPayload) {
            dispatch({ type: 'server/geWordChoiceOpenedApplied', payload: wordChoiceOpenedPayload })
          }
          return
        }
        case 208: {
          const drawingStartedPayload = decodeGeDrawingStartedPayload(payload)
          if (drawingStartedPayload) {
            dispatch({ type: 'server/geDrawingStartedApplied', payload: drawingStartedPayload })
          }
          return
        }
        case 205: {
          const turnEndedPayload = decodeGeTurnEndedPayload(payload)
          if (turnEndedPayload) {
            dispatch({ type: 'server/geTurnEndedApplied', payload: turnEndedPayload })
          }
          return
        }
        case 206: {
          const gameResultPayload = decodeGeGameResultPayload(payload)
          if (gameResultPayload) {
            dispatch({ type: 'server/geGameResultApplied', payload: gameResultPayload })
          }
          return
        }
        case 207: {
          clearInboundStrokeQueue()
          const returnToLobbyPayload = decodeGeReturnToLobbyPayload(payload)
          if (returnToLobbyPayload) {
            dispatch({ type: 'server/geReturnToLobbyApplied', payload: returnToLobbyPayload })
          }
          return
        }
        case 300:
        case 408:
          if (payload && typeof payload === 'object') {
            const normalizedRoomSnapshot = decodeSnapshotEnvelopePayload(payload, stateRef.current)
            if (normalizedRoomSnapshot) {
              if (normalizedRoomSnapshot.ownSessionId !== stateRef.current.session.sessionId) {
                dispatch({
                  type: 'local/sessionIdSynced',
                  payload: normalizedRoomSnapshot.ownSessionId,
                })
              }
              dispatch({ type: 'local/joinAccepted' })
              server.applyRoomSnapshot(normalizedRoomSnapshot.roomSnapshot)
            }
          }
          return
        case 301: {
          const roomJoinedPayload = decodeRoomJoinedPayload(payload)
          if (roomJoinedPayload) {
            dispatch({ type: 'server/roomJoinedApplied', payload: roomJoinedPayload })
          }
          return
        }
        case 302: {
          const roomLeftPayload = decodeRoomLeftPayload(payload)
          if (roomLeftPayload) {
            dispatch({ type: 'server/roomLeftApplied', payload: roomLeftPayload })
            return
          }

          if (payload && typeof payload === 'object') {
            server.applyGameStarted(payload as ServerGameStartedPayload)
          }
          return
        }
        case 107:
        case 308: {
          const nextSettings = decodeSettingsUpdatePayload(payload, stateRef.current.room.settings)
          if (nextSettings) {
            dispatch({ type: 'local/lobbySettingsPatched', payload: nextSettings })
            return
          }

          if (payload && typeof payload === 'object') {
            const normalizedRoomSnapshot = normalizeRoomSnapshotPayload(payload, stateRef.current)
            if (normalizedRoomSnapshot) {
              server.applyRoomSnapshot(normalizedRoomSnapshot.roomSnapshot)
            }
          }
          return
        }
        case 310:
          if (payload && typeof payload === 'object') {
            server.applyWordChoice(payload as ServerWordChoicePayload)
          }
          return
        case 1999:
          clearInboundStrokeQueue()
          dispatch({ type: 'local/joinFailed', payload: decodeJoinFailedPayload(payload) })
          return
        case 204: {
          const guessMessage = decodeGuessSubmittedMessage(payload)
          if (guessMessage) {
            dispatch({ type: 'server/chatReceived', payload: guessMessage })
          }
          return
        }
        case 201:
          {
            if (isCanvasClearPayload(payload)) {
              clearInboundStrokeQueue()
              server.applyCanvasClear()
              return
            }

            const stroke = decodeCompactStroke(payload)
            if (stroke) {
              enqueueInboundStroke(stroke)
            }
          }
          return
        case 402:
          clearInboundStrokeQueue()
          server.applyCanvasClear()
          return
        case 307:
          server.applyGameEnded()
          return
        default:
          return
      }
    },
    [clearInboundStrokeQueue, enqueueInboundStroke, server],
  )

  useEffect(() => {
    return () => {
      clearInboundStrokeQueue()
    }
  }, [clearInboundStrokeQueue])

  const sendClientEvent = useCallback(
    <TPayload,>(eventName: ClientEventName, payload: TPayload, fallback?: () => void) => {
      const code = clientEventCodeByName.get(eventName)

      if (!code) {
        fallback?.()
        return
      }

      const envelope: Envelope<TPayload, ClientEventCode> = {
        e: code,
        p: payload,
      }

      const sent = wsSessionManager.send(JSON.stringify(envelope))
      if (!sent) {
        console.warn('[ws:out] dropped (socket not open)', { eventName, payload })
        fallback?.()
      }
    },
    [],
  )

  useEffect(() => {
    const unsubscribe = wsSessionManager.subscribe((event) => {
      if (event.type === 'status') {
        dispatch({ type: 'connection/statusChanged', payload: event.status })
        return
      }

      if (event.type === 'error') {
        const connectionError = decodeConnectionErrorPayload(event.error)
        if (connectionError) {
          clearInboundStrokeQueue()
          dispatch({ type: 'local/connectionErrorReported', payload: connectionError })
        }
        return
      }

      try {
        const parsed = decodeInboundEnvelope(event.data)
        if (!parsed) {
          return
        }

        handleServerEnvelope(parsed)
      } catch (error) {
        console.error('[ws:in] invalid payload', error)
        return
      }
    })

    return () => {
      unsubscribe()
    }
  }, [handleServerEnvelope])

  const value = useMemo<AppStateContextValue>(() => {
    return {
      state,
      actions: {
        updateNickname: (nickname) =>
          dispatch({ type: 'local/sessionNicknameUpdated', payload: nickname }),
        requestJoin: (options) => {
          if (stateRef.current.session.joinPending || stateRef.current.session.joinAccepted) {
            return
          }
          const normalizedRoomCode = options?.roomCode?.trim()
          dispatch({
            type: 'local/joinRequested',
            payload: {
              roomCode: normalizedRoomCode && normalizedRoomCode.length > 0 ? normalizedRoomCode : undefined,
              action: options?.action === 1 ? 1 : 0,
            },
          })
        },
        dismissJoinError: () => {
          dispatch({ type: 'local/joinErrorDismissed' })
        },
        dismissConnectionError: () => {
          dispatch({ type: 'local/connectionErrorDismissed' })
        },
        clearRoomCache: () => {
          clearInboundStrokeQueue()
          dispatch({ type: 'local/roomCacheCleared' })
        },
        patchLobbySettings: (settings) => {
          if (stateRef.current.room.hostSessionId !== stateRef.current.session.sessionId) {
            return
          }

          dispatch({ type: 'local/lobbySettingsPatched', payload: settings })

          const nextSettings: GameSettings = {
            ...stateRef.current.room.settings,
            ...settings,
          }

          sendClientEvent('GAME_SETTINGS_UPDATE_REQUEST', encodeCompactGameSettings(nextSettings))
        },
        requestGameStart: () => {
          sendClientEvent(
            'GAME_START_REQUEST',
            {
              // roomCode: stateRef.current.room.roomCode,
            },
            () => server.applyGameStarted(createMockGameStartedPayload(stateRef.current)),
          )
        },
        requestWordChoice: (word) => {
          const wordChoices = stateRef.current.room.currentTurn?.wordChoices ?? []
          const choiceIndex = wordChoices.findIndex((candidate) => candidate === word)
          sendClientEvent(
            'WORD_CHOICE',
            { choiceIndex: choiceIndex >= 0 ? choiceIndex : 0 },
            () =>
              server.applyWordChoice({
                selectedWord: word,
                remainingSec: stateRef.current.room.settings.drawSec,
                chatMessage: createSystemMessage(`310 DRAWING_STARTED (${word})`),
              }),
          )
        },
        submitGuess: (text) => {
          dispatch({ type: 'local/guessSubmitted', payload: text })
          sendClientEvent('GUESS_SUBMIT', {
            t: text,
            // tid: stateRef.current.room.currentTurn?.turnId ?? null,
          })
        },
        sendCanvasStroke: (stroke) => {
          sendClientEvent('DRAW_STROKE', encodeCompactStroke(stroke))
        },
        requestCanvasClear: () => {
          clearInboundStrokeQueue()
          server.applyCanvasClear()
          sendClientEvent(
            'DRAW_STROKE',
            CANVAS_CLEAR_MARKER,
          )
        },
      },
      connection: {
        setStatus: (status) => dispatch({ type: 'connection/statusChanged', payload: status }),
      },
      server,
      devTools: {
        forceTurnPhase: (phase) => dispatch({ type: 'dev/turnPhaseForced', payload: phase }),
        advanceMockFlow: () => dispatch({ type: 'dev/mockFlowAdvanced' }),
        finishGame: () => {
          server.applyGameEnded()
        },
        resetToLobby: () => {
          server.applyRoomSnapshot(createLobbySnapshot(state))
        },
      },
    }
  }, [clearInboundStrokeQueue, sendClientEvent, server, state])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
