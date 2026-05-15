/**
 * sessionTypes
 *
 * 책임:
 * - session entity의 client-side domain shape 정의
 * - join/game-session feature가 공유하는 상태 계약 제공
 *
 * 하지 않는 것:
 * - WebSocket 연결 관리
 * - join form 상태 관리
 * - API response shape 직접 노출
 *
 * 의존:
 * - 없음
 *
 * 사용 위치:
 * - sessionStore
 */
export type SessionStatus = 'idle' | 'joining' | 'joined' | 'disconnected'
export type SessionConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
export type JoinActionCode = 0 | 1

export type SessionError = {
  reason: string
  message: string
}

export type JoinSessionRequest = {
  nickname: string
  roomCode?: string
  action: JoinActionCode
}

export type JoinSessionAccepted = {
  sessionId: string
  roomCode: string
}

export type SessionState = {
  status: SessionStatus
  connectionStatus: SessionConnectionStatus
  sessionId: string | null
  nickname: string
  roomCode: string | null
  activeJoinRequest: JoinSessionRequest | null
  joinError: SessionError | null
  connectionError: SessionError | null
}
