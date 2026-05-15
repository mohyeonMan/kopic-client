/**
 * AppRouter
 *
 * 책임:
 * - route state에 따라 page를 선택
 * - app layout과 page composition 연결
 *
 * 하지 않는 것:
 * - page 내부 상태 관리
 * - feature flow orchestration
 * - legacy route fallback 구현
 *
 * 의존:
 * - AppLayout
 * - EntryPage
 * - GamePage
 *
 * 사용 위치:
 * - AppShell
 */
import { AppLayout } from '@/app/layout/AppLayout'
import { useAppRouter } from '@/app/router/useAppRouter'
import { routes } from '@/app/router/routes'
import { useGameStore } from '@/entities/game/model/gameStore'
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { gameSessionCommands } from '@/features/game-session/model/gameSessionCommandGateway'
import { EntryPage } from '@/pages/entry/EntryPage'
import { GamePage } from '@/pages/game/GamePage'
import { useCallback, useEffect } from 'react'

export function AppRouter() {
  const { navigate, route } = useAppRouter()
  const joined = useSessionStore((state) => state.status === 'joined')
  const resetSession = useSessionStore((state) => state.resetSession)
  const resetRoom = useGameStore((state) => state.resetRoom)

  const handleLeaveGame = useCallback(() => {
    gameSessionCommands.disconnect()
    resetRoom()
    resetSession()
    navigate(routes.main, { replace: true })
  }, [navigate, resetRoom, resetSession])

  useEffect(() => {
    if (route !== routes.game || joined) {
      return
    }

    navigate(routes.main, { replace: true })
  }, [joined, navigate, route])

  return (
    <AppLayout currentRoute={route} onLeaveGame={handleLeaveGame}>
      {route === routes.game && joined ? <GamePage /> : <EntryPage onNavigate={navigate} />}
    </AppLayout>
  )
}
