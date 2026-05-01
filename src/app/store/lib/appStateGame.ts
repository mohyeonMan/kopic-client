import type { AppState, GameSettings, TurnPhase } from '../../../entities/game/model'
import type {
  GeDrawingStartedPayload,
  GeGameResultPayload,
  GeGameStartedPayload,
  GeGuessCorrectPayload,
  GeReturnToLobbyPayload,
  GeRoundStartedPayload,
  GeTurnEndedPayload,
  GeTurnStartedPayload,
  GeWordChoiceOpenedPayload,
  ServerGameStartedPayload,
  ServerWordChoicePayload,
} from '../appStateContextValue'
import {
  createCorrectAnswerAlertMessage,
  createSystemMessage,
} from './appStateHelpers'
import { applyTotalPointsToParticipants } from './appStateSnapshot'
import {
  applyEarnedPointsToParticipants,
  createDeadlineAtMs,
  createForcedTurn,
  createGeTurnId,
  createMockTurn,
  resetParticipantsForLobby,
  resolveDrawerTurnCursor,
  resolveRunningRoundSummary,
} from './appStateFlow'

export function reduceLobbySettingsPatched(
  state: AppState,
  settings: Partial<GameSettings>,
): AppState {
  return {
    ...state,
    room: {
      ...state.room,
      settings: {
        ...state.room.settings,
        ...settings,
      },
    },
  }
}

export function reduceGameStartedApplied(
  state: AppState,
  payload: ServerGameStartedPayload,
): AppState {
  return {
    ...state,
    connectionStatus: 'synced',
    room: {
      ...state.room,
      roomState: 'RUNNING',
      gameId: payload.gameId,
      currentRound: payload.currentRound,
      currentTurn: payload.currentTurn,
      chat: [...state.room.chat, ...(payload.chatMessages ?? [])],
    },
  }
}

export function reduceGeGameStartedApplied(
  state: AppState,
  payload: GeGameStartedPayload,
): AppState {
  return {
    ...state,
    connectionStatus: 'synced',
    room: {
      ...state.room,
      roomState: 'RUNNING',
      gameId: payload.gameId,
      currentRound: null,
      currentTurn: null,
      lobbyCanvasStrokes: [],
      chat: [...state.room.chat, createSystemMessage(`200 GE_GAME_STARTED ${payload.gameId}`)],
    },
  }
}

export function reduceGeRoundStartedApplied(
  state: AppState,
  payload: GeRoundStartedPayload,
): AppState {
  return {
    ...state,
    connectionStatus: 'synced',
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
      chat: [...state.room.chat, createSystemMessage(`202 GE_ROUND_STARTED R${payload.roundNo}`)],
    },
  }
}

export function reduceGeTurnStartedApplied(
  state: AppState,
  payload: GeTurnStartedPayload,
): AppState {
  const activeRound = resolveRunningRoundSummary(state)
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
    drawerOrder: activeRound.drawerOrder,
  }
  const turnNo =
    state.room.currentTurn?.phase === 'TURN_END'
      ? state.room.currentTurn.turnNo + 1
      : nextTurnCursor + 1

  return {
    ...state,
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
        answerLength: undefined,
        canvasStrokes: [],
      },
      chat: [
        ...state.room.chat,
        createSystemMessage(`209 GE_TURN_STARTED ${payload.drawerSessionId}`),
      ],
    },
  }
}

export function reduceGeGuessCorrectApplied(
  state: AppState,
  payload: GeGuessCorrectPayload,
): AppState {
  if (!state.room.currentTurn) {
    return state
  }

  const alreadyCorrect = state.room.currentTurn.correctSessionIds.includes(payload.sessionId)
  const correctSessionIds = alreadyCorrect
    ? state.room.currentTurn.correctSessionIds
    : [...state.room.currentTurn.correctSessionIds, payload.sessionId]
  const correctNickname =
    state.room.participants.find((participant) => participant.sessionId === payload.sessionId)?.nickname ??
    payload.sessionId

  return {
    ...state,
    room: {
      ...state.room,
      gameId: payload.gameId,
      currentTurn: {
        ...state.room.currentTurn,
        correctSessionIds,
      },
      chat: alreadyCorrect
        ? state.room.chat
        : [...state.room.chat, createCorrectAnswerAlertMessage(correctNickname)],
    },
  }
}

