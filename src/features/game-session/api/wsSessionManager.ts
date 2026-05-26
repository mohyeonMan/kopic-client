import type { ConnectionStatus } from '@/entities/game/model'
import {
  normalizeLobbyRouteError,
  requestLobbyRoute,
} from '@/features/game-session/api/lobbyRouteClient'
import type {
  LobbyRouteFailure,
  LobbyRouteKind,
  LobbyRouteRequest,
} from '@/features/game-session/api/lobbyRouteClient'

type SessionEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'message'; data: string }
  | { type: 'error'; error: unknown }
  | { type: 'join-error'; error: LobbyRouteFailure }

type SessionSubscriber = (event: SessionEvent) => void

const WS_OWNER_GAME_SESSION = 'route-game-session'
const WS_CLOSE_GRACE_MS = 300
const WS_HEARTBEAT_MS = 10000
const JOIN_SUCCESS_TIMEOUT_MS = 3000
const JOIN_RETRY_DELAY_MS = 1000
const JOIN_MAX_ATTEMPTS = 3
const WS_BASE_PATH = resolveWsBasePath()
const APP_MAIN_ROUTE = WS_BASE_PATH || '/'

let ws: WebSocket | null = null
let closeGraceTimer: number | null = null
let heartbeatTimer: number | null = null
let joinSuccessTimer: number | null = null
let joinRetryTimer: number | null = null
let connectSequence = 0
let pendingConnectId: number | null = null
let joinAttemptCount = 0
let joinAccepted = false
let currentStatus: ConnectionStatus = 'idle'
let currentNickname: string | null = null
let currentRoomCode: string | null = null
let currentAction: 0 | 1 | null = null

const owners = new Set<string>()
const subscribers = new Set<SessionSubscriber>()

function normalizeNickname(nickname: string | null | undefined) {
  const trimmed = nickname?.trim()
  return trimmed ? trimmed : null
}

function normalizeRoomCode(roomCode: string | null | undefined) {
  const trimmed = roomCode?.trim()
  return trimmed ? trimmed : null
}

function normalizeRoutePath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

function normalizeJoinAction(action: 0 | 1 | null | undefined): 0 | 1 | null {
  if (action === null || action === undefined) {
    return null
  }

  return action === 1 ? 1 : 0
}

function resolveWsBasePath() {
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

  return `${WS_BASE_PATH}/ws`
}

function createBrowserWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  if (import.meta.env.DEV) {
    const url = new URL(window.location.href)
    url.protocol = protocol
    url.port = import.meta.env.VITE_WS_PORT?.trim() || '8080'
    url.pathname = resolveWsPath()
    url.search = ''
    url.hash = ''
    return url
  }

  return new URL(`${protocol}//${window.location.host}${resolveWsPath()}`)
}

function resolveWsUrl(routeToken: string) {
  const configuredUrl = import.meta.env.VITE_WS_URL?.trim()
  const url = configuredUrl
    ? new URL(configuredUrl)
    : typeof window === 'undefined'
      ? new URL('ws://localhost:8080/ws')
      : createBrowserWsUrl()

  url.search = ''
  url.searchParams.set('routeToken', routeToken)
  return url.toString()
}

function publish(event: SessionEvent) {
  subscribers.forEach((subscriber) => subscriber(event))
}

function setStatus(status: ConnectionStatus) {
  if (currentStatus === status) {
    return
  }

  currentStatus = status
  publish({ type: 'status', status })
}

function clearCloseGraceTimer() {
  if (closeGraceTimer !== null) {
    window.clearTimeout(closeGraceTimer)
    closeGraceTimer = null
  }
}

