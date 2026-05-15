/**
 * gameSessionApi
 *
 * 책임:
 * - game session WebSocket resource 연결
 * - join request를 서버 연결 URL/query로 mapping
 * - 서버 join/room presence 관련 envelope를 domain event로 변환
 *
 * 주의:
 * - raw WebSocket event를 UI에 직접 전달하지 않음
 * - Zustand store를 직접 변경하지 않음
 * - route 변경을 수행하지 않음
 *
 * 의존:
 * - game snapshot normalizer
 * - shared WebSocket transport
 * - session entity request/accepted/error shape
 *
 * 사용 위치:
 * - useGameSessionJoin
 */
import { normalizeSnapshotEnvelopePayload } from '@/entities/game/api/roomSnapshotNormalizer'
import {
  CANVAS_CLEAR_MARKER,
  decodeCompactStroke,
  encodeCompactStroke,
  isCanvasClearPayload,
} from '@/entities/game/api/canvasStrokeProtocol'
import { encodeCompactGameSettings } from '@/entities/game/api/gameSettingsProtocol'
import { normalizeChatMessage } from '@/entities/game/api/chatMessageNormalizer'
import type {
  CanvasStroke,
  DrawingStartedPayload,
  GameSettings,
  GameResultPayload,
  GameStartedPayload,
  GuessCorrectPayload,
  ReturnToLobbyPayload,
  RoomLeftPayload,
  RoomPresencePayload,
  RoundStartedPayload,
  TurnEndedPayload,
  TurnStartedPayload,
  WordChoiceOpenedPayload,
} from '@/entities/game/model/gameTypes'
import type { SessionError } from '@/entities/session/model/sessionTypes'
import { createWsTransportConnection } from '@/shared/api/ws/wsTransport'
import type {
  GameSessionConnection,
  GameSessionEvent,
  OpenGameSessionArgs,
} from '@/features/game-session/model/gameSessionTypes'

type ServerEnvelope = {
  e: number
  p?: unknown
}

const HEARTBEAT_INTERVAL_MS = 10_000

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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

