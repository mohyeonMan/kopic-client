/**
 * gameStore
 *
 * 책임:
 * - 여러 game feature가 공유해야 하는 room/game projection 저장
 * - server snapshot/event가 정규화된 뒤 적용되는 단일 client state 제공
 *
 * 넣으면 안 되는 것:
 * - WebSocket 연결 객체
 * - API 호출 로직
 * - canvas pointer draft 같은 일시 상태
 * - modal/open 같은 UI 상태
 *
 * 의존:
 * - Zustand
 * - game entity types/defaults
 *
 * 사용 위치:
 * - game-session runtime
 * - room-lobby feature
 */
import { create } from 'zustand'
import { emptyRoomSnapshot } from '@/entities/game/model/gameDefaults'
import type {
  CanvasStroke,
  ChatMessage,
  DrawingStartedPayload,
  GameResultPayload,
  GameStartedPayload,
  GuessCorrectPayload,
  Participant,
  ReturnToLobbyPayload,
  RoomLeftPayload,
  RoomPresencePayload,
  RoomSnapshot,
  RoundStartedPayload,
  RoundSummary,
  TurnEndedPayload,
  TurnStartedPayload,
  WordChoiceOpenedPayload,
} from '@/entities/game/model/gameTypes'

type GameStore = {
  room: RoomSnapshot
  applyRoomSnapshot: (snapshot: RoomSnapshot) => void
  applyParticipantJoined: (payload: RoomPresencePayload) => void
  applyParticipantLeft: (payload: RoomLeftPayload) => void
  applyCanvasStroke: (stroke: CanvasStroke) => void
  applyCanvasStrokes: (strokes: CanvasStroke[]) => void
  clearCanvas: () => void
  patchSettings: (settings: Partial<RoomSnapshot['settings']>) => void
  appendChatMessage: (message: ChatMessage) => void
  applyGameStarted: (payload: GameStartedPayload) => void
  applyRoundStarted: (payload: RoundStartedPayload) => void
  applyTurnStarted: (payload: TurnStartedPayload) => void
  applyWordChoiceOpened: (payload: WordChoiceOpenedPayload) => void
  applyDrawingStarted: (payload: DrawingStartedPayload) => void
  applyGuessCorrect: (payload: GuessCorrectPayload) => void
  applyTurnEnded: (payload: TurnEndedPayload) => void
  applyGameResult: (payload: GameResultPayload) => void
  applyReturnToLobby: (payload: ReturnToLobbyPayload) => void
  resetRoom: () => void
}

function sortParticipants(participants: Participant[]) {
  return participants.slice().sort((left, right) => {
    if (left.joinOrder !== right.joinOrder) {
      return left.joinOrder - right.joinOrder
    }

    return left.sessionId.localeCompare(right.sessionId)
  })
}

function createDeadlineAtMs(remainingSec: number) {
  return remainingSec > 0 ? Date.now() + remainingSec * 1000 : undefined
}

function createTurnId(gameId: string | null, roundNo: number, turnNo: number) {
  return `game:${gameId ?? 'unknown'}:r${roundNo}:t${turnNo}`
}

function resolveDrawerOrder(participants: Participant[]) {
  return sortParticipants(participants)
    .filter((participant) => !participant.joinedMidRound)
    .map((participant) => participant.sessionId)
}

function resolveRunningRound(room: RoomSnapshot): RoundSummary {
  if (room.currentRound) {
    return room.currentRound
  }

  return {
    roundNo: 1,
    totalRounds: room.settings.roundCount,
    turnCursor: 0,
    drawerOrder: resolveDrawerOrder(room.participants),
  }
}

function resolveDrawerTurnCursor(
  drawerOrder: string[],
  drawerSessionId: string,
  fallbackTurnCursor: number,
) {
  const drawerIndex = drawerOrder.findIndex((sessionId) => sessionId === drawerSessionId)
  return drawerIndex >= 0 ? drawerIndex : fallbackTurnCursor
}

