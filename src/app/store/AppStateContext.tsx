import { useMemo, useReducer, type ReactNode } from 'react'
import {
  type CanvasStroke,
  defaultSettings,
  initialAppState,
  type AppState,
  type ConnectionStatus,
  type GameSettings,
  type Participant,
  type TurnPhase,
} from './mockAppState'
import { AppStateContext, type AppStateContextValue } from './appStateContextValue'

type AppAction =
  | { type: 'session/nicknameUpdated'; payload: string }
  | { type: 'room/settingsPatched'; payload: Partial<GameSettings> }
  | { type: 'room/resetToLobby' }
  | { type: 'game/started' }
  | { type: 'game/wordChosen'; payload: string }
  | { type: 'game/mockTurnPhaseSet'; payload: TurnPhase }
  | { type: 'game/mockAdvanced' }
  | { type: 'canvas/strokeAdded'; payload: CanvasStroke }
  | { type: 'canvas/cleared' }
  | { type: 'game/ended' }
  | { type: 'connection/statusChanged'; payload: ConnectionStatus }

function getDrawerOrder(participants: Participant[]) {
  return participants
    .filter((participant) => !participant.joinedMidRound)
    .sort((left, right) => left.joinOrder - right.joinOrder)
    .map((participant) => participant.userId)
}

const mockWordPool = ['사과', '기차', '고양이', '우주선', '피아노']

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
) {
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

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'session/nicknameUpdated':
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
    case 'room/settingsPatched':
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
    case 'game/started':
      {
        const drawerOrder = getDrawerOrder(state.room.participants)

      return {
        ...state,
        connectionStatus: 'synced',
        room: {
          ...state.room,
          roomState: 'RUNNING',
          gameId: 'game-20260323-01',
          currentRound: {
            roundNo: 1,
            totalRounds: state.room.settings.roundCount,
            turnCursor: 0,
            drawerOrder,
          },
          currentTurn: createMockTurn(1, 1, drawerOrder[0], 'WORD_CHOICE', state.room.settings),
          chat: [
            ...state.room.chat,
            { id: crypto.randomUUID(), nickname: 'system', text: '302 GAME_STARTED', tone: 'system' },
            { id: crypto.randomUUID(), nickname: 'system', text: '303 ROUND_STARTED with drawerOrder snapshot', tone: 'system' },
            { id: crypto.randomUUID(), nickname: 'system', text: '304 TURN_STARTED', tone: 'system' },
          ],
        },
      }
      }
    case 'game/wordChosen':
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
            selectedWord: action.payload,
            remainingSec: state.room.settings.drawSec,
          },
          chat: [
            ...state.room.chat,
            {
              id: crypto.randomUUID(),
              nickname: 'system',
              text: `310 DRAWING_STARTED (${action.payload})`,
              tone: 'system',
            },
          ],
        },
      }
    case 'game/mockTurnPhaseSet':
      if (!state.room.currentTurn) {
        return state
      }

      return {
        ...state,
        room: {
          ...state.room,
          currentTurn: {
            ...createMockTurn(
              state.room.currentTurn.roundNo,
              state.room.currentTurn.turnNo,
              state.room.currentTurn.drawerUserId,
              action.payload,
              state.room.settings,
            ),
          },
        },
      }
    case 'game/mockAdvanced':
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
            currentTurn: {
              ...createMockTurn(
                state.room.currentTurn.roundNo,
                state.room.currentTurn.turnNo,
                state.room.currentTurn.drawerUserId,
                nextPhase,
                state.room.settings,
              ),
            },
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
              { id: crypto.randomUUID(), nickname: 'system', text: `306 ROUND_ENDED R${currentRound.roundNo}`, tone: 'system' },
              { id: crypto.randomUUID(), nickname: 'system', text: `303 ROUND_STARTED R${nextRoundNo}`, tone: 'system' },
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
          chat: [
            ...state.room.chat,
            { id: crypto.randomUUID(), nickname: 'system', text: '307 GAME_ENDED', tone: 'system' },
          ],
        },
      }
    case 'canvas/strokeAdded':
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
    case 'canvas/cleared':
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
          chat: [
            ...state.room.chat,
            { id: crypto.randomUUID(), nickname: 'system', text: '402 CANVAS_CLEAR', tone: 'system' },
          ],
        },
      }
    case 'game/ended':
      return {
        ...state,
        room: {
          ...state.room,
          roomState: 'RESULT',
          currentTurn: null,
          chat: [
            ...state.room.chat,
            { id: crypto.randomUUID(), nickname: 'system', text: '307 GAME_ENDED', tone: 'system' },
          ],
        },
      }
    case 'room/resetToLobby':
      return {
        ...state,
        room: {
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
            { id: crypto.randomUUID(), nickname: 'system', text: 'room reset to lobby mock state', tone: 'system' },
          ],
        },
      }
    case 'connection/statusChanged':
      return {
        ...state,
        connectionStatus: action.payload,
      }
    default:
      return state
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState)

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      updateNickname: (nickname) =>
        dispatch({ type: 'session/nicknameUpdated', payload: nickname.trim() || 'Guest' }),
      patchSettings: (settings) => dispatch({ type: 'room/settingsPatched', payload: settings }),
      startGame: () => dispatch({ type: 'game/started' }),
      chooseMockWord: (word) => dispatch({ type: 'game/wordChosen', payload: word }),
      setMockTurnPhase: (phase) => dispatch({ type: 'game/mockTurnPhaseSet', payload: phase }),
      advanceMockFlow: () => dispatch({ type: 'game/mockAdvanced' }),
      appendStroke: (stroke) => dispatch({ type: 'canvas/strokeAdded', payload: stroke }),
      clearCanvas: () => dispatch({ type: 'canvas/cleared' }),
      finishGame: () => dispatch({ type: 'game/ended' }),
      resetToLobby: () => dispatch({ type: 'room/resetToLobby' }),
      setConnectionStatus: (status) => dispatch({ type: 'connection/statusChanged', payload: status }),
    }),
    [state],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