function readPointsMap(value: unknown) {
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

function normalizeWsBasePath() {
  const baseUrl = import.meta.env.BASE_URL ?? '/'
  if (!baseUrl || baseUrl === '/') {
    return ''
  }

  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function resolveWsPath() {
  const configuredPath = import.meta.env.VITE_WS_PATH?.trim()
  if (configuredPath) {
    return configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`
  }

  const basePath = normalizeWsBasePath()
  return basePath ? `${basePath}/ws` : '/ws'
}

function resolveJoinUrl(request: OpenGameSessionArgs['request']) {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    const url = new URL('ws://localhost:8080/ws')
    url.searchParams.set('nickname', request.nickname)
    url.searchParams.set('action', String(request.action))
    url.searchParams.set('geId', import.meta.env.VITE_GE_ID?.trim() || 'ge-local')
    if (request.roomCode) {
      url.searchParams.set('roomCode', request.roomCode)
    }

    return url.toString()
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = new URL(`${protocol}://${window.location.host}${resolveWsPath()}`)
  const queryToken = new URLSearchParams(window.location.search).get('token')
  const storageToken =
    window.localStorage.getItem('token') ??
    window.localStorage.getItem('accessToken') ??
    window.sessionStorage.getItem('token') ??
    window.sessionStorage.getItem('accessToken')
  const token = queryToken ?? storageToken

  if (token) {
    url.searchParams.set('token', token)
  }
  if (request.roomCode) {
    url.searchParams.set('roomCode', request.roomCode)
  }

  url.searchParams.set('action', String(request.action))
  url.searchParams.set('geId', import.meta.env.VITE_GE_ID?.trim() || 'ge-local')
  url.searchParams.set('nickname', request.nickname)

  return url.toString()
}

function decodeEnvelope(raw: string): ServerEnvelope | null {
  const trimmed = raw.trim()

  const parse = (source: string) => {
    try {
      const parsed = JSON.parse(source) as ServerEnvelope
      return typeof parsed?.e === 'number' ? parsed : null
    } catch {
      return null
    }
  }

  const parsed = parse(trimmed)
  if (parsed) {
    return parsed
  }

  const lastBraceIndex = trimmed.lastIndexOf('}')
  if (lastBraceIndex < 0) {
    return null
  }

  return parse(trimmed.slice(0, lastBraceIndex + 1))
}

function decodeRoomJoined(payload: unknown): RoomPresencePayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const sessionId =
    readNonEmptyString(payload.sid) ?? readNonEmptyString(payload.sessionId)
  const nickname = readNonEmptyString(payload.n) ?? readNonEmptyString(payload.nickname)

  if (!sessionId || !nickname) {
    return null
  }

  return {
    sessionId,
    nickname,
    colorIndex: normalizeColorIndex(payload.colorIndex ?? payload.ci ?? payload.color ?? payload.c),
  }
}

function decodeRoomLeft(payload: unknown): RoomLeftPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const sessionId = readNonEmptyString(payload.sid) ?? readNonEmptyString(payload.sessionId)
  if (!sessionId) {
    return null
  }

  return {
    sessionId,
    nextHostSessionId:
      readNonEmptyString(payload.nextHostSid) ??
      readNonEmptyString(payload.nextHostSessionId) ??
      (isRecord(payload.nextHost)
        ? readNonEmptyString(payload.nextHost.sid) ??
          readNonEmptyString(payload.nextHost.sessionId) ??
          readNonEmptyString(payload.nextHost.userId)
        : readNonEmptyString(payload.nextHost)),
  }
}

function decodeJoinFailed(payload: unknown): SessionError {
  if (!isRecord(payload)) {
    return {
      reason: 'JOIN_FAILED',
      message: '방 입장에 실패했습니다.',
    }
  }

  const reason = readNonEmptyString(payload.reason) ?? 'JOIN_FAILED'
  const message = readNonEmptyString(payload.message)
  if (message) {
    return { reason, message }
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

function decodeGameStarted(payload: unknown): GameStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  if (!gameId) {
    return null
  }

  return {
    gameId,
    gameStartSec:
      readFiniteNumber(payload.gameStartSec) ?? readFiniteNumber(payload.startSec) ?? undefined,
  }
}

function decodeRoundStarted(payload: unknown): RoundStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const roundNo = readFiniteNumber(payload.round) ?? readFiniteNumber(payload.roundNo)
  const drawerSessionIds =
    normalizeStringArray(payload.drawerSids).length > 0
      ? normalizeStringArray(payload.drawerSids)
      : normalizeStringArray(payload.drawerSessionIds)

  if (!gameId || roundNo === undefined || drawerSessionIds.length === 0) {
    return null
  }

  return {
    gameId,
    roundNo,
    drawerSessionIds,
    roundStartSec:
      readFiniteNumber(payload.roundStartSec) ?? readFiniteNumber(payload.startSec) ?? undefined,
  }
}

function decodeTurnStarted(payload: unknown): TurnStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const roundNo = readFiniteNumber(payload.round) ?? readFiniteNumber(payload.roundNo)
  const turnId = readNonEmptyString(payload.turn) ?? readNonEmptyString(payload.turnId)
  const drawerSessionId =
    readNonEmptyString(payload.drawerSid) ??
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.drawerSessionId)
  const remainingSec =
    readFiniteNumber(payload.turnStartSec) ?? readFiniteNumber(payload.remainingSec)

  if (!gameId || roundNo === undefined || !turnId || !drawerSessionId || remainingSec === undefined) {
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

function decodeWordChoiceOpened(payload: unknown): WordChoiceOpenedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const drawerSessionId =
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.drawerSid) ??
    readNonEmptyString(payload.drawerSessionId)
  const remainingSec =
    readFiniteNumber(payload.wordChoiceSec) ?? readFiniteNumber(payload.remainingSec)
  const wordChoices =
    normalizeStringArray(payload.words).length > 0
      ? normalizeStringArray(payload.words)
      : normalizeStringArray(payload.wordChoices)

  if (!drawerSessionId || remainingSec === undefined) {
    return null
  }

  return {
    drawerSessionId,
    remainingSec,
    wordChoices,
  }
}

