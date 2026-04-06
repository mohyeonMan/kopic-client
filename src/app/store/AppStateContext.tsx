import { useMemo, useReducer, type ReactNode } from 'react'
import {
  type AppState,
  type CanvasStroke,
  type ChatMessage,
  type ConnectionStatus,
  defaultSettings,
  initialAppState,
  type GameSettings,
  type Participant,
  type RoomSnapshot,
  type RoundSummary,
  type TurnPhase,
  type TurnSummary,
} from './mockAppState'
import {
  AppStateContext,
  type AppStateContextValue,
  type ServerGameStartedPayload,
  type ServerWordChoicePayload,
} from './appStateContextValue'

type AppAction =
  | { type: 'local/sessionNicknameUpdated'; payload: string }
  | { type: 'local/lobbySettingsPatched'; payload: Partial<GameSettings> }
  | { type: 'connection/statusChanged'; payload: ConnectionStatus }
  | { type: 'server/roomSnapshotApplied'; payload: RoomSnapshot }
  | { type: 'server/gameStartedApplied'; payload: ServerGameStartedPayload }
  | { type: 'server/wordChoiceApplied'; payload: ServerWordChoicePayload }
  | { type: 'server/canvasStrokeReceived'; payload: CanvasStroke }
  | { type: 'server/canvasCleared' }
  | { type: 'server/gameEndedApplied' }
  | { type: 'dev/turnPhaseForced'; payload: TurnPhase }
  | { type: 'dev/mockFlowAdvanced' }

const mockWordPool = ['사과', '기차', '고양이', '우주선', '피아노']

function createSystemMessage(text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    nickname: 'system',
    text,
    tone: 'system',
  }
}

function getDrawerOrder(participants: Participant[]) {
  return participants
    .filter((participant) => !participant.joinedMidRound)
    .sort((left, right) => left.joinOrder - right.joinOrder)
    .map((participant) => participant.userId)
}

function getWordChoices(count: number) {
  const safeCount = Math.max(3, Math.min(5, count))
  return mockWordPool.slice(0, safeCount)
}

function createMockTurn(
  roundNo: number,
  turnNo: number,
  drawerUserId: string,
  phase: TurnPhase,
  settings: GameSettings,
): TurnSummary {
  const wordChoices = getWordChoices(settings.wordChoiceCount)
  const turnEndCorrectUserIds =
    settings.endMode === 'FIRST_CORRECT'
      ? ['u-200']
      : ['u-200', 'u-300', 'u-400', 'u-500', 'u-600', 'u-700', 'u-800', 'u-900', 'u-1000']

  return {
    roundNo,
    turnNo,
    turnId: `turn-r${roundNo}-${turnNo}`,
    drawerUserId,
    phase,
    remainingSec: phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0,
    correctUserIds: phase === 'TURN_END' ? turnEndCorrectUserIds : [],
    wordChoices,
    selectedWord: phase === 'WORD_CHOICE' ? null : wordChoices[0],
    canvasStrokes: [],
  }
}

function createMockGameStartedPayload(state: AppState): ServerGameStartedPayload {
  const drawerOrder = getDrawerOrder(state.room.participants)
  const currentRound: RoundSummary = {
    roundNo: 1,
    totalRounds: state.room.settings.roundCount,
    turnCursor: 0,
    drawerOrder,
  }

  return {
    gameId: 'game-20260323-01',
    currentRound,
    currentTurn: createMockTurn(1, 1, drawerOrder[0], 'WORD_CHOICE', state.room.settings),
    chatMessages: [
      createSystemMessage('302 GAME_STARTED'),
      createSystemMessage('303 ROUND_STARTED with drawerOrder snapshot'),
      createSystemMessage('304 TURN_STARTED'),
    ],
  }
}

function createLobbySnapshot(state: AppState): RoomSnapshot {
  return {
    ...state.room,
    roomState: 'LOBBY',
    gameId: null,
    currentRound: null,
    currentTurn: null,
    settings: { ...defaultSettings },
    participants: state.room.participants.map((participant) => ({
      ...participant,
      joinedMidRound: false,
    })),
    chat: [
      ...state.room.chat,
      createSystemMessage('room reset to lobby mock state'),
    ],
  }
}

