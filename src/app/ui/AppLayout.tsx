import { useState, type ReactNode } from 'react'
import { buildInvitePath, routes, type AppRoute } from '../router/routes'
import { useAppState } from '../store/useAppState'

type AppLayoutProps = {
  currentRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error('clipboard copy failed')
  }
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
      await copyText(inviteUrl)
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
                {copied ? '복사됨' : '링크 복사'}
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
              {'나가기'}
            </button>
          </div>
        </header>
      ) : null}

      <main className="page-frame">{children}</main>

      <footer className="app-footer">
        <p className="app-footer-title">KOPIC</p>
        <p className="app-footer-meta">
          Developer: <span className="app-footer-value">mohyeonMan 박지훈</span>
        </p>
        <p className="app-footer-meta">
          Contact: <span className="app-footer-value">qkrwlgns0510@gmail.com</span>
        </p>
        <p className="app-footer-meta">
          Github: <span className="app-footer-value">https://github.com/mohyeonMan</span>
        </p>
      </footer>
    </div>
  )
}
