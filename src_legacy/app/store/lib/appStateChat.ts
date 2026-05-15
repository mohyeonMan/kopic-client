import type { AppState, ChatMessage } from '../../../entities/game/model'
import { createUUID } from '../../utils/createUUID'
import { resolvePrivilegedChatVisibility } from './appStateSnapshot'

export function reduceGuessSubmitted(state: AppState, text: string): AppState {
  return {
    ...state,
    room: {
      ...state.room,
      chat: [
        ...state.room.chat,
        {
          id: createUUID(),
          nickname: state.session.nickname,
          text,
          tone: 'guess',
          privilegedVisible: resolvePrivilegedChatVisibility(
            'guess',
            state.room.currentTurn,
            state.session.sessionId,
            state.session.sessionId,
          ),
          senderSessionId: state.session.sessionId,
          mine: true,
          createdAt: Date.now(),
        },
      ],
    },
  }
}

export function reduceChatReceived(state: AppState, payload: ChatMessage): AppState {
  const senderSessionId = payload.senderSessionId
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
          ...payload,
          nickname: resolvedNickname,
          privilegedVisible:
            typeof payload.privilegedVisible === 'boolean'
              ? payload.privilegedVisible
              : resolvePrivilegedChatVisibility(
                  payload.tone,
                  state.room.currentTurn,
                  state.session.sessionId,
                  senderSessionId,
                ),
          mine: isMine,
        },
      ],
    },
  }
}
