import type { AppState, GameSettings, TurnPhase } from '@/entities/game/model'
import type {
  GeDrawingStartedPayload,
  GeGameResultPayload,
  GeGameStartedPayload,
  GeHintRevealedPayload,
  GeGuessCorrectPayload,
  GeReturnToLobbyPayload,
  GeRoundStartedPayload,
  GeTurnEndedPayload,
  GeTurnStartedPayload,
  GeWordChoiceOpenedPayload,
  ServerGameStartedPayload,
  ServerWordChoicePayload,
} from '@/entities/game/api/gameEventPayloads'
import {
  createCorrectAnswerAlertMessage,
  createSystemMessage,
} from '@/entities/game/api/gameProtocol'
import { appendGameSoundEvent } from './gameSoundEvents'
import { applyTotalPointsToParticipants } from '@/entities/game/api/roomSnapshotPayload'
import {
  applyEarnedPointsToParticipants,
  createDeadlineAtMs,
  createForcedTurn,
  createMockTurn,
  resetParticipantsForLobby,
  resolveDrawerTurnCursor,
  resolveRunningRoundSummary,
} from './gameFlow'

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
      canvasRedoStack: [],
      chat: [...state.room.chat, ...(payload.chatMessages ?? [])],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `game:${payload.gameId}:start`,
      sound: 'cardSlide',
    }),
  }
}

export function reduceGeGameStartedApplied(
  state: AppState,
  payload: GeGameStartedPayload,
): AppState {
  const gameStartSec = payload.gameStartSec ?? 5

  return {
    ...state,
    connectionStatus: 'synced',
    room: {
      ...state.room,
      roomState: 'RUNNING',
      gameId: payload.gameId,
      gameStartRemainingSec: gameStartSec,
      gameStartDeadlineAtMs: createDeadlineAtMs(gameStartSec),
      roundStartRemainingSec: undefined,
      roundStartDeadlineAtMs: undefined,
      resultRemainingSec: undefined,
      resultDeadlineAtMs: undefined,
      currentRound: null,
      currentTurn: null,
      lobbyCanvasStrokes: [],
      canvasRedoStack: [],
      chat: [...state.room.chat, createSystemMessage(`400 GE_GAME_STARTED ${payload.gameId}`)],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `game:${payload.gameId}:start`,
      sound: 'cardSlide',
    }),
  }
}

export function reduceGeRoundStartedApplied(
  state: AppState,
  payload: GeRoundStartedPayload,
): AppState {
  const roundStartSec = payload.roundStartSec ?? 5

  return {
    ...state,
    connectionStatus: 'synced',
    room: {
      ...state.room,
      roomState: 'RUNNING',
      gameId: payload.gameId,
      gameStartRemainingSec: undefined,
      gameStartDeadlineAtMs: undefined,
      roundStartRemainingSec: roundStartSec,
      roundStartDeadlineAtMs: createDeadlineAtMs(roundStartSec),
      currentRound: {
        roundNo: payload.roundNo,
        totalRounds: state.room.settings.roundCount,
        turnCursor: 0,
        drawerOrder: payload.drawerSessionIds,
      },
      currentTurn: null,
      lobbyCanvasStrokes: [],
      canvasRedoStack: [],
      chat: [...state.room.chat, createSystemMessage(`401 GE_ROUND_STARTED R${payload.roundNo}`)],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `game:${payload.gameId}:round:${payload.roundNo}:start`,
      sound: 'cardSlide',
    }),
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
      gameStartRemainingSec: undefined,
      gameStartDeadlineAtMs: undefined,
      roundStartRemainingSec: undefined,
      roundStartDeadlineAtMs: undefined,
      currentRound: nextRound,
      canvasRedoStack: [],
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
      chat: [
        ...state.room.chat,
        createSystemMessage(`402 GE_TURN_STARTED ${payload.drawerSessionId}`),
      ],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `turn:${payload.turnId}:started`,
      sound: 'cardSlide',
    }),
  }
}

