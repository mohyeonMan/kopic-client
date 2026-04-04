export type ConnectionStatus = 'idle' | 'connecting' | 'synced' | 'reconnecting'
export type RoomState = 'LOBBY' | 'RUNNING' | 'RESULT'
export type TurnPhase = 'WORD_CHOICE' | 'DRAWING' | 'TURN_END'
export type DrawingTool = 'PEN' | 'ERASER' | 'FILL'

export type Participant = {
  userId: string
  nickname: string
  isHost: boolean
  score: number
  isOnline: boolean
  joinOrder: number
  joinedMidRound: boolean
}

export type GameSettings = {
  roundCount: number
  drawSec: number
  wordChoiceSec: number
  wordChoiceCount: number
  drawerOrderMode: 'JOIN_ORDER' | 'RANDOM'
  endMode: 'FIRST_CORRECT' | 'TIME_OR_ALL_CORRECT'
}

export type RoundSummary = {
  roundNo: number
  totalRounds: number
  turnCursor: number
  drawerOrder: string[]
}

export type CanvasPoint = {
  x: number
  y: number
}

export type CanvasStroke = {
  id: string
  tool: DrawingTool
  color: string
  size: number
  points: CanvasPoint[]
}

export type TurnSummary = {
  roundNo: number
  turnNo: number
  turnId: string
  drawerUserId: string
  phase: TurnPhase
  remainingSec: number
  correctUserIds: string[]
  wordChoices: string[]
  selectedWord: string | null
  canvasStrokes: CanvasStroke[]
}

export type ChatMessage = {
  id: string
  nickname: string
  text: string
  tone: 'system' | 'guess' | 'correct'
}

export type RoomSnapshot = {
  roomId: string
  roomCode: string
  roomType: 'PRIVATE'
  hostUserId: string
  participants: Participant[]
  settings: GameSettings
  roomState: RoomState
  gameId: string | null
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  chat: ChatMessage[]
}

export type SessionState = {
  userId: string
  nickname: string
}

export type AppState = {
  session: SessionState
  connectionStatus: ConnectionStatus
  room: RoomSnapshot
}

export const defaultSettings: GameSettings = {
  roundCount: 3,
  drawSec: 40,
  wordChoiceSec: 10,
  wordChoiceCount: 3,
  drawerOrderMode: 'JOIN_ORDER',
  endMode: 'TIME_OR_ALL_CORRECT',
}

const initialParticipants: Participant[] = [
  {
    userId: 'u-100',
    nickname: 'Jihoon',
    isHost: true,
    score: 32,
    isOnline: true,
    joinOrder: 1,
    joinedMidRound: false,
  },
  {
    userId: 'u-200',
    nickname: 'Mina',
    isHost: false,
    score: 26,
    isOnline: true,
    joinOrder: 2,
    joinedMidRound: false,
  },
  {
    userId: 'u-300',
    nickname: 'Theo',
    isHost: false,
    score: 14,
    isOnline: true,
    joinOrder: 3,
    joinedMidRound: true,
  },
]

export const initialAppState: AppState = {
  session: {
    userId: 'u-100',
    nickname: 'Jihoon',
  },
  connectionStatus: 'synced',
  room: {
    roomId: 'room-01',
    roomCode: 'KOPIC7',
    roomType: 'PRIVATE',
    hostUserId: 'u-100',
    participants: initialParticipants,
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
