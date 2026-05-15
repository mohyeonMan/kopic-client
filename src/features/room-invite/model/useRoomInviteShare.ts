/**
 * useRoomInviteShare
 *
 * 책임:
 * - room invite 공유 메뉴의 UI 상태와 browser API 호출 소유
 * - clipboard/native share/QR 생성 fallback을 한 feature 안에 격리
 *
 * 하지 않는 것:
 * - invite URL route path 생성
 * - session/game store mutation
 * - app topbar frame layout 제어
 *
 * 의존:
 * - browser clipboard/share APIs
 * - qrcode dynamic import
 *
 * 사용 위치:
 * - RoomInviteShareMenu
 */
import { useEffect, useRef, useState } from 'react'

type UseRoomInviteShareArgs = {
  inviteUrl: string | null
  roomCode: string
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

export function useRoomInviteShare({ inviteUrl, roomCode }: UseRoomInviteShareArgs) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeError, setQrCodeError] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const normalizedRoomCode = roomCode.trim()
  const canShareInvite = normalizedRoomCode.length > 0 && inviteUrl !== null
  const supportsNativeShare = typeof navigator.share === 'function'

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

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
      setQrCodeDataUrl(null)
      setQrCodeError(false)

      try {
        const { toDataURL } = await import('qrcode')
        const dataUrl = await toDataURL(inviteUrl, {
          color: {
            dark: '#17202a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 420,
        })

        if (!disposed) {
          setQrCodeDataUrl(dataUrl)
        }
      } catch {
        if (!disposed) {
          setQrCodeError(true)
        }
      }
    }

    void generateQrCode()

    return () => {
      disposed = true
    }
  }, [inviteUrl, qrModalOpen])

  const showFeedback = (message: string) => {
    setFeedback(message)

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null)
    }, 1400)
  }

  const closeQrModal = () => {
    setQrModalOpen(false)
  }

  const copyInviteLink = async () => {
    if (!inviteUrl) {
      return
    }

    try {
      await copyText(inviteUrl)
      showFeedback('링크 복사됨')
    } catch {
      showFeedback('복사 실패')
    } finally {
      setMenuOpen(false)
    }
  }

  const copyRoomCode = async () => {
    if (!normalizedRoomCode) {
      return
    }

    try {
      await copyText(normalizedRoomCode)
      showFeedback('코드 복사됨')
    } catch {
      showFeedback('복사 실패')
    } finally {
      setMenuOpen(false)
    }
  }

  const openQrModal = () => {
    if (!inviteUrl) {
      return
    }

    setQrModalOpen(true)
    setMenuOpen(false)
  }

  const shareInvite = async () => {
    if (!inviteUrl) {
      return
    }

    try {
      if (supportsNativeShare) {
        const shareCandidates: ShareData[] = [
          {
            title: `KOPIC 방 ${normalizedRoomCode}`,
            text: `${normalizedRoomCode} 방으로 바로 참여하세요.`,
            url: inviteUrl,
          },
          {
            text: `${normalizedRoomCode} 방으로 바로 참여하세요.\n${inviteUrl}`,
          },
          {
            url: inviteUrl,
          },
        ]

        for (const candidate of shareCandidates) {
          if (typeof navigator.canShare === 'function' && !navigator.canShare(candidate)) {
            continue
          }

          await navigator.share(candidate)
          showFeedback('공유됨')
          setMenuOpen(false)
          return
        }
      }

      await copyText(inviteUrl)
      showFeedback(supportsNativeShare ? '공유 실패, 링크 복사됨' : '링크 복사됨')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFeedback(null)
      } else {
        try {
          await copyText(inviteUrl)
          showFeedback('공유 실패, 링크 복사됨')
        } catch {
          showFeedback('공유 실패')
        }
      }
    } finally {
      setMenuOpen(false)
    }
  }

  return {
    canShareInvite,
    closeQrModal,
    copyInviteLink,
    copyRoomCode,
    feedback,
    menuOpen,
    menuRef,
    openQrModal,
    qrCodeDataUrl,
    qrCodeError,
    qrModalOpen,
    setMenuOpen,
    shareInvite,
    supportsNativeShare,
  }
}
