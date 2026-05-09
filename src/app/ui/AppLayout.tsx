import './AppLayout.css'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { buildInvitePath, routes, type AppRoute } from '../router/routes'
import { useAppActions } from '../store/useAppActions'
import { useAppShellState } from '../store/useAppShellState'

type AppLayoutProps = {
  currentRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}

type ShellViewportState = {
  keyboardInset: number
  viewportHeight: number
}

function readShellViewportState(): ShellViewportState {
  if (typeof window === 'undefined') {
    return {
      keyboardInset: 0,
      viewportHeight: 0,
    }
  }

  const layoutViewportHeight = window.innerHeight
  const visualViewport = window.visualViewport
  const viewportHeight = Math.round(visualViewport?.height ?? layoutViewportHeight)
  const viewportTop = Math.round(visualViewport?.offsetTop ?? 0)

  return {
    keyboardInset: Math.max(0, layoutViewportHeight - viewportHeight - viewportTop),
    viewportHeight,
  }
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
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeError, setQrCodeError] = useState(false)
  const [shellViewportState, setShellViewportState] = useState<ShellViewportState>(() =>
    readShellViewportState(),
  )
  const shareMenuRef = useRef<HTMLDivElement | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const isGameRoute = currentRoute === routes.game
  const roomCode = shellState.roomCode.trim()
  const canShareRoom = roomCode.length > 0
  const inviteUrl = canShareRoom
    ? new URL(buildInvitePath(roomCode), window.location.origin).toString()
    : null
  const supportsNativeShare = typeof navigator.share === 'function'
  const shellClassName = isGameRoute ? 'app-shell app-shell-game' : 'app-shell app-shell-main'
  const shellStyle: CSSProperties | undefined = isGameRoute
    ? ({
        ['--app-shell-viewport-height' as string]:
          shellViewportState.viewportHeight > 0
            ? `${shellViewportState.viewportHeight}px`
            : '100svh',
        ['--app-shell-keyboard-inset' as string]: `${shellViewportState.keyboardInset}px`,
      }) as CSSProperties
    : undefined

  useLayoutEffect(() => {
    if (!isGameRoute || typeof window === 'undefined') {
      return
    }

    const visualViewport = window.visualViewport
    let frameId = 0

    const updateViewportState = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        setShellViewportState((current) => {
          const next = readShellViewportState()

          return current.keyboardInset === next.keyboardInset &&
            current.viewportHeight === next.viewportHeight
            ? current
            : next
        })
      })
    }

    updateViewportState()

    window.addEventListener('resize', updateViewportState)
    window.addEventListener('orientationchange', updateViewportState)
    visualViewport?.addEventListener('resize', updateViewportState)
    visualViewport?.addEventListener('scroll', updateViewportState)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('resize', updateViewportState)
      window.removeEventListener('orientationchange', updateViewportState)
      visualViewport?.removeEventListener('resize', updateViewportState)
      visualViewport?.removeEventListener('scroll', updateViewportState)
    }
  }, [isGameRoute])

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

  useEffect(() => {
    if (!qrModalOpen || typeof document === 'undefined') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQrModalOpen(false)
      }
    }

    const bodyElement = document.body
    const previousOverflow = bodyElement.style.overflow
    bodyElement.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      bodyElement.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [qrModalOpen])

  useEffect(() => {
    if (!qrModalOpen || !inviteUrl) {
      return
    }

    let disposed = false

    const generateQrCode = async () => {
      setQrCodeError(false)

      try {
        const { toDataURL } = await import('qrcode')
        const dataUrl = await toDataURL(inviteUrl, {
          errorCorrectionLevel: 'M',
          width: 420,
          margin: 2,
          color: {
            dark: '#203247',
            light: '#ffffff',
          },
        })

        if (!disposed) {
          setQrCodeDataUrl(dataUrl)
        }
      } catch {
        if (!disposed) {
          setQrCodeDataUrl(null)
          setQrCodeError(true)
        }
      }
    }

    void generateQrCode()

    return () => {
      disposed = true
    }
  }, [qrModalOpen, inviteUrl])

  useEffect(() => {
    if (!isGameRoute || typeof document === 'undefined') {
      return
    }

    const htmlElement = document.documentElement
    const bodyElement = document.body
    htmlElement.classList.add('app-html-game')
    bodyElement.classList.add('app-body-game')

    let lastTouchEndAt = 0

    const preventGesture = (event: Event) => {
      event.preventDefault()
    }

    const preventMultiTouchZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault()
      }
    }

    const preventDoubleTapZoom = (event: TouchEvent) => {
      const now = Date.now()

      if (now - lastTouchEndAt < 280) {
        event.preventDefault()
      }

      lastTouchEndAt = now
    }

    document.addEventListener('gesturestart', preventGesture as EventListener, { passive: false })
    document.addEventListener('gesturechange', preventGesture as EventListener, { passive: false })
    document.addEventListener('gestureend', preventGesture as EventListener, { passive: false })
    document.addEventListener('touchmove', preventMultiTouchZoom, { passive: false })
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })

    return () => {
      htmlElement.classList.remove('app-html-game')
      bodyElement.classList.remove('app-body-game')
      document.removeEventListener('gesturestart', preventGesture as EventListener)
      document.removeEventListener('gesturechange', preventGesture as EventListener)
      document.removeEventListener('gestureend', preventGesture as EventListener)
      document.removeEventListener('touchmove', preventMultiTouchZoom)
      document.removeEventListener('touchend', preventDoubleTapZoom)
    }
  }, [isGameRoute])

  const showShareFeedback = (message: string) => {
    setShareFeedback(message)

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setShareFeedback(null)
    }, 1400)
  }

  const copyInviteLink = async () => {
    if (!inviteUrl) {
      return false
    }

    try {
      await copyText(inviteUrl)
      showShareFeedback('링크 복사됨')
      return true
    } catch {
      showShareFeedback('복사 실패')
      return false
    }
  }

  const handleCopyInviteLink = async () => {
    try {
      await copyInviteLink()
    } finally {
      setShareMenuOpen(false)
    }
  }

  const handleOpenQrCode = () => {
    if (!inviteUrl) {
      return
    }

    setQrCodeDataUrl(null)
    setQrCodeError(false)
    setQrModalOpen(true)
    setShareMenuOpen(false)
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
      if (supportsNativeShare) {
        const shareCandidates = [
          {
            title: `KOPIC 방 ${roomCode}`,
            text: `${roomCode} 방으로 바로 참여하세요.`,
            url: inviteUrl,
          },
          {
            text: `${roomCode} 방으로 바로 참여하세요.\n${inviteUrl}`,
          },
          {
            url: inviteUrl,
          },
        ]

        let shared = false
        let lastShareError: unknown = null

        for (const candidate of shareCandidates) {
          try {
            if (typeof navigator.canShare === 'function' && !navigator.canShare(candidate)) {
              continue
            }

            await navigator.share(candidate)
            shared = true
            break
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              throw error
            }

            lastShareError = error
          }
        }

        if (!shared) {
          if (lastShareError) {
            throw lastShareError
          }

          throw new Error('native share unavailable')
        }

        showShareFeedback('공유됨')
      } else {
        await copyText(inviteUrl)
        showShareFeedback('기기 공유 미지원, 링크 복사됨')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setShareFeedback(null)
      } else {
        try {
          await copyText(inviteUrl)
          showShareFeedback('공유 실패, 링크 복사됨')
        } catch {
          showShareFeedback('공유 실패')
        }
      }
    } finally {
      setShareMenuOpen(false)
    }
  }

  return (
    <div className={shellClassName} style={shellStyle}>
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
                      onClick={handleOpenQrCode}
                    >
                      QR코드
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
                      {supportsNativeShare ? '공유하기' : '공유하기'}
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

      {qrModalOpen && inviteUrl ? (
        <div
          className="topbar-qr-modal-backdrop"
          role="presentation"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="topbar-qr-modal"
            role="dialog"
            aria-modal="true"
            aria-label="방 참여 QR 코드"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="topbar-qr-modal-code-frame">
              {qrCodeDataUrl && !qrCodeError ? (
                <img
                  className="topbar-qr-modal-image"
                  src={qrCodeDataUrl}
                  alt="방 참여 링크 QR 코드"
                />
              ) : null}
            </div>

            <div className="topbar-qr-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setQrModalOpen(false)}
              >
                {'닫기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
