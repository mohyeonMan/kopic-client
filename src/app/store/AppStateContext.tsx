import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import {
  type AppState,
  type CanvasStroke,
  type DrawingTool,
  type ChatMessage,
  type ConnectionStatus,
  defaultSettings,
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
  type ServerGameStartedPayload,
  type ServerWordChoicePayload,
} from './appStateContextValue'
import {
  clientEventMeta,
  type ClientEventCode,
  type Envelope,
} from '../../ws/protocol/events'
import { wsSessionManager } from '../../ws/client/wsSessionManager'

type AppAction =
  | { type: 'local/sessionNicknameUpdated'; payload: string }
  | { type: 'local/sessionIdSynced'; payload: string }
  | { type: 'local/joinRequested' }
  | { type: 'local/joinAccepted' }
  | { type: 'local/roomCacheCleared' }
  | { type: 'local/lobbySettingsPatched'; payload: Partial<GameSettings> }
  | { type: 'local/guessSubmitted'; payload: string }
  | { type: 'connection/statusChanged'; payload: ConnectionStatus }
  | { type: 'server/roomSnapshotApplied'; payload: RoomSnapshot }
  | { type: 'server/roomJoinedApplied'; payload: ServerRoomJoinedPayload }
  | { type: 'server/roomLeftApplied'; payload: ServerRoomLeftPayload }
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
type ServerRoomJoinedPayload = {
  sessionId: string
  nickname: string
  joinedAt?: number
}
type ServerRoomLeftPayload = {
  sessionId: string
  nickname?: string
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
    id: crypto.randomUUID(),
    tool,
    color: colorHex,
    size,
    points: normalizedPoints,
  }
}

function createSystemMessage(text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    nickname: 'system',
    text,
    tone: 'system',
  }
}

function createPresenceMessage(nickname: string, joined: boolean): ChatMessage {
  return {
    id: crypto.randomUUID(),
    nickname: '알림',
    text: `${nickname} 님이 ${joined ? '입장' : '퇴장'} 하셨습니다`,
    tone: 'guess',
    createdAt: Date.now(),
  }
}

function decodeGuessSubmittedMessage(payload: unknown): ChatMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, sessionId, t, text } = payload as {
    sid?: unknown
    sessionId?: unknown
    t?: unknown
    text?: unknown
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
    id: crypto.randomUUID(),
    nickname: '알수없음',
    text: rawText.slice(0, 50),
    tone: 'guess',
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

function readJoinedAt(value: unknown): number | undefined {
  const numeric = readFiniteNumber(value)
  if (numeric !== undefined) {
    return numeric
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return undefined
    }

    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      return asNumber
    }

    const asDate = Date.parse(trimmed)
    if (Number.isFinite(asDate)) {
      return asDate
    }
  }

  return undefined
}

