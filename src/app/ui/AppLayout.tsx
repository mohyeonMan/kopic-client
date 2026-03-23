import type { ReactNode } from 'react'
import { routes, type AppRoute } from '../router/routes'
import { useAppState } from '../store/useAppState'

type AppLayoutProps = {
  currentRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}

const routeLabels: Record<AppRoute, string> = {
  [routes.entry]: 'Entry',
  [routes.lobby]: 'Lobby',
  [routes.game]: 'Game',
  [routes.result]: 'Result',
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
          <div className="pill">{state.connectionStatus}</div>
          <div className="pill">{state.room.roomCode}</div>
          <div className="pill">{state.session.nickname}</div>
        </div>
      </header>

      <nav className="route-tabs" aria-label="Prototype routes">
        {Object.values(routes).map((route) => (
          <button
            key={route}
            type="button"
            className={route === currentRoute ? 'route-tab route-tab-active' : 'route-tab'}
            onClick={() => onNavigate(route)}
          >
            {routeLabels[route]}
          </button>
        ))}
      </nav>

      <main className="page-frame">{children}</main>
    </div>
  )
}
