import type { ReactNode } from 'react'
import { routes, type AppRoute } from '../router/routes'
import { useAppState } from '../store/useAppState'

type AppLayoutProps = {
  currentRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}

const routeLabels: Record<AppRoute, string> = {
  [routes.main]: 'Main',
  [routes.game]: 'Game',
}

export function AppLayout({ currentRoute, onNavigate, children }: AppLayoutProps) {
  const { state } = useAppState()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">kopic-client</p>
          <h1>Catchmind-style client scaffold</h1>
        </div>
        <div className="topbar-meta">
          <button
            type="button"
            className={currentRoute === routes.main ? 'route-tab route-tab-active' : 'route-tab'}
            onClick={() => onNavigate(routes.main)}
          >
            {routeLabels[routes.main]}
          </button>
          <button
            type="button"
            className={currentRoute === routes.game ? 'route-tab route-tab-active' : 'route-tab'}
            onClick={() => onNavigate(routes.game)}
          >
            {routeLabels[routes.game]}
          </button>
          <div className="pill">{state.connectionStatus}</div>
          <div className="pill">{state.room.roomCode}</div>
          <div className="pill">{state.session.nickname}</div>
        </div>
      </header>

      <main className="page-frame">{children}</main>
    </div>
  )
}
