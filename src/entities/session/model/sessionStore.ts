/**
 * sessionStore
 *
 * 책임:
 * - 여러 feature가 읽어야 하는 session client state 보관
 * - join 요청/성공/실패의 전역 projection 제공
 *
 * 넣으면 안 되는 것:
 * - modal open 같은 UI 상태
 * - join form 입력 중간값
 * - API/WS 호출 로직
 * - server response raw payload
 *
 * 의존:
 * - Zustand
 * - session entity types
 *
 * 사용 위치:
 * - entry-join feature
 * - game-session feature
 * - game route guard
 */
import { create } from 'zustand'
import type {
  JoinSessionAccepted,
  JoinSessionRequest,
  SessionConnectionStatus,
  SessionError,
  SessionState,
  SessionStatus,
} from '@/entities/session/model/sessionTypes'

type SessionStore = SessionState & {
  setStatus: (status: SessionStatus) => void
  setConnectionStatus: (status: SessionConnectionStatus) => void
  startJoin: (request: JoinSessionRequest) => void
  acceptJoin: (accepted: JoinSessionAccepted) => void
  failJoin: (error: SessionError) => void
  reportConnectionError: (error: SessionError) => void
  dismissJoinError: () => void
  dismissConnectionError: () => void
  resetSession: () => void
}

const initialSessionState: SessionState = {
  status: 'idle',
  connectionStatus: 'idle',
  sessionId: null,
  nickname: '',
  roomCode: null,
  activeJoinRequest: null,
  joinError: null,
  connectionError: null,
}

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialSessionState,
  setStatus: (status) => set({ status }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  startJoin: (request) =>
    set({
      status: 'joining',
      connectionStatus: 'connecting',
      sessionId: null,
      nickname: request.nickname,
      roomCode: request.roomCode ?? null,
      activeJoinRequest: request,
      joinError: null,
      connectionError: null,
    }),
  acceptJoin: (accepted) =>
    set((state) => ({
      status: 'joined',
      connectionStatus: 'connected',
      sessionId: accepted.sessionId,
      nickname: state.activeJoinRequest?.nickname ?? state.nickname,
      roomCode: accepted.roomCode,
      activeJoinRequest: null,
      joinError: null,
      connectionError: null,
    })),
  failJoin: (joinError) =>
    set((state) => ({
      status: 'idle',
      connectionStatus: 'disconnected',
      sessionId: null,
      nickname: state.activeJoinRequest?.nickname ?? state.nickname,
      roomCode: null,
      activeJoinRequest: null,
      joinError,
    })),
  reportConnectionError: (connectionError) =>
    set((state) => ({
      status: state.status === 'joined' ? 'disconnected' : 'idle',
      connectionStatus: 'disconnected',
      sessionId: state.status === 'joined' ? state.sessionId : null,
      activeJoinRequest: null,
      connectionError,
    })),
  dismissJoinError: () => set({ joinError: null }),
  dismissConnectionError: () => set({ connectionError: null }),
  resetSession: () => set(initialSessionState),
}))
