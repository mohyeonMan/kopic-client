import type { AppState, Participant, RoomSnapshot } from '../../../entities/game/model'
import {
  createHostChangedMessage,
  createPresenceMessage,
} from './appStateHelpers'
import type {
  ServerRoomJoinedPayload,
  ServerRoomLeftPayload,
} from './appStatePayloadDecoders'
import { sortParticipantsByJoinOrder } from './appStateSnapshot'

export function reduceRoomSnapshotApplied(
  state: AppState,
  snapshot: RoomSnapshot,
): AppState {
  return {
    ...state,
    room: {
      ...state.room,
      ...snapshot,
      participants: Array.isArray(snapshot.participants)
        ? sortParticipantsByJoinOrder(snapshot.participants)
        : state.room.participants,
      lobbyCanvasStrokes: Array.isArray(snapshot.lobbyCanvasStrokes)
        ? snapshot.lobbyCanvasStrokes
        : [],
      chat: Array.isArray(snapshot.chat)
        ? snapshot.chat
        : state.room.chat,
      settings: snapshot.settings ?? state.room.settings,
    },
  }
}

export function reduceRoomJoinedApplied(
  state: AppState,
  payload: ServerRoomJoinedPayload,
): AppState {
  if (state.room.participants.some((participant) => participant.sessionId === payload.sessionId)) {
    const updatedParticipants = sortParticipantsByJoinOrder(
      state.room.participants.map((participant) =>
        participant.sessionId === payload.sessionId
          ? {
              ...participant,
              nickname: payload.nickname,
              colorIndex: payload.colorIndex ?? participant.colorIndex,
              isHost: participant.sessionId === state.room.hostSessionId,
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
        chat: [...state.room.chat, createPresenceMessage(payload.nickname, true)],
      },
    }
  }

  const maxJoinOrder = state.room.participants.reduce(
    (max, participant) => Math.max(max, participant.joinOrder),
    0,
  )

  const joinedParticipant: Participant = {
    sessionId: payload.sessionId,
    nickname: payload.nickname,
    colorIndex: payload.colorIndex,
    isHost: payload.sessionId === state.room.hostSessionId,
    score: 0,
    isOnline: true,
    joinOrder: maxJoinOrder + 1,
    joinedMidRound: state.room.roomState === 'RUNNING',
  }

  return {
    ...state,
    room: {
      ...state.room,
      participants: sortParticipantsByJoinOrder([...state.room.participants, joinedParticipant]),
      chat: [...state.room.chat, createPresenceMessage(payload.nickname, true)],
    },
  }
}

export function reduceRoomLeftApplied(
  state: AppState,
  payload: ServerRoomLeftPayload,
): AppState {
  const leftParticipant = state.room.participants.find(
    (participant) => participant.sessionId === payload.sid,
  )
  const leftNickname = leftParticipant?.nickname ?? payload.sid
  const remainingParticipants = state.room.participants.filter(
    (participant) => participant.sessionId !== payload.sid,
  )
  const nextHostSessionId =
    payload.nextHostSid ??
    (state.room.hostSessionId === payload.sid
      ? remainingParticipants[0]?.sessionId
      : state.room.hostSessionId)
  const normalizedRemainingParticipants = remainingParticipants.map((participant) => ({
    ...participant,
    isHost: participant.sessionId === nextHostSessionId,
  }))
  const nextChat = leftNickname
    ? [...state.room.chat, createPresenceMessage(leftNickname, false)]
    : state.room.chat
  const finalChat =
    payload.nextHostSid
      ? [
          ...nextChat,
          createHostChangedMessage(
            normalizedRemainingParticipants.find(
              (participant) => participant.sessionId === payload.nextHostSid,
            )?.nickname ?? payload.nextHostSid,
          ),
        ]
      : nextChat

  return {
    ...state,
    room: {
      ...state.room,
      hostSessionId: nextHostSessionId ?? state.room.hostSessionId,
      participants: normalizedRemainingParticipants,
      currentRound: state.room.currentRound
        ? {
            ...state.room.currentRound,
            drawerOrder: state.room.currentRound.drawerOrder.filter(
              (sessionId) => sessionId !== payload.sid,
            ),
          }
        : null,
      currentTurn: state.room.currentTurn
        ? {
            ...state.room.currentTurn,
            correctSessionIds: state.room.currentTurn.correctSessionIds.filter(
              (sessionId) => sessionId !== payload.sid,
            ),
          }
        : null,
      chat: finalChat,
    },
  }
}
