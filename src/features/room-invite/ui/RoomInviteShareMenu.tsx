/**
 * RoomInviteShareMenu
 *
 * 책임:
 * - room invite 공유 액션 메뉴와 QR modal 표시
 * - useRoomInviteShare가 제공하는 command를 button UI에 연결
 *
 * 하지 않는 것:
 * - invite URL 생성
 * - app header/grid frame 스타일 소유
 * - session/game state 변경
 *
 * 의존:
 * - room-invite share hook
 *
 * 사용 위치:
 * - AppLayout game topbar
 */
import { useRoomInviteShare } from '@/features/room-invite/model/useRoomInviteShare'
import './RoomInviteShareMenu.css'

type RoomInviteShareMenuProps = {
  inviteUrl: string | null
  roomCode: string
}

export function RoomInviteShareMenu({ inviteUrl, roomCode }: RoomInviteShareMenuProps) {
  const {
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
  } = useRoomInviteShare({ inviteUrl, roomCode })

  if (!canShareInvite) {
    return null
  }

  return (
    <div ref={menuRef} className="room-invite-share">
      <button
        type="button"
        className={
          menuOpen
            ? 'room-invite-share__trigger room-invite-share__trigger--open'
            : 'room-invite-share__trigger'
        }
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {feedback ?? '공유'}
      </button>

      <div
        className={
          menuOpen ? 'room-invite-share__menu room-invite-share__menu--open' : 'room-invite-share__menu'
        }
        role="menu"
        aria-hidden={!menuOpen}
      >
        <button type="button" className="room-invite-share__menu-item" role="menuitem" onClick={copyInviteLink}>
          링크 복사
        </button>
        <button type="button" className="room-invite-share__menu-item" role="menuitem" onClick={openQrModal}>
          QR 코드
        </button>
        <button type="button" className="room-invite-share__menu-item" role="menuitem" onClick={copyRoomCode}>
          방 코드 복사
        </button>
        <button type="button" className="room-invite-share__menu-item" role="menuitem" onClick={shareInvite}>
          {supportsNativeShare ? '공유하기' : '링크 복사'}
        </button>
      </div>

      {qrModalOpen ? (
        <div className="room-invite-share__qr-backdrop" role="presentation" onClick={closeQrModal}>
          <div
            className="room-invite-share__qr-modal"
            role="dialog"
            aria-modal="true"
            aria-label="방 참여 QR 코드"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="room-invite-share__qr-frame">
              {qrCodeDataUrl && !qrCodeError ? (
                <img
                  className="room-invite-share__qr-image"
                  src={qrCodeDataUrl}
                  alt="방 참여 링크 QR 코드"
                />
              ) : (
                <span>{qrCodeError ? 'QR 생성 실패' : 'QR 생성 중'}</span>
              )}
            </div>
            <button type="button" className="room-invite-share__qr-close" onClick={closeQrModal}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