function sortParticipantsByJoinedAt(participants: Participant[]): Participant[] {
  return participants
    .slice()
    .sort((left, right) => {
      if (left.joinedAt !== right.joinedAt) {
        return left.joinedAt - right.joinedAt
      }

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
  return value === 'WORD_CHOICE' || value === 'DRAWING' || value === 'TURN_END'
}

function normalizeGameSettings(raw: unknown, fallback: GameSettings): GameSettings {
  if (!isRecord(raw)) {
    return fallback
  }

  const readInt = (value: unknown, current: number, min = 1) => {
    const next = readFiniteNumber(value)
    if (next === undefined) {
      return current
    }

    return Math.max(min, Math.round(next))
  }

  const drawerOrderMode =
    raw.drawerOrderMode === 'JOIN_ORDER' || raw.drawerOrderMode === 'RANDOM'
      ? raw.drawerOrderMode
      : fallback.drawerOrderMode

  const endMode =
    raw.endMode === 'FIRST_CORRECT' || raw.endMode === 'TIME_OR_ALL_CORRECT'
      ? raw.endMode
      : fallback.endMode

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
    id: readNonEmptyString(raw.id) ?? crypto.randomUUID(),
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
      joinedAt:
        readJoinedAt(participant.joinedAt) ??
        readFiniteNumber(participant.joinOrder) ??
        index + 1,
      isHost:
        typeof participant.isHost === 'boolean'
          ? participant.isHost
          : sessionId === hostSessionId,
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

  return sortParticipantsByJoinedAt(nextParticipants)
}

function normalizeCurrentRound(
  raw: unknown,
  participants: Participant[],
  settings: GameSettings,
  fallback: RoundSummary | null,
): RoundSummary | null {
  if (raw === null) {
    return null
  }

  if (!isRecord(raw)) {
    return fallback
  }

  const defaultDrawerOrder = participants
    .slice()
    .sort((left, right) => left.joinedAt - right.joinedAt)
    .map((participant) => participant.sessionId)
  const parsedDrawerOrder = Array.isArray(raw.drawerOrder)
    ? raw.drawerOrder
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : []
  const drawerOrder = parsedDrawerOrder.length > 0 ? parsedDrawerOrder : defaultDrawerOrder

  return {
    roundNo: readFiniteNumber(raw.roundNo) ?? fallback?.roundNo ?? 1,
    totalRounds: readFiniteNumber(raw.totalRounds) ?? settings.roundCount,
    turnCursor: readFiniteNumber(raw.turnCursor) ?? fallback?.turnCursor ?? 0,
    drawerOrder,
  }
}

function normalizeCurrentTurn(
  raw: unknown,
  settings: GameSettings,
  fallback: TurnSummary | null,
  participants: Participant[],
): TurnSummary | null {
  if (raw === null) {
    return null
  }

  if (!isRecord(raw)) {
    return fallback
  }

  const fallbackDrawerSessionId =
    fallback?.drawerSessionId ??
    participants.slice().sort((left, right) => left.joinedAt - right.joinedAt)[0]?.sessionId ??
    'unknown'
  const drawerSessionId =
    readNonEmptyString(raw.drawerSessionId) ??
    readNonEmptyString(raw.drawerUserId) ??
    fallbackDrawerSessionId
  const phase = isTurnPhase(raw.phase) ? raw.phase : fallback?.phase ?? 'WORD_CHOICE'
  const correctSessionIdsSource = Array.isArray(raw.correctSessionIds)
    ? raw.correctSessionIds
    : Array.isArray(raw.correctUserIds)
      ? raw.correctUserIds
      : []
  const wordChoices = Array.isArray(raw.wordChoices)
    ? raw.wordChoices
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : fallback?.wordChoices ?? getWordChoices(settings.wordChoiceCount)
  const canvasStrokes = Array.isArray(raw.canvasStrokes)
    ? raw.canvasStrokes
        .map(normalizeCanvasStroke)
        .filter((stroke): stroke is CanvasStroke => stroke !== null)
    : fallback?.canvasStrokes ?? []

  return {
    roundNo: readFiniteNumber(raw.roundNo) ?? fallback?.roundNo ?? 1,
    turnNo: readFiniteNumber(raw.turnNo) ?? fallback?.turnNo ?? 1,
    turnId:
      readNonEmptyString(raw.turnId) ??
      fallback?.turnId ??
      `turn-r${readFiniteNumber(raw.roundNo) ?? 1}-${readFiniteNumber(raw.turnNo) ?? 1}`,
    drawerSessionId,
    phase,
    remainingSec:
      readFiniteNumber(raw.remainingSec) ??
      (phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0),
    correctSessionIds: correctSessionIdsSource
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
    wordChoices,
    selectedWord:
      raw.selectedWord === null
        ? null
        : readNonEmptyString(raw.selectedWord) ?? fallback?.selectedWord ?? null,
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

    const tone =
      item.tone === 'system' || item.tone === 'guess' || item.tone === 'correct'
        ? item.tone
        : 'guess'
    const message: ChatMessage = {
      id: readNonEmptyString(item.id) ?? crypto.randomUUID(),
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

  const currentRoom = state.room
  const hostSessionId =
    readNonEmptyString(payload.hostSessionId) ??
    readNonEmptyString(payload.hostUserId) ??
    currentRoom.hostSessionId
  const roomState = isRoomState(payload.roomState) ? payload.roomState : currentRoom.roomState
  const hasParticipants = Object.prototype.hasOwnProperty.call(payload, 'participants')
  const participants = hasParticipants
    ? normalizeParticipants(payload.participants, hostSessionId, roomState)
    : currentRoom.participants
  const ownSessionId = resolveOwnSessionIdFromSnapshotPayload(payload, participants, state)
  const settings = normalizeGameSettings(payload.settings, currentRoom.settings)
  const hasCurrentRound = Object.prototype.hasOwnProperty.call(payload, 'currentRound')
  const hasCurrentTurn = Object.prototype.hasOwnProperty.call(payload, 'currentTurn')
  const hasCurrentCanvas = Object.prototype.hasOwnProperty.call(payload, 'currentCanvas')
  const currentCanvasStrokes = hasCurrentCanvas
    ? normalizeSnapshotCanvasStrokes(payload.currentCanvas)
    : null
  const currentRound = hasCurrentRound
    ? normalizeCurrentRound(payload.currentRound, participants, settings, currentRoom.currentRound)
    : currentRoom.currentRound
  const currentTurn = hasCurrentTurn
    ? normalizeCurrentTurn(payload.currentTurn, settings, currentRoom.currentTurn, participants)
    : currentRoom.currentTurn
  const normalizedCurrentTurn =
    currentCanvasStrokes && currentTurn
      ? {
          ...currentTurn,
          canvasStrokes: currentCanvasStrokes,
        }
      : currentTurn
  const lobbyCanvasStrokes = Array.isArray(payload.lobbyCanvasStrokes)
    ? payload.lobbyCanvasStrokes
        .map(normalizeCanvasStroke)
        .filter((stroke): stroke is CanvasStroke => stroke !== null)
    : currentCanvasStrokes
      ? currentCanvasStrokes
    : currentRoom.lobbyCanvasStrokes ?? []
  const chat = normalizeChatMessages(payload.chat, ownSessionId, currentRoom.chat)

  return {
    ownSessionId,
    roomSnapshot: {
      ...currentRoom,
      roomId: readNonEmptyString(payload.roomId) ?? currentRoom.roomId,
      roomCode: readNonEmptyString(payload.roomCode) ?? currentRoom.roomCode,
      roomType: payload.roomType === 'PRIVATE' ? 'PRIVATE' : currentRoom.roomType,
      hostSessionId,
      participants,
      lobbyCanvasStrokes,
      settings,
      roomState,
      gameId:
        payload.gameId === null
          ? null
          : readNonEmptyString(payload.gameId) ?? currentRoom.gameId,
      currentRound,
      currentTurn: normalizedCurrentTurn,
      chat,
    },
  }
}

function decodeSnapshotEnvelopePayload(
  payload: unknown,
  state: AppState,
  envelopeRoomIdHint?: string,
): { roomSnapshot: RoomSnapshot; ownSessionId: string } | null {
  if (!isRecord(payload)) {
    return null
  }

  const explicitSessionId =
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.sessionId) ??
    readNonEmptyString(payload.mySid) ??
    readNonEmptyString(payload.mySessionId)
  const explicitRoomId =
    readNonEmptyString(payload.rid) ??
    readNonEmptyString(payload.roomId) ??
    envelopeRoomIdHint
  const snapshotPayload = isRecord(payload.snap) ? payload.snap : payload
  const normalizedSnapshotPayload =
    explicitRoomId && readNonEmptyString(snapshotPayload.roomId) === undefined
      ? { ...snapshotPayload, roomId: explicitRoomId }
      : snapshotPayload
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
    .sort((left, right) => left.joinedAt - right.joinedAt)
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

  return {
    roundNo,
    turnNo,
    turnId: `turn-r${roundNo}-${turnNo}`,
    drawerSessionId,
    phase,
    remainingSec: phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0,
    correctSessionIds: phase === 'TURN_END' ? turnEndCorrectSessionIds : [],
    wordChoices,
    selectedWord: phase === 'WORD_CHOICE' ? null : wordChoices[0],
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
    settings: { ...defaultSettings },
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
      canvasStrokes: currentTurn.canvasStrokes,
    }
  }

  if (phase === 'TURN_END') {
    return {
      ...nextTurn,
      selectedWord: currentTurn.selectedWord ?? currentTurn.wordChoices[0] ?? nextTurn.selectedWord,
      wordChoices: currentTurn.wordChoices,
      canvasStrokes: currentTurn.canvasStrokes,
    }
  }

  return nextTurn
}

function decodeRoomJoinedPayload(payload: unknown): ServerRoomJoinedPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, sessionId, nickname, n, joinedAt } = payload as {
    sid?: unknown
    sessionId?: unknown
    nickname?: unknown
    n?: unknown
    joinedAt?: unknown
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
    joinedAt: readJoinedAt(joinedAt),
  }
}