function applyPointsToParticipants(participants: Participant[], points: Record<string, number>) {
  if (Object.keys(points).length === 0) {
    return participants
  }

  return participants.map((participant) => ({
    ...participant,
    score: participant.score + (points[participant.sessionId] ?? 0),
  }))
}

function replaceParticipantScores(participants: Participant[], points: Record<string, number>) {
  if (Object.keys(points).length === 0) {
    return participants
  }

  return participants.map((participant) => ({
    ...participant,
    score: points[participant.sessionId] ?? participant.score,
  }))
}

export const useGameStore = create<GameStore>((set) => ({
  room: emptyRoomSnapshot,
  applyRoomSnapshot: (snapshot) =>
    set({
      room: {
        ...snapshot,
        participants: sortParticipants(snapshot.participants),
      },
    }),
  applyParticipantJoined: (payload) =>
    set((state) => {
      const exists = state.room.participants.some(
        (participant) => participant.sessionId === payload.sessionId,
      )
      const maxJoinOrder = state.room.participants.reduce(
        (max, participant) => Math.max(max, participant.joinOrder),
        0,
      )
      const participants = exists
        ? state.room.participants.map((participant) =>
            participant.sessionId === payload.sessionId
              ? {
                  ...participant,
                  nickname: payload.nickname,
                  colorIndex: payload.colorIndex ?? participant.colorIndex,
                  isOnline: true,
                  isHost: participant.sessionId === state.room.hostSessionId,
                }
              : participant,
          )
        : [
            ...state.room.participants,
            {
              sessionId: payload.sessionId,
              nickname: payload.nickname,
              colorIndex: payload.colorIndex,
              isHost: payload.sessionId === state.room.hostSessionId,
              score: 0,
              isOnline: true,
              joinOrder: maxJoinOrder + 1,
              joinedMidRound: state.room.roomState === 'RUNNING',
            },
          ]

      return {
        room: {
          ...state.room,
          participants: sortParticipants(participants),
        },
      }
    }),
  applyParticipantLeft: (payload) =>
    set((state) => {
      const remainingParticipants = state.room.participants.filter(
        (participant) => participant.sessionId !== payload.sessionId,
      )
      const nextHostSessionId =
        payload.nextHostSessionId ??
        (state.room.hostSessionId === payload.sessionId
          ? remainingParticipants[0]?.sessionId
          : state.room.hostSessionId)

      return {
        room: {
          ...state.room,
          hostSessionId: nextHostSessionId ?? state.room.hostSessionId,
          participants: sortParticipants(
            remainingParticipants.map((participant) => ({
              ...participant,
              isHost: participant.sessionId === nextHostSessionId,
            })),
          ),
        },
      }
    }),
  applyCanvasStroke: (stroke) =>
    set((state) => {
      if (state.room.roomState === 'RUNNING' && state.room.currentTurn) {
        return {
          room: {
            ...state.room,
            currentTurn: {
              ...state.room.currentTurn,
              canvasStrokes: [...state.room.currentTurn.canvasStrokes, stroke],
            },
          },
        }
      }

      return {
        room: {
          ...state.room,
          lobbyCanvasStrokes: [...state.room.lobbyCanvasStrokes, stroke],
        },
      }
    }),
  applyCanvasStrokes: (strokes) =>
    set((state) => {
      if (strokes.length === 0) {
        return state
      }

      if (state.room.roomState === 'RUNNING' && state.room.currentTurn) {
        return {
          room: {
            ...state.room,
            currentTurn: {
              ...state.room.currentTurn,
              canvasStrokes: [...state.room.currentTurn.canvasStrokes, ...strokes],
            },
          },
        }
      }

      return {
        room: {
          ...state.room,
          lobbyCanvasStrokes: [...state.room.lobbyCanvasStrokes, ...strokes],
        },
      }
    }),
  clearCanvas: () =>
    set((state) => {
      if (state.room.roomState === 'RUNNING' && state.room.currentTurn) {
        return {
          room: {
            ...state.room,
            currentTurn: {
              ...state.room.currentTurn,
              canvasStrokes: [],
            },
          },
        }
      }

      return {
        room: {
          ...state.room,
          lobbyCanvasStrokes: [],
        },
      }
    }),
  patchSettings: (settings) =>
    set((state) => ({
      room: {
        ...state.room,
        settings: {
          ...state.room.settings,
          ...settings,
        },
      },
    })),
  appendChatMessage: (message) =>
    set((state) => ({
      room: {
        ...state.room,
        chat: [...state.room.chat, message],
      },
    })),
  applyGameStarted: (payload) =>
    set((state) => ({
      room: {
        ...state.room,
        roomState: 'RUNNING',
        gameId: payload.gameId,
        currentRound: null,
        currentTurn: null,
        lobbyCanvasStrokes: [],
      },
    })),
  applyRoundStarted: (payload) =>
    set((state) => ({
      room: {
        ...state.room,
        roomState: 'RUNNING',
        gameId: payload.gameId,
        currentRound: {
          roundNo: payload.roundNo,
          totalRounds: state.room.settings.roundCount,
          turnCursor: 0,
          drawerOrder: payload.drawerSessionIds,
        },
        currentTurn: null,
        lobbyCanvasStrokes: [],
      },
    })),
  applyTurnStarted: (payload) =>
    set((state) => {
      const activeRound = resolveRunningRound(state.room)
      const nextTurnCursor =
        state.room.currentTurn?.phase === 'TURN_END'
          ? activeRound.turnCursor + 1
          : resolveDrawerTurnCursor(
              activeRound.drawerOrder,
              payload.drawerSessionId,
              activeRound.turnCursor,
            )
      const nextRound = {
        ...activeRound,
        roundNo: payload.roundNo,
        turnCursor: nextTurnCursor,
      }
      const turnNo =
        state.room.currentTurn?.phase === 'TURN_END'
          ? state.room.currentTurn.turnNo + 1
          : nextTurnCursor + 1

      return {
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: payload.gameId,
          currentRound: nextRound,
          currentTurn: {
            roundNo: payload.roundNo,
            turnNo,
            turnId: payload.turnId,
            drawerSessionId: payload.drawerSessionId,
            phase: 'READY',
            remainingSec: payload.remainingSec,
            deadlineAtMs: createDeadlineAtMs(payload.remainingSec),
            correctSessionIds: [],
            earnedPoints: {},
            wordChoices: [],
            selectedWord: null,
            selectedWordDescription: undefined,
            answerLength: undefined,
            hintPattern: undefined,
            canvasStrokes: [],
          },
        },
      }
    }),
  applyWordChoiceOpened: (payload) =>
    set((state) => {
      const activeRound = resolveRunningRound(state.room)
      const nextTurnCursor = resolveDrawerTurnCursor(
        activeRound.drawerOrder,
        payload.drawerSessionId,
        activeRound.turnCursor,
      )
      const nextRound = {
        ...activeRound,
        turnCursor: nextTurnCursor,
      }
      const turnNo = nextTurnCursor + 1
      const turnId =
        state.room.currentTurn &&
        state.room.currentTurn.roundNo === nextRound.roundNo &&
        state.room.currentTurn.turnNo === turnNo
          ? state.room.currentTurn.turnId
          : createTurnId(state.room.gameId, nextRound.roundNo, turnNo)

      return {
        room: {
          ...state.room,
          roomState: 'RUNNING',
          currentRound: nextRound,
          currentTurn: {
            roundNo: nextRound.roundNo,
            turnNo,
            turnId,
            drawerSessionId: payload.drawerSessionId,
            phase: 'WORD_CHOICE',
            remainingSec: payload.remainingSec,
            deadlineAtMs: createDeadlineAtMs(payload.remainingSec),
            correctSessionIds: [],
            earnedPoints: {},
            wordChoices: payload.wordChoices,
            selectedWord: null,
            selectedWordDescription: undefined,
            answerLength: undefined,
            hintPattern: undefined,
            canvasStrokes: state.room.currentTurn?.canvasStrokes ?? [],
          },
        },
      }
    }),
  applyDrawingStarted: (payload) =>
    set((state) => {
      const activeRound = resolveRunningRound(state.room)
      const previousTurn = state.room.currentTurn
      const turnNo = previousTurn?.turnNo ?? activeRound.turnCursor + 1
      const turnId = previousTurn?.turnId ?? createTurnId(payload.gameId, activeRound.roundNo, turnNo)
      const selectedWord = payload.selectedWord ?? previousTurn?.selectedWord ?? null
      const answerLength =
        payload.answerLength ??
        (selectedWord ? Array.from(selectedWord).length : previousTurn?.answerLength)

      return {
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: payload.gameId,
          currentRound: activeRound,
          currentTurn: {
            roundNo: activeRound.roundNo,
            turnNo,
            turnId,
            drawerSessionId: payload.drawerSessionId,
            phase: 'DRAWING',
            remainingSec: payload.remainingSec,
            deadlineAtMs: createDeadlineAtMs(payload.remainingSec),
            correctSessionIds: previousTurn?.correctSessionIds ?? [],
            earnedPoints: previousTurn?.earnedPoints ?? {},
            wordChoices: previousTurn?.wordChoices ?? [],
            selectedWord,
            selectedWordDescription:
              payload.selectedWordDescription !== undefined
                ? payload.selectedWordDescription
                : previousTurn?.selectedWordDescription,
            answerLength,
            hintPattern:
              payload.hintPattern !== undefined ? payload.hintPattern : previousTurn?.hintPattern,
            canvasStrokes: [],
          },
        },
      }
    }),
  applyGuessCorrect: (payload) =>
    set((state) => {
      if (!state.room.currentTurn) {
        return state
      }

      if (state.room.currentTurn.correctSessionIds.includes(payload.sessionId)) {
        return {
          room: {
            ...state.room,
            gameId: payload.gameId,
          },
        }
      }

      return {
        room: {
          ...state.room,
          gameId: payload.gameId,
          currentTurn: {
            ...state.room.currentTurn,
            correctSessionIds: [...state.room.currentTurn.correctSessionIds, payload.sessionId],
          },
        },
      }
    }),
  applyTurnEnded: (payload) =>
    set((state) => {
      if (!state.room.currentTurn) {
        return state
      }

      const drawerSessionId = state.room.currentTurn.drawerSessionId
      const earnedCorrectSessionIds = Object.keys(payload.earnedPoints).filter(
        (sessionId) => sessionId !== drawerSessionId,
      )
      const correctSessionIds = Array.from(
        new Set([...state.room.currentTurn.correctSessionIds, ...earnedCorrectSessionIds]),
      )
      const answer = payload.answer ?? state.room.currentTurn.selectedWord
      const answerLength =
        answer !== null ? Array.from(answer).length : state.room.currentTurn.answerLength

      return {
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: payload.gameId,
          participants: applyPointsToParticipants(state.room.participants, payload.earnedPoints),
          currentTurn: {
            ...state.room.currentTurn,
            turnId: payload.turnId,
            phase: 'TURN_END',
            remainingSec: payload.turnEndSec ?? 5,
            deadlineAtMs: createDeadlineAtMs(payload.turnEndSec ?? 5),
            correctSessionIds,
            earnedPoints: payload.earnedPoints,
            selectedWord: answer,
            answerLength,
          },
        },
      }
    }),
  applyGameResult: (payload) =>
    set((state) => ({
      room: {
        ...state.room,
        roomState: 'RESULT',
        gameId: payload.gameId,
        participants: replaceParticipantScores(state.room.participants, payload.totalPoints),
        currentRound: null,
        currentTurn: null,
      },
    })),
  applyReturnToLobby: () =>
    set((state) => ({
      room: {
        ...state.room,
        roomState: 'LOBBY',
        gameId: null,
        currentRound: null,
        currentTurn: null,
        lobbyCanvasStrokes: [],
        participants: sortParticipants(
          state.room.participants.map((participant) => ({
            ...participant,
            score: 0,
            joinedMidRound: false,
          })),
        ),
      },
    })),
  resetRoom: () => set({ room: emptyRoomSnapshot }),
}))
