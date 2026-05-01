import type { ConnectionStatus } from '../../entities/game/model'
import { normalizeRoutePath, routes } from '../../app/router/routes'

type SessionEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'message'; data: string }
  | { type: 'error'; error: unknown }

type SessionSubscriber = (event: SessionEvent) => void

const WS_OWNER_GAME_SESSION = 'route-game-session'
const WS_CLOSE_GRACE_MS = 300
const WS_HEARTBEAT_MS = 10000
const WS_MAX_RECONNECT_ATTEMPTS = 3
const WS_GE_ID = 'ge-local'
const WS_BASE_PATH = resolveWsBasePath()

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let closeGraceTimer: number | null = null
let heartbeatTimer: number | null = null
let reconnectAttempt = 0
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

function normalizeJoinAction(action: 0 | 1 | null | undefined): 0 | 1 | null {
  if (action === null || action === undefined) {
    return null
  }

  return action === 1 ? 1 : 0
}

function resolveNickname() {
  if (currentNickname) {
    return currentNickname
  }

  return null
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

  return `${WS_BASE_PATH}/ws` || '/ws'
}

function resolveWsUrl() {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return 'ws://localhost:8080/ws'
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
  if (currentRoomCode) {
    url.searchParams.set('roomCode', currentRoomCode)
  }
  if (currentAction !== null) {
    url.searchParams.set('action', String(currentAction))
  }
  url.searchParams.set('geId', WS_GE_ID)
  const nickname = resolveNickname()
  if (nickname) {
    url.searchParams.set('nickname', nickname)
  }

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

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
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

function handleReconnectFailure() {
  clearReconnectTimer()
  clearHeartbeatTimer()

  const current = ws
  ws = null
  owners.clear()
  reconnectAttempt = 0
  setStatus('idle')

  if (current) {
    current.close()
  }

  if (typeof window === 'undefined') {
    return
  }

  publish({
    type: 'error',
    error: {
      reason: 'CONNECTION_FAILED',
      message: '서버와 연결할 수 없습니다.',
    },
  })

  if (normalizeRoutePath(window.location.pathname) === routes.main) {
    return
  }

  window.history.pushState({}, '', routes.main)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function handleSessionDisconnected() {
  clearReconnectTimer()
  clearHeartbeatTimer()

  ws = null
  owners.clear()
  reconnectAttempt = 0
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

  if (normalizeRoutePath(window.location.pathname) === routes.main) {
    return
  }

  window.history.pushState({}, '', routes.main)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function scheduleReconnect() {
  if (owners.size === 0) {
    setStatus('idle')
    return
  }

  clearReconnectTimer()

  if (reconnectAttempt >= WS_MAX_RECONNECT_ATTEMPTS) {
    handleReconnectFailure()
    return
  }

  setStatus('reconnecting')
  const delayMs = Math.min(1000 * 2 ** reconnectAttempt, 5000)
  reconnectAttempt += 1

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connectIfNeeded()
  }, delayMs)
}

function closeNow() {
  clearReconnectTimer()
  clearHeartbeatTimer()

  const current = ws
  ws = null
  if (current) {
    current.close()
  }

  reconnectAttempt = 0
  setStatus('idle')
}

function connectIfNeeded() {
  if (owners.size === 0) {
    return
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  setStatus('connecting')
  let next: WebSocket

  try {
    next = new WebSocket(resolveWsUrl())
  } catch (error) {
    publish({ type: 'error', error })
    scheduleReconnect()
    return
  }

  ws = next
  let opened = false

  next.onopen = () => {
    if (ws !== next) {
      return
    }

    opened = true
    reconnectAttempt = 0
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

    publish({ type: 'error', error })
  }

  next.onclose = () => {
    if (ws !== next) {
      return
    }

    ws = null
    clearHeartbeatTimer()

    if (opened) {
      handleSessionDisconnected()
      return
    }

    scheduleReconnect()
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

    if (typeof nickname === 'string') {
      currentNickname = normalizeNickname(nickname)
    }
    if (roomCode !== undefined) {
      currentRoomCode = normalizeRoomCode(roomCode)
    }
    if (action !== undefined) {
      currentAction = normalizeJoinAction(action)
    }

    const queryChanged =
      prevNickname !== currentNickname ||
      prevRoomCode !== currentRoomCode ||
      prevAction !== currentAction

    owners.add(owner)
    clearCloseGraceTimer()

    if (queryChanged && ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      closeNow()
    }

    connectIfNeeded()
  },
  release(owner: string) {
    owners.delete(owner)

    if (owners.size > 0) {
      return
    }

    clearCloseGraceTimer()
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
  clearJoinConnectParams() {
    currentRoomCode = null
    currentAction = null
  },
}
