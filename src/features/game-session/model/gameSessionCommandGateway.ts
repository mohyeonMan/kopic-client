/**
 * gameSessionCommandGateway
 *
 * 책임:
 * - runtime이 소유한 현재 GameSessionConnection에 feature command를 전달
 * - UI feature가 WebSocket transport 객체를 직접 알지 않도록 차단
 *
 * 하지 않는 것:
 * - Zustand store 역할 대체
 * - 서버 응답 처리
 * - retry/queue 정책 구현
 *
 * 주의:
 * - 이 모듈의 mutable reference는 WebSocket connection ownership을 app runtime에 고정하기 위한 boundary다.
 * - command가 실패하면 caller는 boolean으로만 판단하고 UI 상태를 직접 추측하지 않는다.
 */
import type { CanvasStroke } from '@/entities/game/model/gameTypes'
import type { GameSettings } from '@/entities/game/model/gameTypes'
import type { GameSessionConnection } from '@/features/game-session/model/gameSessionTypes'

let activeConnection: GameSessionConnection | null = null

export function bindGameSessionConnection(connection: GameSessionConnection | null) {
  activeConnection = connection
}

export const gameSessionCommands = {
  sendCanvasClear() {
    return activeConnection?.sendCanvasClear() ?? false
  },
  sendCanvasStroke(stroke: CanvasStroke) {
    return activeConnection?.sendCanvasStroke(stroke) ?? false
  },
  sendGuess(text: string) {
    return activeConnection?.sendGuess(text) ?? false
  },
  sendGameStart() {
    return activeConnection?.sendGameStart() ?? false
  },
  sendSettingsUpdate(settings: GameSettings) {
    return activeConnection?.sendSettingsUpdate(settings) ?? false
  },
  sendWordChoice(choiceIndex: number) {
    return activeConnection?.sendWordChoice(choiceIndex) ?? false
  },
}
