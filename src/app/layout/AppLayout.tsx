/**
 * AppLayout
 *
 * 책임:
 * - 앱 공통 shell layout 제공
 * - route와 무관한 최소 frame만 담당
 *
 * 하지 않는 것:
 * - feature별 toolbar/menu 구현
 * - room share, game mobile guard 같은 특정 정책 포함
 * - 전역 상태 변경
 *
 * 의존:
 * - app route type
 *
 * 사용 위치:
 * - AppRouter
 */
import type { ReactNode } from 'react'
import type { AppRoute } from '@/app/router/routes'
import './AppLayout.css'

type AppLayoutProps = {
  currentRoute: AppRoute
  children: ReactNode
}

export function AppLayout({ currentRoute, children }: AppLayoutProps) {
  return (
    <div className="app-layout" data-route={currentRoute}>
      <header className="app-layout__header">
        <span className="app-layout__brand">KOPIC</span>
        <span className="app-layout__status">feature migration</span>
      </header>
      <main className="app-layout__main">{children}</main>
    </div>
  )
}