export function reduceGeWordChoiceOpenedApplied(
  state: AppState,
  payload: GeWordChoiceOpenedPayload,
): AppState {
  const activeRound = resolveRunningRoundSummary(state)
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
      : createGeTurnId(state.room.gameId, nextRound.roundNo, turnNo)

  return {
    ...state,
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
        answerLength: undefined,
        canvasStrokes: state.room.currentTurn?.canvasStrokes ?? [],
      },
      chat: [
        ...state.room.chat,
        createSystemMessage(`203 GE_WORD_CHOICE_OPEN ${payload.drawerSessionId}`),
      ],
    },
  }
}

export function reduceGeDrawingStartedApplied(
  state: AppState,
  payload: GeDrawingStartedPayload,
): AppState {
  const activeRound = resolveRunningRoundSummary(state)
  const previousTurn = state.room.currentTurn
  const turnNo = previousTurn?.turnNo ?? activeRound.turnCursor + 1
  const turnId = previousTurn?.turnId ?? createGeTurnId(payload.gameId, activeRound.roundNo, turnNo)
  const selectedWord = payload.selectedWord ?? previousTurn?.selectedWord ?? null
  const answerLength =
    payload.answerLength ??
    (selectedWord ? Array.from(selectedWord).length : previousTurn?.answerLength)

  return {
    ...state,
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
        answerLength,
        canvasStrokes: [],
      },
      chat: [
        ...state.room.chat,
        createSystemMessage(`208 GE_DRAWING_STARTED ${payload.drawerSessionId}`),
      ],
    },
  }
}

export function reduceGeTurnEndedApplied(
  state: AppState,
  payload: GeTurnEndedPayload,
): AppState {
  if (!state.room.currentTurn) {
    return state
  }

  const currentDrawerSessionId = state.room.currentTurn.drawerSessionId
  const nextParticipants = applyEarnedPointsToParticipants(
    state.room.participants,
    payload.earnedPoints,
  )
  const correctSessionIds = Array.from(
    new Set([
      ...state.room.currentTurn.correctSessionIds,
      ...Object.keys(payload.earnedPoints).filter(
        (sessionId) => sessionId !== currentDrawerSessionId,
      ),
    ]),
  )
  const answer = payload.answer ?? state.room.currentTurn.selectedWord
  const answerLength =
    answer !== null ? Array.from(answer).length : state.room.currentTurn.answerLength
  const currentRound = state.room.currentRound
  const nextRound = currentRound
    ? {
        ...currentRound,
        drawerOrder: currentRound.drawerOrder.filter(
          (sessionId) => sessionId !== currentDrawerSessionId,
        ),
      }
    : null

  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'RUNNING',
      gameId: payload.gameId,
      participants: nextParticipants,
      currentRound: nextRound,
      currentTurn: {
        ...state.room.currentTurn,
        turnId: payload.turnId,
        phase: 'TURN_END',
        remainingSec: 0,
        deadlineAtMs: undefined,
        correctSessionIds,
        earnedPoints: payload.earnedPoints,
        selectedWord: answer,
        answerLength,
      },
      chat: [...state.room.chat, createSystemMessage(`205 GE_TURN_ENDED ${payload.reason}`)],
    },
  }
}

export function reduceGeGameResultApplied(
  state: AppState,
  payload: GeGameResultPayload,
): AppState {
  const nextParticipants = applyTotalPointsToParticipants(
    state.room.participants,
    payload.totalPoints,
  )

  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'RESULT',
      gameId: payload.gameId,
      participants: nextParticipants,
      currentTurn: null,
      chat: [...state.room.chat, createSystemMessage(`206 GE_GAME_RESULT ${payload.resultSec}s`)],
    },
  }
}

