import type { ConnectionStatus } from '../../app/store/mockAppState'

type SessionEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'message'; data: string }
  | { type: 'error'; error: unknown }

type SessionSubscriber = (event: SessionEvent) => void

const WS_OWNER_GAME_SESSION = 'route-game-session'
const WS_CLOSE_GRACE_MS = 300
const WS_HEARTBEAT_MS = 10000
const WS_ROOM_ID = 'room-01'
const WS_GE_ID = 'ge-01'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let closeGraceTimer: number | null = null
let heartbeatTimer: number | null = null
let reconnectAttempt = 0
let currentStatus: ConnectionStatus = 'idle'

const owners = new Set<string>()
const subscribers = new Set<SessionSubscriber>()

function resolveWsUrl() {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8080/ws'
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = new URL(`${protocol}://${window.location.hostname}:8080/ws`)
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
  url.searchParams.set('roomId', WS_ROOM_ID)
  url.searchParams.set('geId', WS_GE_ID)

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

function scheduleReconnect() {
  if (owners.size === 0) {
    setStatus('idle')
    return
  }

  clearReconnectTimer()
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
  const next = new WebSocket(resolveWsUrl())
  ws = next

  next.onopen = () => {
    if (ws !== next) {
      return
    }

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
    if (ws === next) {
      ws = null
    }
    clearHeartbeatTimer()

    scheduleReconnect()
  }
}

export const wsSessionOwner = {
  game: WS_OWNER_GAME_SESSION,
} as const

export const wsSessionManager = {
  acquire(owner: string) {
    owners.add(owner)
    clearCloseGraceTimer()
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
}