export function reduceGeGuessCorrectApplied(
  state: AppState,
  payload: GeGuessCorrectPayload,
): AppState {
  if (!state.room.currentTurn || state.room.currentTurn.turnId !== payload.turnId) {
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
    soundEvents:
      !alreadyCorrect &&
      payload.sessionId === state.session.sessionId &&
      payload.sessionId !== state.room.currentTurn.drawerSessionId
        ? appendGameSoundEvent(state.soundEvents, {
            id: `turn:${payload.turnId}:correct:${payload.sessionId}`,
            sound: 'correct',
          })
        : state.soundEvents,
  }
}

export function reduceGeWordChoiceOpenedApplied(
  state: AppState,
  payload: GeWordChoiceOpenedPayload,
): AppState {
  if (
    state.room.currentTurn &&
    state.room.currentTurn.turnId !== payload.turnId &&
    state.room.currentTurn.phase !== 'TURN_END'
  ) {
    return state
  }

  if (
    state.room.currentTurn?.turnId === payload.turnId &&
    (state.room.currentTurn.phase === 'DRAWING' || state.room.currentTurn.phase === 'TURN_END')
  ) {
    return state
  }

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
  const sameTurn = state.room.currentTurn?.turnId === payload.turnId

  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'RUNNING',
      gameId: payload.gameId ?? state.room.gameId,
      currentRound: nextRound,
      currentTurn: {
        roundNo: nextRound.roundNo,
        turnNo,
        turnId: payload.turnId,
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
        canvasStrokes: sameTurn ? state.room.currentTurn?.canvasStrokes ?? [] : [],
      },
      chat: [
        ...state.room.chat,
        createSystemMessage(`403 GE_WORD_CHOICE_OPEN ${payload.drawerSessionId}`),
      ],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `turn:${payload.turnId}:word-choice`,
      sound: 'cardSlide',
    }),
  }
}

export function reduceGeDrawingStartedApplied(
  state: AppState,
  payload: GeDrawingStartedPayload,
): AppState {
  const activeRound = resolveRunningRoundSummary(state)
  const previousTurn = state.room.currentTurn
  if (previousTurn && previousTurn.turnId !== payload.turnId && previousTurn.phase !== 'TURN_END') {
    return state
  }

  if (previousTurn?.turnId === payload.turnId && previousTurn.phase === 'TURN_END') {
    return state
  }

  const sameTurn = previousTurn?.turnId === payload.turnId
  const turnNo =
    sameTurn && previousTurn
      ? previousTurn.turnNo
      : previousTurn?.phase === 'TURN_END'
        ? previousTurn.turnNo + 1
        : activeRound.turnCursor + 1
  const selectedWord = payload.selectedWord ?? (sameTurn ? previousTurn?.selectedWord : null) ?? null
  const selectedWordDescription =
    payload.selectedWordDescription !== undefined
      ? payload.selectedWordDescription
      : sameTurn
        ? previousTurn?.selectedWordDescription
        : undefined
  const answerLength =
    payload.answerLength ??
    (selectedWord
      ? Array.from(selectedWord).length
      : sameTurn
        ? previousTurn?.answerLength
        : undefined)
  const hintPattern =
    payload.hintPattern !== undefined
      ? payload.hintPattern
      : sameTurn
        ? previousTurn?.hintPattern
        : undefined

  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'RUNNING',
      gameId: payload.gameId,
      currentRound: activeRound,
      canvasRedoStack: [],
      currentTurn: {
        roundNo: activeRound.roundNo,
        turnNo,
        turnId: payload.turnId,
        drawerSessionId: payload.drawerSessionId,
        phase: 'DRAWING',
        remainingSec: payload.remainingSec,
        deadlineAtMs: createDeadlineAtMs(payload.remainingSec),
        correctSessionIds: sameTurn ? previousTurn?.correctSessionIds ?? [] : [],
        earnedPoints: sameTurn ? previousTurn?.earnedPoints ?? {} : {},
        wordChoices: sameTurn ? previousTurn?.wordChoices ?? [] : [],
        selectedWord,
        selectedWordDescription,
        answerLength,
        hintPattern,
        canvasStrokes: [],
      },
      chat: [
        ...state.room.chat,
        createSystemMessage(`404 GE_DRAWING_STARTED ${payload.drawerSessionId}`),
      ],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `turn:${payload.turnId}:drawing-started`,
      sound: 'cardSlide',
    }),
  }
}