function clearHeartbeatTimer() {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

function clearJoinSuccessTimer() {
  if (joinSuccessTimer !== null) {
    window.clearTimeout(joinSuccessTimer)
    joinSuccessTimer = null
  }
}

function clearJoinRetryTimer() {
  if (joinRetryTimer !== null) {
    window.clearTimeout(joinRetryTimer)
    joinRetryTimer = null
  }
}

function invalidatePendingConnect() {
  connectSequence += 1
  pendingConnectId = null
}

function closeCurrentSocket() {
  const current = ws
  ws = null
  if (current) {
    current.close()
  }
}

function resetJoinAttemptState() {
  clearJoinSuccessTimer()
  clearJoinRetryTimer()
  invalidatePendingConnect()
  joinAttemptCount = 0
}

function startHeartbeat(socket: WebSocket) {
  clearHeartbeatTimer()

  heartbeatTimer = window.setInterval(() => {
    if (ws !== socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send('{"e":1}')
  }, WS_HEARTBEAT_MS)
}

function isPongMessage(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { e?: unknown }
    return parsed?.e === 2
  } catch {
    return false
  }
}

function resolveLobbyRouteKind(): LobbyRouteKind {
  if (currentAction === 1) {
    return 'private-create'
  }

  if (currentRoomCode) {
    return 'private-join'
  }

  return 'quick'
}

function createLobbyRouteRequest(): LobbyRouteRequest | null {
  if (!currentNickname) {
    return null
  }

  const kind = resolveLobbyRouteKind()
  if (kind === 'private-join') {
    return {
      kind,
      nickname: currentNickname,
      roomCode: currentRoomCode ?? undefined,
    }
  }

  return {
    kind,
    nickname: currentNickname,
  }
}

function createConnectionFailure(reason: string, message: string): LobbyRouteFailure {
  return { reason, message }
}

function handleJoinFinalFailure(failure: LobbyRouteFailure) {
  resetJoinAttemptState()
  clearHeartbeatTimer()
  closeCurrentSocket()
  owners.clear()
  joinAccepted = false
  setStatus('idle')
  publish({ type: 'join-error', error: failure })
}

function scheduleJoinRetry(failure: LobbyRouteFailure) {
  clearJoinSuccessTimer()
  clearHeartbeatTimer()
  closeCurrentSocket()
  invalidatePendingConnect()

  if (owners.size === 0) {
    setStatus('idle')
    return
  }

  if (joinAttemptCount >= JOIN_MAX_ATTEMPTS) {
    handleJoinFinalFailure(failure)
    return
  }

  clearJoinRetryTimer()
  setStatus('reconnecting')
  joinRetryTimer = window.setTimeout(() => {
    joinRetryTimer = null
    connectIfNeeded()
  }, JOIN_RETRY_DELAY_MS)
}

function startJoinSuccessTimer(socket: WebSocket) {
  clearJoinSuccessTimer()
  joinSuccessTimer = window.setTimeout(() => {
    if (ws !== socket || joinAccepted) {
      return
    }

    scheduleJoinRetry(createConnectionFailure(
      'JOIN_TIMEOUT',
      '입장 응답을 받지 못했습니다.',
    ))
  }, JOIN_SUCCESS_TIMEOUT_MS)
}

function handleSessionDisconnected() {
  resetJoinAttemptState()
  clearHeartbeatTimer()

  ws = null
  owners.clear()
  joinAccepted = false
  setStatus('idle')

  if (typeof window === 'undefined') {
    return
  }

  publish({
    type: 'error',
    error: {
      reason: 'SESSION_DISCONNECTED',
      message: '세션이 끊겼습니다.',
    },
  })

  if (normalizeRoutePath(window.location.pathname) === APP_MAIN_ROUTE) {
    return
  }

  window.history.pushState({}, '', APP_MAIN_ROUTE)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function closeNow() {
  resetJoinAttemptState()
  clearHeartbeatTimer()
  closeCurrentSocket()
  joinAccepted = false
  setStatus('idle')
}

async function connectIfNeeded() {
  if (owners.size === 0) {
    return
  }

  if (pendingConnectId !== null) {
    return
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const routeRequest = createLobbyRouteRequest()
  if (!routeRequest) {
    joinAttemptCount += 1
    scheduleJoinRetry(createConnectionFailure(
      'INVALID_NICKNAME',
      '닉네임을 입력해주세요.',
    ))
    return
  }

  clearJoinRetryTimer()
  setStatus(joinAttemptCount > 0 ? 'reconnecting' : 'connecting')

  const connectId = connectSequence + 1
  connectSequence = connectId
  pendingConnectId = connectId
  joinAttemptCount += 1

  let routeToken: string
  try {
    routeToken = await requestLobbyRoute(routeRequest)
  } catch (error) {
    if (pendingConnectId !== connectId) {
      return
    }

    pendingConnectId = null
    scheduleJoinRetry(normalizeLobbyRouteError(error))
    return
  }

  if (pendingConnectId !== connectId) {
    return
  }

  pendingConnectId = null
  if (owners.size === 0) {
    return
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  let next: WebSocket
  try {
    next = new WebSocket(resolveWsUrl(routeToken))
  } catch {
    scheduleJoinRetry(createConnectionFailure(
      'WS_CONNECTION_FAILED',
      '서버와 연결할 수 없습니다.',
    ))
    return
  }

  ws = next
  let opened = false
  let socketFailure: LobbyRouteFailure | null = null
  startJoinSuccessTimer(next)

  next.onopen = () => {
    if (ws !== next) {
      return
    }

    opened = true
    setStatus('synced')
    startHeartbeat(next)
  }

  next.onmessage = (event) => {
    if (ws !== next) {
      return
    }

    const data = String(event.data)
    if (isPongMessage(data)) {
      return
    }

    publish({ type: 'message', data })
  }

  next.onerror = (error) => {
    if (ws !== next) {
      return
    }

    socketFailure = createConnectionFailure(
      'WS_CONNECTION_FAILED',
      '서버와 연결할 수 없습니다.',
    )

    if (joinAccepted) {
      publish({ type: 'error', error })
    }
  }

  next.onclose = () => {
    if (ws !== next) {
      return
    }

    ws = null
    clearHeartbeatTimer()

    if (joinAccepted) {
      handleSessionDisconnected()
      return
    }

    scheduleJoinRetry(socketFailure ?? createConnectionFailure(
      opened ? 'JOIN_CONNECTION_CLOSED' : 'WS_CONNECTION_FAILED',
      opened ? '입장 연결이 종료되었습니다.' : '서버와 연결할 수 없습니다.',
    ))
  }
}

export const wsSessionOwner = {
  game: WS_OWNER_GAME_SESSION,
} as const

export const wsSessionManager = {
  acquire(owner: string, nickname?: string, roomCode?: string | null, action?: 0 | 1 | null) {
    const prevNickname = currentNickname
    const prevRoomCode = currentRoomCode
    const prevAction = currentAction
    const joinRequested = action !== undefined

    if (typeof nickname === 'string') {
      currentNickname = normalizeNickname(nickname)
    }
    if (roomCode !== undefined) {
      currentRoomCode = normalizeRoomCode(roomCode)
    }
    if (action !== undefined) {
      currentAction = normalizeJoinAction(action)
    }

    const routeParamsChanged =
      prevNickname !== currentNickname ||
      prevRoomCode !== currentRoomCode ||
      prevAction !== currentAction

    owners.add(owner)
    clearCloseGraceTimer()

    if (joinRequested && joinAccepted) {
      joinAccepted = false
    }

    if (routeParamsChanged && !joinAccepted) {
      resetJoinAttemptState()
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        closeCurrentSocket()
      }
    }

    connectIfNeeded()
  },
  release(owner: string) {
    owners.delete(owner)

    if (owners.size > 0) {
      return
    }

    clearCloseGraceTimer()
    resetJoinAttemptState()
    closeGraceTimer = window.setTimeout(() => {
      closeGraceTimer = null
      if (owners.size === 0) {
        closeNow()
      }
    }, WS_CLOSE_GRACE_MS)
  },
  send(payload: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false
    }

    ws.send(payload)
    return true
  },
  subscribe(subscriber: SessionSubscriber) {
    subscribers.add(subscriber)
    subscriber({ type: 'status', status: currentStatus })

    return () => {
      subscribers.delete(subscriber)
    }
  },
  markJoinAccepted() {
    joinAccepted = true
    resetJoinAttemptState()
  },
  retryJoinAfterServerReject(failure: LobbyRouteFailure) {
    if (joinAccepted || owners.size === 0) {
      return false
    }

    scheduleJoinRetry(failure)
    return true
  },
  clearJoinConnectParams() {
    currentRoomCode = null
    currentAction = null
  },
}
