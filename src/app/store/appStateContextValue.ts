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
} from '../../entities/game/model'

export type ServerGameStartedPayload = {
  gameId: string
  currentRound: RoundSummary
  currentTurn: TurnSummary
  chatMessages?: ChatMessage[]
}

export type GeGameStartedPayload = {
  gameId: string
}

export type GeRoundStartedPayload = {
  gameId: string
  roundNo: number
  drawerSessionIds: string[]
}

export type GeTurnStartedPayload = {
  gameId: string
  roundNo: number
  turnId: string
  drawerSessionId: string
  remainingSec: number
}

export type GeGuessCorrectPayload = {
  gameId: string
  sessionId: string
}

export type GeWordChoiceOpenedPayload = {
  drawerSessionId: string
  remainingSec: number
  wordChoices: string[]
}

export type GeDrawingStartedPayload = {
  gameId: string
  drawerSessionId: string
  remainingSec: number
  selectedWord: string | null
  answerLength?: number
}

export type GeTurnEndedPayload = {
  gameId: string
  turnId: string
  reason: string
  answer: string | null
  earnedPoints: Record<string, number>
}

export type GeGameResultPayload = {
  gameId: string
  resultSec: number
  totalPoints: Record<string, number>
}

export type GeReturnToLobbyPayload = {
  gameId: string
  reason: string
  restartSec?: number
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
    requestJoin: (options?: { roomCode?: string; action?: 0 | 1 }) => void
    dismissJoinError: () => void
    dismissConnectionError: () => void
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
