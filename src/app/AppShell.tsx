/**
 * AppShell
 *
 * 책임:
 * - app provider와 router를 조립하는 최상위 shell
 * - app layer의 composition root 역할
 *
 * 하지 않는 것:
 * - feature 세부 상태 orchestration
 * - API/WS 요청 직접 수행
 * - page UI 구현
 *
 * 의존:
 * - AppProviders
 * - AppRouter
 *
 * 사용 위치:
 * - App.tsx
 */
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router/AppRouter'
import { GameSessionRuntime } from '@/features/game-session/ui/GameSessionRuntime'

export function AppShell() {
  return (
    <AppProviders>
      <GameSessionRuntime />
      <AppRouter />
    </AppProviders>
  )
}
