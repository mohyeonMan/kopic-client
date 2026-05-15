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
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { EntryPage } from '@/pages/entry/EntryPage'
import { GamePage } from '@/pages/game/GamePage'
import { useEffect } from 'react'

export function AppRouter() {
  const { navigate, route } = useAppRouter()
  const joined = useSessionStore((state) => state.status === 'joined')

  useEffect(() => {
    if (route !== routes.game || joined) {
      return
    }

    navigate(routes.main, { replace: true })
  }, [joined, navigate, route])

  return (
    <AppLayout currentRoute={route}>
      {route === routes.game && joined ? <GamePage /> : <EntryPage onNavigate={navigate} />}
    </AppLayout>
  )
}
