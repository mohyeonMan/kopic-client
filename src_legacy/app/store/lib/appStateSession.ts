import type { AppState, ConnectionStatus } from '../../../entities/game/model'
import { createClearedRoomState } from './appStateFlow'

export function reduceSessionNicknameUpdated(state: AppState, nickname: string): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      nickname,
    },
    room: {
      ...state.room,
      participants: state.room.participants.map((participant) =>
        participant.sessionId === state.session.sessionId
          ? { ...participant, nickname }
          : participant,
      ),
    },
  }
}

export function reduceSessionIdSynced(state: AppState, sessionId: string): AppState {
  if (!sessionId || sessionId === state.session.sessionId) {
    return state
  }

  return {
    ...state,
    session: {
      ...state.session,
      sessionId,
    },
  }
}

export function reduceJoinRequested(
  state: AppState,
  payload?: { roomCode?: string; action?: 0 | 1 },
): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      joinPending: true,
      joinAccepted: false,
      joinRoomCode: payload?.roomCode,
      joinAction: payload?.action ?? 0,
      joinError: undefined,
      connectionError: undefined,
    },
    room: createClearedRoomState(state),
  }
}

export function reduceJoinAccepted(state: AppState): AppState {
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
}

export function reduceJoinFailed(
  state: AppState,
  payload: { reason: string; message: string },
): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      joinPending: false,
      joinAccepted: false,
      joinRoomCode: undefined,
      joinAction: undefined,
      joinError: payload,
      connectionError: state.session.connectionError,
    },
    room: createClearedRoomState(state),
  }
}

export function reduceJoinErrorDismissed(state: AppState): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      joinError: undefined,
    },
  }
}

export function reduceConnectionErrorReported(
  state: AppState,
  payload: { reason: string; message: string },
): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      joinPending: false,
      joinAccepted: false,
      joinRoomCode: undefined,
      joinAction: undefined,
      connectionError: payload,
    },
    room: createClearedRoomState(state),
  }
}

export function reduceConnectionErrorDismissed(state: AppState): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      connectionError: undefined,
    },
  }
}

export function reduceRoomCacheCleared(state: AppState): AppState {
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
}

export function reduceConnectionStatusChanged(
  state: AppState,
  status: ConnectionStatus,
): AppState {
  if (status === 'reconnecting') {
    return {
      ...state,
      connectionStatus: status,
    }
  }

  if (status === 'idle') {
    return {
      ...state,
      connectionStatus: status,
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
    connectionStatus: status,
  }
}