export function reduceGeReturnToLobbyApplied(
  state: AppState,
  payload: GeReturnToLobbyPayload,
): AppState {
  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'LOBBY',
      gameId: null,
      currentRound: null,
      currentTurn: null,
      lobbyCanvasStrokes: [],
      participants: resetParticipantsForLobby(state.room.participants),
      chat: [
        ...state.room.chat,
        createSystemMessage(
          payload.restartSec !== undefined
            ? `207 GE_RETURN_TO_LOBBY ${payload.reason} ${payload.restartSec}s`
            : `207 GE_RETURN_TO_LOBBY ${payload.reason}`,
        ),
      ],
    },
  }
}

export function reduceWordChoiceApplied(
  state: AppState,
  payload: ServerWordChoicePayload,
): AppState {
  if (!state.room.currentTurn) {
    return state
  }

  return {
    ...state,
    room: {
      ...state.room,
      currentTurn: {
        ...state.room.currentTurn,
        phase: 'DRAWING',
        selectedWord: payload.selectedWord,
        remainingSec: payload.remainingSec,
        deadlineAtMs: createDeadlineAtMs(payload.remainingSec),
        earnedPoints: {},
      },
      chat: payload.chatMessage
        ? [...state.room.chat, payload.chatMessage]
        : state.room.chat,
    },
  }
}

export function reduceGameEndedApplied(state: AppState): AppState {
  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'RESULT',
      currentTurn: null,
      chat: [...state.room.chat, createSystemMessage('307 GAME_ENDED')],
    },
  }
}

export function reduceTurnPhaseForced(
  state: AppState,
  phase: TurnPhase,
): AppState {
  if (!state.room.currentTurn) {
    return state
  }

  return {
    ...state,
    room: {
      ...state.room,
      currentTurn: createForcedTurn(state.room.currentTurn, phase, state.room.settings),
    },
  }
}

export function reduceMockFlowAdvanced(state: AppState): AppState {
  if (!state.room.currentTurn || !state.room.currentRound) {
    return state
  }

  if (state.room.currentTurn.phase !== 'TURN_END') {
    const nextPhase: TurnPhase =
      state.room.currentTurn.phase === 'WORD_CHOICE' ? 'DRAWING' : 'TURN_END'

    return {
      ...state,
      room: {
        ...state.room,
        currentTurn: createForcedTurn(state.room.currentTurn, nextPhase, state.room.settings),
      },
    }
  }

  const currentRound = state.room.currentRound
  const nextCursor = currentRound.turnCursor + 1
  const hasNextTurn = nextCursor < currentRound.drawerOrder.length

  if (hasNextTurn) {
    const nextTurnNo = state.room.currentTurn.turnNo + 1
    const nextDrawerSessionId = currentRound.drawerOrder[nextCursor]

    return {
      ...state,
      room: {
        ...state.room,
        currentRound: {
          ...currentRound,
          turnCursor: nextCursor,
        },
        currentTurn: createMockTurn(
          currentRound.roundNo,
          nextTurnNo,
          nextDrawerSessionId,
          'WORD_CHOICE',
          state.room.settings,
        ),
      },
    }
  }

  const hasNextRound = currentRound.roundNo < currentRound.totalRounds

  if (hasNextRound) {
    const nextRoundNo = currentRound.roundNo + 1

    return {
      ...state,
      room: {
        ...state.room,
        currentRound: {
          ...currentRound,
          roundNo: nextRoundNo,
          turnCursor: 0,
        },
        currentTurn: createMockTurn(
          nextRoundNo,
          1,
          currentRound.drawerOrder[0],
          'WORD_CHOICE',
          state.room.settings,
        ),
        chat: [
          ...state.room.chat,
          createSystemMessage(`306 ROUND_ENDED R${currentRound.roundNo}`),
          createSystemMessage(`303 ROUND_STARTED R${nextRoundNo}`),
        ],
      },
    }
  }

  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'RESULT',
      currentTurn: null,
      chat: [...state.room.chat, createSystemMessage('307 GAME_ENDED')],
    },
  }
}
