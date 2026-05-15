/**
 * gameTypes
 *
 * 책임:
 * - game/room entity의 client-side domain shape 정의
 * - server snapshot을 UI가 직접 소비하지 않도록 내부 표준 모델 제공
 *
 * 하지 않는 것:
 * - WebSocket event decoding
 * - React state 관리
 * - view 전용 label/formatting
 *
 * 의존:
 * - 없음
 *
 * 사용 위치:
 * - gameStore
 * - room snapshot normalizer
 * - room-lobby feature
 */
export type RoomState = 'LOBBY' | 'RUNNING' | 'RESULT'
export type RoomType = 'PRIVATE' | 'RANDOM'
export type TurnPhase = 'READY' | 'WORD_CHOICE' | 'DRAWING' | 'TURN_END'
export type DrawingTool = 'PEN' | 'ERASER' | 'FILL'

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

export type ChatMessageTone = 'system' | 'guess' | 'correct' | 'sealed' | 'alert' | 'alert-success'

export type ChatMessage = {
  id: string
  nickname: string
  text: string
  tone: ChatMessageTone
  privilegedVisible?: boolean
  senderSessionId?: string
  mine?: boolean
  createdAt: number
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

export type RoundSummary = {
  roundNo: number
  totalRounds: number
  turnCursor: number
  drawerOrder: string[]
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

export type RoomSnapshot = {
  roomId: string | null
  roomCode: string
  roomType: RoomType
  hostSessionId: string
  roomState: RoomState
  gameId: string | null
  participants: Participant[]
  settings: GameSettings
  lobbyCanvasStrokes: CanvasStroke[]
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  chat: ChatMessage[]
}

export type GameStartedPayload = {
  gameId: string
  gameStartSec?: number
}

export type RoundStartedPayload = {
  gameId: string
  roundNo: number
  drawerSessionIds: string[]
  roundStartSec?: number
}

export type TurnStartedPayload = {
  gameId: string
  roundNo: number
  turnId: string
  drawerSessionId: string
  remainingSec: number
}

export type WordChoiceOpenedPayload = {
  drawerSessionId: string
  remainingSec: number
  wordChoices: string[]
}

export type DrawingStartedPayload = {
  gameId: string
  drawerSessionId: string
  remainingSec: number
  selectedWord: string | null
  selectedWordDescription?: string | null
  answerLength?: number
  hintPattern?: string | null
}

export type GuessCorrectPayload = {
  gameId: string
  sessionId: string
}

export type TurnEndedPayload = {
  gameId: string
  turnId: string
  reason: string
  answer: string | null
  earnedPoints: Record<string, number>
  turnEndSec?: number
}

export type GameResultPayload = {
  gameId: string
  resultSec: number
  totalPoints: Record<string, number>
}

export type ReturnToLobbyPayload = {
  gameId: string
  reason: string
  restartSec?: number
}

export type NormalizedRoomSnapshotResult = {
  ownSessionId: string
  roomSnapshot: RoomSnapshot
}

export type RoomPresencePayload = {
  sessionId: string
  nickname: string
  colorIndex?: number
}

export type RoomLeftPayload = {
  sessionId: string
  nextHostSessionId?: string
}
