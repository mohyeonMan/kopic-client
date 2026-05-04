import './AppLayout.css'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { buildInvitePath, routes, type AppRoute } from '../router/routes'
import { useAppActions } from '../store/useAppActions'
import { useAppShellState } from '../store/useAppShellState'

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
  const actions = useAppActions()
  const shellState = useAppShellState()
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const isGameRoute = currentRoute === routes.game
  const roomCode = shellState.roomCode.trim()
  const canShareRoom = roomCode.length > 0
  const inviteUrl = canShareRoom
    ? new URL(buildInvitePath(roomCode), window.location.origin).toString()
    : null
  const canUseNativeShare = typeof navigator.share === 'function'
  const shellClassName = isGameRoute ? 'app-shell app-shell-game' : 'app-shell app-shell-main'

  useEffect(() => {
    if (!shareMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!shareMenuRef.current?.contains(event.target as Node)) {
        setShareMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShareMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shareMenuOpen])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const showShareFeedback = (message: string) => {
    setShareFeedback(message)

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setShareFeedback(null)
    }, 1400)
  }

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) {
      return
    }

    try {
      await copyText(inviteUrl)
      showShareFeedback('링크 복사됨')
    } catch {
      showShareFeedback('복사 실패')
    } finally {
      setShareMenuOpen(false)
    }
  }

  const handleCopyRoomCode = async () => {
    if (!roomCode) {
      return
    }

    try {
      await copyText(roomCode)
      showShareFeedback('코드 복사됨')
    } catch {
      showShareFeedback('복사 실패')
    } finally {
      setShareMenuOpen(false)
    }
  }

  const handleNativeShare = async () => {
    if (!inviteUrl) {
      return
    }

    try {
      if (canUseNativeShare) {
        await navigator.share({
          title: `KOPIC 방 ${roomCode}`,
          text: `${roomCode} 방으로 바로 참여하세요.`,
          url: inviteUrl,
        })
        showShareFeedback('공유됨')
      } else {
        await copyText(inviteUrl)
        showShareFeedback('링크 복사됨')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setShareFeedback(null)
      } else {
        showShareFeedback('공유 실패')
      }
    } finally {
      setShareMenuOpen(false)
    }
  }

  return (
    <div className={shellClassName}>
      {isGameRoute ? (
        <header className="topbar">
          <h1 className="topbar-brand">KOPIC</h1>
          <div className="topbar-meta topbar-meta-game">
            <strong className="topbar-room-name">{shellState.roomCode}</strong>
            <div ref={shareMenuRef} className="topbar-actions">
              {canShareRoom ? (
                <>
                  <button
                    type="button"
                    className={
                      shareMenuOpen
                        ? 'secondary-button topbar-share-button topbar-share-button-open'
                        : 'secondary-button topbar-share-button'
                    }
                    aria-expanded={shareMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setShareMenuOpen((open) => !open)}
                  >
                    {shareFeedback ?? '공유'}
                  </button>

                  <div
                    className={
                      shareMenuOpen ? 'topbar-share-menu topbar-share-menu-open' : 'topbar-share-menu'
                    }
                    role="menu"
                    aria-hidden={!shareMenuOpen}
                  >
                    <button
                      type="button"
                      className="topbar-share-menu-item"
                      role="menuitem"
                      onClick={handleCopyInviteLink}
                    >
                      링크 복사
                    </button>
                    <button
                      type="button"
                      className="topbar-share-menu-item"
                      role="menuitem"
                      onClick={handleCopyRoomCode}
                    >
                      방 코드 복사
                    </button>
                    <button
                      type="button"
                      className="topbar-share-menu-item"
                      role="menuitem"
                      onClick={handleNativeShare}
                    >
                      {canUseNativeShare ? '공유하기' : '공유하기(복사)'}
                    </button>
                  </div>
                </>
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
