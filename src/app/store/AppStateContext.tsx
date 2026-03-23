import { useMemo, useReducer, type ReactNode } from 'react'
import {
  type CanvasStroke,
  defaultSettings,
  initialAppState,
  type AppState,
  type ConnectionStatus,
  type GameSettings,
  type Participant,
} from './mockAppState'
import { AppStateContext, type AppStateContextValue } from './appStateContextValue'

type AppAction =
  | { type: 'session/nicknameUpdated'; payload: string }
  | { type: 'room/settingsPatched'; payload: Partial<GameSettings> }
  | { type: 'room/resetToLobby' }
  | { type: 'game/started' }
  | { type: 'game/wordChosen'; payload: string }
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
          currentTurn: {
            roundNo: 1,
            turnNo: 1,
            turnId: 'turn-r1-1',
            drawerUserId: drawerOrder[0],
            phase: 'WORD_CHOICE',
            remainingSec: state.room.settings.wordChoiceSec,
            correctUserIds: [],
            wordChoices: ['사과', '기차', '고양이'],
            selectedWord: null,
            canvasStrokes: [],
          },
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