function decodeRoomLeftPayload(payload: unknown): ServerRoomLeftPayload | null {
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

  return {
    sessionId: participantSessionId.trim(),
    nickname:
      typeof nickname === 'string' && nickname.trim().length > 0
        ? nickname.trim()
        : typeof n === 'string' && n.trim().length > 0
          ? n.trim()
          : undefined,
  }
}

function createClearedRoomState(state: AppState): RoomSnapshot {
  return {
    ...state.room,
    hostSessionId: state.session.sessionId,
    participants: [],
    lobbyCanvasStrokes: [],
    settings: { ...defaultSettings },
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
        },
      }
    case 'local/roomCacheCleared':
      return {
        ...state,
        session: {
          ...state.session,
          joinPending: false,
          joinAccepted: false,
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
              id: crypto.randomUUID(),
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
      if (action.payload === 'idle' || action.payload === 'reconnecting') {
        return {
          ...state,
          connectionStatus: action.payload,
          session: {
            ...state.session,
            joinPending: false,
            joinAccepted: false,
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
            ? sortParticipantsByJoinedAt(action.payload.participants)
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
        const updatedParticipants = sortParticipantsByJoinedAt(
          state.room.participants.map((participant) =>
            participant.sessionId === action.payload.sessionId
              ? {
                  ...participant,
                  nickname: action.payload.nickname,
                  joinedAt: action.payload.joinedAt ?? participant.joinedAt,
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
      const maxJoinedAt = state.room.participants.reduce(
        (max, participant) => Math.max(max, participant.joinedAt),
        0,
      )

      const joinedParticipant: Participant = {
        sessionId: action.payload.sessionId,
        nickname: action.payload.nickname,
        joinedAt: action.payload.joinedAt ?? maxJoinedAt + 1,
        isHost: false,
        score: 0,
        isOnline: true,
        joinOrder: maxJoinOrder + 1,
        joinedMidRound: state.room.roomState === 'RUNNING',
      }

      return {
        ...state,
        room: {
          ...state.room,
          participants: sortParticipantsByJoinedAt([...state.room.participants, joinedParticipant]),
          chat: [...state.room.chat, createPresenceMessage(action.payload.nickname, true)],
        },
      }
    }
    case 'server/roomLeftApplied': {
      const leftParticipant = state.room.participants.find(
        (participant) => participant.sessionId === action.payload.sessionId,
      )
      const leftNickname = leftParticipant?.nickname ?? action.payload.nickname

      return {
        ...state,
        room: {
          ...state.room,
          participants: state.room.participants.filter(
            (participant) => participant.sessionId !== action.payload.sessionId,
          ),
          currentRound: state.room.currentRound
            ? {
                ...state.room.currentRound,
                drawerOrder: state.room.currentRound.drawerOrder.filter(
                  (sessionId) => sessionId !== action.payload.sessionId,
                ),
              }
            : null,
          currentTurn: state.room.currentTurn
            ? {
                ...state.room.currentTurn,
                correctSessionIds: state.room.currentTurn.correctSessionIds.filter(
                  (sessionId) => sessionId !== action.payload.sessionId,
                ),
              }
            : null,
          chat: leftNickname
            ? [...state.room.chat, createPresenceMessage(leftNickname, false)]
            : state.room.chat,
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
        case 300:
        case 408:
          if (payload && typeof payload === 'object') {
            const normalizedRoomSnapshot = decodeSnapshotEnvelopePayload(
              payload,
              stateRef.current,
              typeof envelope.rid === 'string' ? envelope.rid : undefined,
            )
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
        case 308:
          if (payload && typeof payload === 'object') {
            const normalizedRoomSnapshot = normalizeRoomSnapshotPayload(payload, stateRef.current)
            if (normalizedRoomSnapshot) {
              server.applyRoomSnapshot(normalizedRoomSnapshot.roomSnapshot)
            }
          }
          return
        case 310:
          if (payload && typeof payload === 'object') {
            server.applyWordChoice(payload as ServerWordChoicePayload)
          }
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
        console.error('[ws] transport error', event.error)
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
          dispatch({ type: 'local/sessionNicknameUpdated', payload: nickname.trim() || 'Guest' }),
        requestJoin: () => {
          if (stateRef.current.session.joinPending || stateRef.current.session.joinAccepted) {
            return
          }
          dispatch({ type: 'local/joinRequested' })
        },
        clearRoomCache: () => {
          clearInboundStrokeQueue()
          dispatch({ type: 'local/roomCacheCleared' })
        },
        patchLobbySettings: (settings) => {
          sendClientEvent('GAME_SETTINGS_UPDATE_REQUEST', settings, () =>
            dispatch({ type: 'local/lobbySettingsPatched', payload: settings }),
          )
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
          sendClientEvent(
            'WORD_CHOICE',
            { word },
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