function decodeDrawingStarted(payload: unknown): DrawingStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const drawerSessionId =
    readNonEmptyString(payload.drawerSid) ??
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.drawerSessionId)
  const remainingSec = readFiniteNumber(payload.drawSec) ?? readFiniteNumber(payload.remainingSec)

  if (!gameId || !drawerSessionId || remainingSec === undefined) {
    return null
  }

  const answerEntry = isRecord(payload.answerEntry) ? payload.answerEntry : null
  const answerEntryWord = answerEntry
    ? answerEntry.word === null
      ? null
      : readNonEmptyString(answerEntry.word) ?? null
    : undefined
  const selectedWord =
    payload.answer === null || answerEntryWord === null
      ? null
      : answerEntryWord ?? readNonEmptyString(payload.answer) ?? null
  const selectedWordDescription =
    answerEntry && Object.prototype.hasOwnProperty.call(answerEntry, 'description')
      ? answerEntry.description === null
        ? null
        : typeof answerEntry.description === 'string'
          ? answerEntry.description
          : undefined
      : payload.answerDescription === null
        ? null
        : typeof payload.answerDescription === 'string'
          ? payload.answerDescription
          : undefined

  return {
    gameId,
    drawerSessionId,
    remainingSec,
    selectedWord,
    selectedWordDescription,
    answerLength: readFiniteNumber(payload.answerLength),
    hintPattern:
      payload.hintPattern === null
        ? null
        : typeof payload.hintPattern === 'string'
          ? payload.hintPattern
          : undefined,
  }
}

function decodeGuessCorrect(payload: unknown): GuessCorrectPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const sessionId = readNonEmptyString(payload.sid) ?? readNonEmptyString(payload.sessionId)

  return gameId && sessionId ? { gameId, sessionId } : null
}

function decodeTurnEnded(payload: unknown): TurnEndedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid) ?? readNonEmptyString(payload.gameId)
  const turnId = readNonEmptyString(payload.turn) ?? readNonEmptyString(payload.turnId)
  const reason = readNonEmptyString(payload.reason)
  if (!gameId || !turnId || !reason) {
    return null
  }

  return {
    gameId,
    turnId,
    reason,
    answer: payload.answer === null ? null : readNonEmptyString(payload.answer) ?? null,
    earnedPoints: readPointsMap(payload.earnedPoints),
    turnEndSec: readFiniteNumber(payload.turnEndSec) ?? readFiniteNumber(payload.remainingSec),
  }
}

