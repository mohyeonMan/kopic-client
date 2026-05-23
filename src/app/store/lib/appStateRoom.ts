import type { AppState, Participant, RoomSnapshot } from '../../../entities/game/model'
import {
  createHostChangedMessage,
  createPresenceMessage,
} from '@/entities/game/api/gameProtocol'
import { appendGameSoundEvent } from '@/entities/game/model'
import type {
  ServerRoomJoinedPayload,
  ServerRoomLeftPayload,
} from '@/entities/game/api/gamePayloadDecoders'
import { sortParticipantsByJoinOrder } from '@/entities/game/api/roomSnapshotPayload'

export function reduceRoomSnapshotApplied(
  state: AppState,
  snapshot: RoomSnapshot,
): AppState {
  const nextParticipants = Array.isArray(snapshot.participants)
    ? sortParticipantsByJoinOrder(snapshot.participants)
    : state.room.participants
  const previousSessionIds = new Set(state.room.participants.map((participant) => participant.sessionId))
  const nextSessionIds = new Set(nextParticipants.map((participant) => participant.sessionId))
  const joinedSessionId =
    previousSessionIds.size > 0
      ? nextParticipants.find((participant) => !previousSessionIds.has(participant.sessionId))?.sessionId
      : undefined
  const leftSessionId = state.room.participants.find(
    (participant) => !nextSessionIds.has(participant.sessionId),
  )?.sessionId

  return {
    ...state,
    room: {
      ...state.room,
      ...snapshot,
      participants: nextParticipants,
      lobbyCanvasStrokes: Array.isArray(snapshot.lobbyCanvasStrokes)
        ? snapshot.lobbyCanvasStrokes
        : [],
      chat: Array.isArray(snapshot.chat)
        ? snapshot.chat
        : state.room.chat,
      settings: snapshot.settings ?? state.room.settings,
    },
    soundEvents:
      joinedSessionId
        ? appendGameSoundEvent(state.soundEvents, {
            id: `presence:${snapshot.roomId}:join:${joinedSessionId}:${state.room.participants.length}->${nextParticipants.length}`,
            sound: 'participantJoin',
          })
        : leftSessionId
          ? appendGameSoundEvent(state.soundEvents, {
              id: `presence:${snapshot.roomId}:leave:${leftSessionId}:${state.room.participants.length}->${nextParticipants.length}`,
              sound: 'participantLeave',
            })
          : state.soundEvents,
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
    soundEvents:
      state.room.participants.length > 0
        ? appendGameSoundEvent(state.soundEvents, {
            id: `presence:${state.room.roomId}:join:${payload.sessionId}:${state.room.participants.length}`,
            sound: 'participantJoin',
          })
        : state.soundEvents,
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
    soundEvents: leftParticipant
      ? appendGameSoundEvent(state.soundEvents, {
          id: `presence:${state.room.roomId}:leave:${payload.sid}:${state.room.participants.length}`,
          sound: 'participantLeave',
        })
      : state.soundEvents,
  }
}
