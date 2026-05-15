/**
 * gameSettingsProtocol
 *
 * 책임:
 * - game settings entity shape를 서버 compact payload로 변환
 *
 * 하지 않는 것:
 * - WebSocket 전송
 * - settings form 상태 관리
 * - store mutation
 *
 * 의존:
 * - game settings type
 *
 * 사용 위치:
 * - gameSessionApi
 */
import type { GameSettings } from '@/entities/game/model/gameTypes'

export type CompactGameSettingsPayload = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
]

export function encodeCompactGameSettings(settings: GameSettings): CompactGameSettingsPayload {
  return [
    settings.roundCount,
    settings.drawSec,
    settings.wordChoiceSec,
    settings.wordChoiceCount,
    settings.hintRevealSec,
    settings.hintLetterCount,
    settings.drawerOrderMode === 'RANDOM' ? 1 : 0,
    settings.endMode === 'TIME_OR_ALL_CORRECT' ? 1 : 0,
    settings.customWordMode === 'CUSTOM_ONLY' ? 0 : 1,
    settings.customWordsRaw ?? '',
  ]
}

