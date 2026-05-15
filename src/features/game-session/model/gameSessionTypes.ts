/**
 * gameSessionTypes
 *
 * 책임:
 * - game-session feature가 사용하는 command/event 타입 정의
 *
 * 하지 않는 것:
 * - WebSocket transport 구현
 * - UI form 상태 정의
 * - raw server payload를 그대로 외부에 노출
 *
 * 의존:
 * - session entity type
 *
 * 사용 위치:
 * - gameSessionApi
 * - useGameSessionJoin
 */
import type {
  JoinSessionAccepted,
  JoinSessionRequest,
  SessionError,
} from '@/entities/session/model/sessionTypes'
import type {
  CanvasStroke,
  ChatMessage,
  DrawingStartedPayload,
  GameSettings,
  GameResultPayload,
  GameStartedPayload,
  GuessCorrectPayload,
  ReturnToLobbyPayload,
  RoomLeftPayload,
  RoomPresencePayload,
  RoomSnapshot,
  RoundStartedPayload,
  TurnEndedPayload,
  TurnStartedPayload,
  WordChoiceOpenedPayload,
} from '@/entities/game/model/gameTypes'

export type GameSessionEvent =
  | { type: 'connected' }
  | { type: 'session-synced'; payload: JoinSessionAccepted & { roomSnapshot: RoomSnapshot } }
  | { type: 'participant-joined'; payload: RoomPresencePayload }
  | { type: 'participant-left'; payload: RoomLeftPayload }
  | { type: 'canvas-stroke'; payload: CanvasStroke }
  | { type: 'canvas-cleared' }
  | { type: 'chat-message'; payload: ChatMessage }
  | { type: 'game-started'; payload: GameStartedPayload }
  | { type: 'round-started'; payload: RoundStartedPayload }
  | { type: 'turn-started'; payload: TurnStartedPayload }
  | { type: 'word-choice-opened'; payload: WordChoiceOpenedPayload }
  | { type: 'drawing-started'; payload: DrawingStartedPayload }
  | { type: 'guess-correct'; payload: GuessCorrectPayload }
  | { type: 'turn-ended'; payload: TurnEndedPayload }
  | { type: 'game-result'; payload: GameResultPayload }
  | { type: 'return-to-lobby'; payload: ReturnToLobbyPayload }
  | { type: 'join-rejected'; error: SessionError }
  | { type: 'connection-error'; error: SessionError }
  | { type: 'disconnected'; error: SessionError }

export type OpenGameSessionArgs = {
  request: JoinSessionRequest
  onEvent: (event: GameSessionEvent) => void
}

export type GameSessionConnection = {
  close: () => void
  sendCanvasClear: () => boolean
  sendCanvasStroke: (stroke: CanvasStroke) => boolean
  sendGameStart: () => boolean
  sendGuess: (text: string) => boolean
  sendSettingsUpdate: (settings: GameSettings) => boolean
  sendWordChoice: (choiceIndex: number) => boolean
}
