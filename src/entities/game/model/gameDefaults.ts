/**
 * gameDefaults
 *
 * 책임:
 * - game entity의 기본값을 한 곳에 정의
 * - snapshot 일부 필드가 누락되어도 UI가 안정적으로 렌더링할 fallback 제공
 *
 * 하지 않는 것:
 * - server response normalization
 * - UI 표시 문자열 정의
 *
 * 의존:
 * - game entity types
 *
 * 사용 위치:
 * - gameStore
 * - room snapshot normalizer
 */
import type { GameSettings, RoomSnapshot } from '@/entities/game/model/gameTypes'

export const defaultGameSettings: GameSettings = {
  roundCount: 3,
  drawSec: 40,
  wordChoiceSec: 10,
  wordChoiceCount: 3,
  hintRevealSec: 10,
  hintLetterCount: 1,
  drawerOrderMode: 'JOIN_ORDER',
  endMode: 'TIME_OR_ALL_CORRECT',
  customWordMode: 'BASE_PLUS_CUSTOM',
  customWordsRaw: '',
}

export const emptyRoomSnapshot: RoomSnapshot = {
  roomId: null,
  roomCode: '',
  roomType: 'PRIVATE',
  hostSessionId: '',
  roomState: 'LOBBY',
  gameId: null,
  participants: [],
  settings: defaultGameSettings,
  lobbyCanvasStrokes: [],
  currentRound: null,
  currentTurn: null,
  chat: [],
}