function decodeGameResult(payload: unknown): GameResultPayload | null {
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

function decodeReturnToLobby(payload: unknown): ReturnToLobbyPayload | null {
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

function normalizeColorIndex(value: unknown) {
  const colorIndex = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null
  return colorIndex !== null && colorIndex >= 1 && colorIndex <= 20 ? colorIndex : undefined
}

function emitEnvelopeEvent(envelope: ServerEnvelope, emit: (event: GameSessionEvent) => void) {
  if (envelope.e === 2) {
    return
  }

  if (envelope.e === 1999) {
    emit({ type: 'join-rejected', error: decodeJoinFailed(envelope.p) })
    return
  }

  if (envelope.e === 300 || envelope.e === 408) {
    const synced = normalizeSnapshotEnvelopePayload(envelope.p)
    if (synced && synced.ownSessionId && synced.roomSnapshot.roomCode) {
      emit({
        type: 'session-synced',
        payload: {
          sessionId: synced.ownSessionId,
          roomCode: synced.roomSnapshot.roomCode,
          roomSnapshot: synced.roomSnapshot,
        },
      })
    }
    return
  }

  if (envelope.e === 301) {
    const participant = decodeRoomJoined(envelope.p)
    if (participant) {
      emit({ type: 'participant-joined', payload: participant })
    }
    return
  }

  if (envelope.e === 302) {
    const participant = decodeRoomLeft(envelope.p)
    if (participant) {
      emit({ type: 'participant-left', payload: participant })
    }
    return
  }

  if (envelope.e === 200) {
    const payload = decodeGameStarted(envelope.p)
    if (payload) {
      emit({ type: 'game-started', payload })
    }
    return
  }

  if (envelope.e === 202) {
    const payload = decodeRoundStarted(envelope.p)
    if (payload) {
      emit({ type: 'round-started', payload })
    }
    return
  }

  if (envelope.e === 209) {
    const payload = decodeTurnStarted(envelope.p)
    if (payload) {
      emit({ type: 'turn-started', payload })
    }
    return
  }

  if (envelope.e === 203) {
    const payload = decodeWordChoiceOpened(envelope.p)
    if (payload) {
      emit({ type: 'word-choice-opened', payload })
    }
    return
  }

  if (envelope.e === 208) {
    const payload = decodeDrawingStarted(envelope.p)
    if (payload) {
      emit({ type: 'drawing-started', payload })
    }
    return
  }

  if (envelope.e === 210) {
    const payload = decodeGuessCorrect(envelope.p)
    if (payload) {
      emit({ type: 'guess-correct', payload })
    }
    return
  }

  if (envelope.e === 205) {
    const payload = decodeTurnEnded(envelope.p)
    if (payload) {
      emit({ type: 'turn-ended', payload })
    }
    return
  }

  if (envelope.e === 206) {
    const payload = decodeGameResult(envelope.p)
    if (payload) {
      emit({ type: 'game-result', payload })
    }
    return
  }

  if (envelope.e === 207) {
    const payload = decodeReturnToLobby(envelope.p)
    if (payload) {
      emit({ type: 'return-to-lobby', payload })
    }
    return
  }

  if (envelope.e === 201) {
    if (isCanvasClearPayload(envelope.p)) {
      emit({ type: 'canvas-cleared' })
      return
    }

    const stroke = decodeCompactStroke(envelope.p)
    if (stroke) {
      emit({ type: 'canvas-stroke', payload: stroke })
    }
    return
  }

  if (envelope.e === 402) {
    emit({ type: 'canvas-cleared' })
    return
  }

  if (envelope.e === 204 || envelope.e === 403) {
    const message = normalizeChatMessage({ payload: envelope.p })
    if (message) {
      emit({ type: 'chat-message', payload: message })
    }
  }
}

function createClientEnvelope(code: number, payload: unknown) {
  return JSON.stringify({ e: code, p: payload })
}

export function openGameSession({ request, onEvent }: OpenGameSessionArgs): GameSessionConnection {
  let heartbeatId: number | null = null
  const transport = createWsTransportConnection({
    url: resolveJoinUrl(request),
    onEvent: (event) => {
      if (event.type === 'open') {
        onEvent({ type: 'connected' })
        heartbeatId = window.setInterval(() => {
          transport.send('{"e":1}')
        }, HEARTBEAT_INTERVAL_MS)
        return
      }

      if (event.type === 'message') {
        const envelope = decodeEnvelope(event.data)
        if (envelope) {
          emitEnvelopeEvent(envelope, onEvent)
        }
        return
      }

      if (event.type === 'error') {
        onEvent({
          type: 'connection-error',
          error: {
            reason: 'CONNECTION_ERROR',
            message: '서버 연결 중 오류가 발생했습니다.',
          },
        })
        return
      }

      onEvent({
        type: 'disconnected',
        error: {
          reason: event.opened ? 'SESSION_DISCONNECTED' : 'CONNECTION_FAILED',
          message: event.opened ? '세션 연결이 끊겼습니다.' : '서버와 연결할 수 없습니다.',
        },
      })
    },
  })

  return {
    close: () => {
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId)
        heartbeatId = null
      }

      transport.close()
    },
    sendCanvasClear: () => transport.send(createClientEnvelope(201, CANVAS_CLEAR_MARKER)),
    sendCanvasStroke: (stroke: CanvasStroke) =>
      transport.send(createClientEnvelope(201, encodeCompactStroke(stroke))),
    sendGameStart: () => transport.send(createClientEnvelope(200, {})),
    sendGuess: (text: string) => transport.send(createClientEnvelope(204, { t: text })),
    sendSettingsUpdate: (settings: GameSettings) =>
      transport.send(createClientEnvelope(107, encodeCompactGameSettings(settings))),
    sendWordChoice: (choiceIndex: number) =>
      transport.send(createClientEnvelope(203, { choiceIndex })),
  }
}
