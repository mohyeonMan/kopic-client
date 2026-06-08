export type ConnectionStatus = 'idle' | 'connecting' | 'synced' | 'reconnecting'
export type RoomState = 'LOBBY' | 'RUNNING' | 'RESULT'
export type TurnPhase = 'READY' | 'WORD_CHOICE' | 'DRAWING' | 'TURN_END'
export type DrawingTool = 'PEN' | 'ERASER' | 'FILL'
export type GameSoundName =
  | 'cardSlide'
  | 'clearAll'
  | 'correct'
  | 'gameResult'
  | 'participantJoin'
  | 'participantLeave'
  | 'turnResult'

export type GameSoundEvent = {
  id: string
  sound: GameSoundName
}

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
  customWordMode: 'CUSTOM_ONLY' | 'BASE_PLUS_CUSTOM'
  customWordsRaw: string
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
  size: number
}

export type CanvasStroke = {
  id: string
  cid?: string
  tool: DrawingTool
  color: string
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
  selectedWordDescription?: string | null
  answerLength?: number
  hintPattern?: string | null
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
  roomType: 'PRIVATE' | 'RANDOM'
  hostSessionId: string
  participants: Participant[]
  lobbyCanvasStrokes?: CanvasStroke[]
  settings: GameSettings
  roomState: RoomState
  gameId: string | null
  gameStartRemainingSec?: number
  gameStartDeadlineAtMs?: number
  roundStartRemainingSec?: number
  roundStartDeadlineAtMs?: number
  resultRemainingSec?: number
  resultDeadlineAtMs?: number
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  chat: ChatMessage[]
}

export type SessionState = {
  sessionId: string
  nickname: string
  joinPending: boolean
  joinAccepted: boolean
  wsDrainRejoinPending: boolean
  notificationToast?: {
    id: string
    text: string
  }
  joinRoomCode?: string
  joinAction?: 0 | 1
  joinError?: {
    reason: string
    message: string
  }
  connectionError?: {
    reason: string
    message: string
    code?: number
  }
  actionError?: {
    reason: string
    message: string
    code?: number
  }
}

export type AppState = {
  session: SessionState
  connectionStatus: ConnectionStatus
  room: RoomSnapshot
  soundEvents: GameSoundEvent[]
}
