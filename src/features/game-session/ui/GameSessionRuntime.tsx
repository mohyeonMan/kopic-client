/**
 * GameSessionRuntime
 *
 * 책임:
 * - app shell 아래에서 game-session lifecycle hook을 항상 mount
 * - route 변경과 무관하게 WebSocket session을 유지
 *
 * 하지 않는 것:
 * - UI 렌더링
 * - route navigation
 * - entry/game feature UI 구현
 *
 * 의존:
 * - useGameSessionRuntime
 *
 * 사용 위치:
 * - AppShell
 */
import { useGameSessionRuntime } from '@/features/game-session/model/useGameSessionRuntime'

export function GameSessionRuntime() {
  useGameSessionRuntime()
  return null
}

