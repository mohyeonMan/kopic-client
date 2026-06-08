import { createContext } from 'react'
import type {
  AppState,
  CanvasStroke,
  ConnectionStatus,
  GameSettings,
  RoomSnapshot,
  SessionState,
  TurnPhase,
} from '../../entities/game/model'
import type {
  ServerGameStartedPayload,
  ServerWordChoicePayload,
} from '@/entities/game/api/gameEventPayloads'

export type {
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

export type AppActions = {
  updateNickname: (nickname: string) => void
  requestJoin: (options?: { roomCode?: string; action?: 0 | 1 }) => void
  dismissJoinError: () => void
  dismissConnectionError: () => void
  dismissActionError: () => void
  clearRoomCache: () => void
  patchLobbySettings: (settings: Partial<GameSettings>) => void
  requestGameStart: () => void
  requestWordChoice: (choiceIndex: number) => void
  submitGuess: (text: string) => void
  sendCanvasStroke: (stroke: CanvasStroke) => void
  requestCanvasUndo: (cid: string) => void
  requestCanvasClear: () => void
}

export type AppConnectionControls = {
  setStatus: (status: ConnectionStatus) => void
}

export type AppServerControls = {
  applyRoomSnapshot: (snapshot: RoomSnapshot) => void
  applyGameStarted: (payload: ServerGameStartedPayload) => void
  applyWordChoice: (payload: ServerWordChoicePayload) => void
  applyCanvasStroke: (stroke: CanvasStroke) => void
  applyCanvasClear: (cid?: string) => void
  applyGameEnded: () => void
}

export type AppDevTools = {
  forceTurnPhase: (phase: TurnPhase) => void
  advanceMockFlow: () => void
  finishGame: () => void
  resetToLobby: () => void
}

export type AppShellState = {
  roomCode: AppState['room']['roomCode']
  roomType: AppState['room']['roomType']
  joinAction: AppState['session']['joinAction']
  joinRoomCode: AppState['session']['joinRoomCode']
}

export type AppStateContextValue = {
  state: AppState
  actions: AppActions
  connection: AppConnectionControls
  server: AppServerControls
  devTools: AppDevTools
}

export const AppStateContext = createContext<AppStateContextValue | null>(null)
export const AppActionsContext = createContext<AppActions | null>(null)
export const AppSessionStateContext = createContext<SessionState | null>(null)
export const AppShellStateContext = createContext<AppShellState | null>(null)
