import { useState, type ReactNode } from 'react'
import { buildInvitePath, routes, type AppRoute } from '../router/routes'
import { useAppState } from '../store/useAppState'

type AppLayoutProps = {
  currentRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}

export function AppLayout({ currentRoute, onNavigate, children }: AppLayoutProps) {
  const { state, actions } = useAppState()
  const [copied, setCopied] = useState(false)
  const isGameRoute = currentRoute === routes.game
  const canCopyInviteLink =
    state.room.roomCode.trim().length > 0 &&
    (state.session.joinAction === 1 || Boolean(state.session.joinRoomCode))
  const shellClassName = isGameRoute ? 'app-shell app-shell-game' : 'app-shell app-shell-main'

  const handleCopyCode = async () => {
    if (!canCopyInviteLink) {
      return
    }

    try {
      const inviteUrl = new URL(buildInvitePath(state.room.roomCode), window.location.origin).toString()
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={shellClassName}>
      {isGameRoute ? (
        <header className="topbar">
          <h1 className="topbar-brand">KOPIC</h1>
          <div className="topbar-meta topbar-meta-game">
            <strong className="topbar-room-name">{state.room.roomCode}</strong>
            {canCopyInviteLink ? (
              <button type="button" className="secondary-button topbar-copy-button" onClick={handleCopyCode}>
                {copied ? '\uBCF5\uC0AC\uB428' : '\uB9C1\uD06C \uBCF5\uC0AC'}
              </button>
            ) : null}
            <button
              type="button"
              className="route-tab topbar-exit-button"
              onClick={() => {
                actions.clearRoomCache()
                onNavigate(routes.main)
              }}
            >
              {'\uB098\uAC00\uAE30'}
            </button>
          </div>
        </header>
      ) : null}

      <main className="page-frame">{children}</main>

      <footer className="app-footer">
        <p className="app-footer-title">KOPIC</p>
        <p className="app-footer-meta">
          Developer: <span className="app-footer-value">Your Name</span>
        </p>
        <p className="app-footer-meta">
          Contact: <span className="app-footer-value">you@example.com</span>
        </p>
      </footer>
    </div>
  )
}
