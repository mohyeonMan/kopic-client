import { useState, type ReactNode } from 'react'
import { routes, type AppRoute } from '../router/routes'
import { useAppState } from '../store/useAppState'

type AppLayoutProps = {
  currentRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}

export function AppLayout({ currentRoute, onNavigate, children }: AppLayoutProps) {
  const { state } = useAppState()
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.room.roomCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">KOPIC-CLIENT</p>
        </div>
        <div className={currentRoute === routes.game ? 'topbar-meta topbar-meta-game' : 'topbar-meta'}>
          {currentRoute === routes.game ? (
            <strong className="topbar-room-name">{state.room.roomCode}</strong>
          ) : null}
          {currentRoute === routes.game ? (
            <button type="button" className="secondary-button topbar-copy-button" onClick={handleCopyCode}>
              {copied ? '복사됨' : '링크 복사'}
            </button>
          ) : null}
          <button type="button" className="route-tab topbar-exit-button" onClick={() => onNavigate(routes.main)}>
            나가기
          </button>
        </div>
      </header>

      <main className="page-frame">{children}</main>
    </div>
  )
}