function createForcedTurn(currentTurn: TurnSummary, phase: TurnPhase, settings: GameSettings): TurnSummary {
  const nextTurn = createMockTurn(
    currentTurn.roundNo,
    currentTurn.turnNo,
    currentTurn.drawerUserId,
    phase,
    settings,
  )

  if (phase === 'DRAWING') {
    return {
      ...nextTurn,
      selectedWord: currentTurn.selectedWord ?? currentTurn.wordChoices[0] ?? nextTurn.selectedWord,
      wordChoices: currentTurn.wordChoices,
      canvasStrokes: currentTurn.canvasStrokes,
    }
  }

  if (phase === 'TURN_END') {
    return {
      ...nextTurn,
      selectedWord: currentTurn.selectedWord ?? currentTurn.wordChoices[0] ?? nextTurn.selectedWord,
      wordChoices: currentTurn.wordChoices,
      canvasStrokes: currentTurn.canvasStrokes,
    }
  }

  return nextTurn
}

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'local/sessionNicknameUpdated':
      return {
        ...state,
        session: {
          ...state.session,
          nickname: action.payload,
        },
        room: {
          ...state.room,
          participants: state.room.participants.map((participant) =>
            participant.userId === state.session.userId
              ? { ...participant, nickname: action.payload }
              : participant,
          ),
        },
      }
    case 'local/lobbySettingsPatched':
      return {
        ...state,
        room: {
          ...state.room,
          settings: {
            ...state.room.settings,
            ...action.payload,
          },
        },
      }
    case 'connection/statusChanged':
      return {
        ...state,
        connectionStatus: action.payload,
      }
    case 'server/roomSnapshotApplied':
      return {
        ...state,
        room: action.payload,
      }
    case 'server/gameStartedApplied':
      return {
        ...state,
        connectionStatus: 'synced',
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: action.payload.gameId,
          currentRound: action.payload.currentRound,
          currentTurn: action.payload.currentTurn,
          chat: [...state.room.chat, ...(action.payload.chatMessages ?? [])],
        },
      }
    case 'server/wordChoiceApplied':
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
            selectedWord: action.payload.selectedWord,
            remainingSec: action.payload.remainingSec,
          },
          chat: action.payload.chatMessage
            ? [...state.room.chat, action.payload.chatMessage]
            : state.room.chat,
        },
      }
    case 'server/canvasStrokeReceived':
      if (!state.room.currentTurn) {
        return state
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: {
            ...state.room.currentTurn,
            canvasStrokes: [...state.room.currentTurn.canvasStrokes, action.payload],
          },
        },
      }
    case 'server/canvasCleared':
      if (!state.room.currentTurn) {
        return state
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: {
            ...state.room.currentTurn,
            canvasStrokes: [],
          },
          chat: [...state.room.chat, createSystemMessage('402 CANVAS_CLEAR')],
        },
      }
    case 'server/gameEndedApplied':
      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RESULT',
          currentTurn: null,
          chat: [...state.room.chat, createSystemMessage('307 GAME_ENDED')],
        },
      }
    case 'dev/turnPhaseForced':
      if (!state.room.currentTurn) {
        return state
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: createForcedTurn(state.room.currentTurn, action.payload, state.room.settings),
        },
      }
    case 'dev/mockFlowAdvanced':
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
        const nextDrawerUserId = currentRound.drawerOrder[nextCursor]

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
              nextDrawerUserId,
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
    default:
      return state
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState)

  const value = useMemo<AppStateContextValue>(() => {
    const server: AppStateContextValue['server'] = {
      applyRoomSnapshot: (snapshot) => dispatch({ type: 'server/roomSnapshotApplied', payload: snapshot }),
      applyGameStarted: (payload) => dispatch({ type: 'server/gameStartedApplied', payload }),
      applyWordChoice: (payload) => dispatch({ type: 'server/wordChoiceApplied', payload }),
      applyCanvasStroke: (stroke) => dispatch({ type: 'server/canvasStrokeReceived', payload: stroke }),
      applyCanvasClear: () => dispatch({ type: 'server/canvasCleared' }),
      applyGameEnded: () => dispatch({ type: 'server/gameEndedApplied' }),
    }

    return {
      state,
      actions: {
        updateNickname: (nickname) =>
          dispatch({ type: 'local/sessionNicknameUpdated', payload: nickname.trim() || 'Guest' }),
        patchLobbySettings: (settings) =>
          dispatch({ type: 'local/lobbySettingsPatched', payload: settings }),
        requestGameStart: () => {
          server.applyGameStarted(createMockGameStartedPayload(state))
        },
        requestWordChoice: (word) => {
          server.applyWordChoice({
            selectedWord: word,
            remainingSec: state.room.settings.drawSec,
            chatMessage: createSystemMessage(`310 DRAWING_STARTED (${word})`),
          })
        },
        sendCanvasStroke: (stroke) => {
          server.applyCanvasStroke(stroke)
        },
        requestCanvasClear: () => {
          server.applyCanvasClear()
        },
      },
      connection: {
        setStatus: (status) => dispatch({ type: 'connection/statusChanged', payload: status }),
      },
      server,
      devTools: {
        forceTurnPhase: (phase) => dispatch({ type: 'dev/turnPhaseForced', payload: phase }),
        advanceMockFlow: () => dispatch({ type: 'dev/mockFlowAdvanced' }),
        finishGame: () => {
          server.applyGameEnded()
        },
        resetToLobby: () => {
          server.applyRoomSnapshot(createLobbySnapshot(state))
        },
      },
    }
  }, [state])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
