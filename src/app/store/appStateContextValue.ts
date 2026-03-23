import { createContext } from 'react'
import type { CanvasStroke, ConnectionStatus, GameSettings, AppState } from './mockAppState'

export type AppStateContextValue = {
  state: AppState
  updateNickname: (nickname: string) => void
  patchSettings: (settings: Partial<GameSettings>) => void
  startGame: () => void
  chooseMockWord: (word: string) => void
  appendStroke: (stroke: CanvasStroke) => void
  clearCanvas: () => void
  finishGame: () => void
  resetToLobby: () => void
  setConnectionStatus: (status: ConnectionStatus) => void
}

export const AppStateContext = createContext<AppStateContextValue | null>(null)