export function reduceGeHintRevealedApplied(
  state: AppState,
  payload: GeHintRevealedPayload,
): AppState {
  const currentTurn = state.room.currentTurn
  if (!currentTurn) {
    return state
  }

  return {
    ...state,
    room: {
      ...state.room,
      gameId: payload.gameId,
      currentTurn: {
        ...currentTurn,
        hintPattern: payload.hintPattern,
      },
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `turn:${payload.turnId}:hint:${payload.revealedCount ?? payload.hintPattern}`,
      sound: 'cardSlide',
    }),
  }
}

export function reduceGeTurnEndedApplied(
  state: AppState,
  payload: GeTurnEndedPayload,
): AppState {
  if (!state.room.currentTurn || state.room.currentTurn.turnId !== payload.turnId) {
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
        remainingSec: payload.turnEndSec ?? 5,
        deadlineAtMs:
          payload.turnEndSec !== undefined ? createDeadlineAtMs(payload.turnEndSec) : createDeadlineAtMs(5),
        correctSessionIds,
        earnedPoints: payload.earnedPoints,
        selectedWord: answer,
        selectedWordDescription: state.room.currentTurn.selectedWordDescription,
        answerLength,
      },
      chat: [...state.room.chat, createSystemMessage(`410 GE_TURN_ENDED ${payload.reason}`)],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `turn:${payload.turnId}:end`,
      sound: 'turnResult',
    }),
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
      resultRemainingSec: payload.resultSec,
      resultDeadlineAtMs: createDeadlineAtMs(payload.resultSec),
      participants: nextParticipants,
      currentTurn: null,
      chat: [...state.room.chat, createSystemMessage(`411 GE_GAME_RESULT ${payload.resultSec}s`)],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `game:${payload.gameId}:result`,
      sound: 'gameResult',
    }),
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
      gameStartRemainingSec: undefined,
      gameStartDeadlineAtMs: undefined,
      roundStartRemainingSec: undefined,
      roundStartDeadlineAtMs: undefined,
      resultRemainingSec: undefined,
      resultDeadlineAtMs: undefined,
      currentRound: null,
      currentTurn: null,
      lobbyCanvasStrokes: [],
      canvasRedoStack: [],
      participants: resetParticipantsForLobby(state.room.participants),
      chat: [
        ...state.room.chat,
        createSystemMessage(
          payload.restartSec !== undefined
            ? `412 GE_RETURN_TO_LOBBY ${payload.reason} ${payload.restartSec}s`
            : `412 GE_RETURN_TO_LOBBY ${payload.reason}`,
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
      canvasRedoStack: [],
      currentTurn: {
        ...state.room.currentTurn,
        phase: 'DRAWING',
        selectedWord: payload.selectedWord,
        selectedWordDescription: undefined,
        remainingSec: payload.remainingSec,
        deadlineAtMs: createDeadlineAtMs(payload.remainingSec),
        earnedPoints: {},
        hintPattern: undefined,
      },
      chat: payload.chatMessage
        ? [...state.room.chat, payload.chatMessage]
        : state.room.chat,
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `turn:${state.room.currentTurn.turnId}:drawing-started`,
      sound: 'cardSlide',
    }),
  }
}

export function reduceGameEndedApplied(state: AppState): AppState {
  return {
    ...state,
    room: {
      ...state.room,
      roomState: 'RESULT',
      currentTurn: null,
      chat: [...state.room.chat, createSystemMessage('413 GAME_ENDED')],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `game:${state.room.gameId ?? 'local'}:ended`,
      sound: 'gameResult',
    }),
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
          createSystemMessage(`ROUND_ENDED R${currentRound.roundNo}`),
          createSystemMessage(`401 ROUND_STARTED R${nextRoundNo}`),
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
      chat: [...state.room.chat, createSystemMessage('413 GAME_ENDED')],
    },
  }
}
