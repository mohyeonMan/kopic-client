import { createContext } from 'react'
import type {
  AppState,
  CanvasStroke,
  ChatMessage,
  ConnectionStatus,
  GameSettings,
  RoomSnapshot,
  RoundSummary,
  TurnPhase,
  TurnSummary,
} from './mockAppState'

export type ServerGameStartedPayload = {
  gameId: string
  currentRound: RoundSummary
  currentTurn: TurnSummary
  chatMessages?: ChatMessage[]
}

export type ServerWordChoicePayload = {
  selectedWord: string
  remainingSec: number
  chatMessage?: ChatMessage
}

export type AppStateContextValue = {
  state: AppState
  actions: {
    updateNickname: (nickname: string) => void
    clearRoomCache: () => void
    patchLobbySettings: (settings: Partial<GameSettings>) => void
    requestGameStart: () => void
    requestWordChoice: (word: string) => void
    submitGuess: (text: string) => void
    sendCanvasStroke: (stroke: CanvasStroke) => void
    requestCanvasClear: () => void
  }
  connection: {
    setStatus: (status: ConnectionStatus) => void
  }
  server: {
    applyRoomSnapshot: (snapshot: RoomSnapshot) => void
    applyGameStarted: (payload: ServerGameStartedPayload) => void
    applyWordChoice: (payload: ServerWordChoicePayload) => void
    applyCanvasStroke: (stroke: CanvasStroke) => void
    applyCanvasClear: () => void
    applyGameEnded: () => void
  }
  devTools: {
    forceTurnPhase: (phase: TurnPhase) => void
    advanceMockFlow: () => void
    finishGame: () => void
    resetToLobby: () => void
  }
}

export const AppStateContext = createContext<AppStateContextValue | null>(null)
