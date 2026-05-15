/**
 * wsTransport
 *
 * 책임:
 * - domain 독립적인 WebSocket 연결 생성/해제/send primitive 제공
 * - browser WebSocket API의 이벤트를 작은 transport event로 변환
 *
 * 하지 않는 것:
 * - game/session protocol 해석
 * - reconnect 정책 결정
 * - route 변경
 * - Zustand store 변경
 *
 * 의존:
 * - browser WebSocket API
 *
 * 사용 위치:
 * - game-session API layer
 */
export type WsTransportEvent =
  | { type: 'open' }
  | { type: 'message'; data: string }
  | { type: 'error'; error: unknown }
  | { type: 'close'; opened: boolean }

export type WsTransportConnection = {
  close: () => void
  send: (payload: string) => boolean
}

type CreateWsTransportConnectionArgs = {
  url: string
  onEvent: (event: WsTransportEvent) => void
}

export function createWsTransportConnection({
  url,
  onEvent,
}: CreateWsTransportConnectionArgs): WsTransportConnection {
  const socket = new WebSocket(url)
  let opened = false
  let closedByClient = false

  socket.onopen = () => {
    opened = true
    onEvent({ type: 'open' })
  }

  socket.onmessage = (event) => {
    onEvent({ type: 'message', data: String(event.data) })
  }

  socket.onerror = (error) => {
    onEvent({ type: 'error', error })
  }

  socket.onclose = () => {
    if (closedByClient) {
      return
    }

    onEvent({ type: 'close', opened })
  }

  return {
    close: () => {
      closedByClient = true
      socket.close()
    },
    send: (payload) => {
      if (socket.readyState !== WebSocket.OPEN) {
        return false
      }

      socket.send(payload)
      return true
    },
  }
}

