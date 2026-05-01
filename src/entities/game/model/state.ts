import type { AppState, GameSettings } from './types'

export const defaultSettings: GameSettings = {
  roundCount: 3,
  drawSec: 40,
  wordChoiceSec: 10,
  wordChoiceCount: 3,
  hintRevealSec: 10,
  hintLetterCount: 1,
  drawerOrderMode: 'JOIN_ORDER',
  endMode: 'TIME_OR_ALL_CORRECT',
}

export const initialAppState: AppState = {
  session: {
    sessionId: 's-100',
    nickname: '',
    joinPending: false,
    joinAccepted: false,
    joinRoomCode: undefined,
    joinAction: undefined,
    joinError: undefined,
    connectionError: undefined,
  },
  connectionStatus: 'idle',
  room: {
    roomId: 'room-01',
    roomCode: 'KOPIC7',
    roomType: 'PRIVATE',
    hostSessionId: 's-100',
    participants: [],
    lobbyCanvasStrokes: [],
    settings: defaultSettings,
    roomState: 'LOBBY',
    gameId: null,
    currentRound: null,
    currentTurn: null,
    chat: [
      { id: 'm-1', nickname: 'system', text: '408 GAME_SNAPSHOT applied', tone: 'system' },
      { id: 'm-2', nickname: 'system', text: 'mid-round joiners guess now and draw next round', tone: 'system' },
    ],
  },
}
