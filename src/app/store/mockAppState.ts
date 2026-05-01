export type ConnectionStatus = 'idle' | 'connecting' | 'synced' | 'reconnecting'
export type RoomState = 'LOBBY' | 'RUNNING' | 'RESULT'
export type TurnPhase = 'READY' | 'WORD_CHOICE' | 'DRAWING' | 'TURN_END'
export type DrawingTool = 'PEN' | 'ERASER' | 'FILL'

export type Participant = {
  sessionId: string
  nickname: string
  colorIndex?: number
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
  hintRevealSec: number
  hintLetterCount: number
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
  drawerSessionId: string
  phase: TurnPhase
  remainingSec: number
  deadlineAtMs?: number
  correctSessionIds: string[]
  earnedPoints: Record<string, number>
  wordChoices: string[]
  selectedWord: string | null
  answerLength?: number
  canvasStrokes: CanvasStroke[]
}

export type ChatMessage = {
  id: string
  nickname: string
  text: string
  tone: 'system' | 'guess' | 'correct' | 'sealed' | 'alert' | 'alert-success'
  privilegedVisible?: boolean
  displayInChat?: boolean
  senderSessionId?: string
  mine?: boolean
  createdAt?: number
}

export type RoomSnapshot = {
  roomId: string
  roomCode: string
  roomType: 'PRIVATE'
  hostSessionId: string
  participants: Participant[]
  lobbyCanvasStrokes?: CanvasStroke[]
  settings: GameSettings
  roomState: RoomState
  gameId: string | null
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  chat: ChatMessage[]
}

export type SessionState = {
  sessionId: string
  nickname: string
  joinPending: boolean
  joinAccepted: boolean
  joinRoomCode?: string
  joinAction?: 0 | 1
  joinError?: {
    reason: string
    message: string
  }
  connectionError?: {
    reason: string
    message: string
  }
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
