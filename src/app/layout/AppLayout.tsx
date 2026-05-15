/**
 * AppLayout
 *
 * 책임:
 * - app route별 shell frame(topbar/main container) 제공
 * - game route에서 room context와 leave action 진입점 제공
 *
 * 하지 않는 것:
 * - feature panel(board/chat/participants) layout 소유
 * - WebSocket command 직접 호출
 * - room share 정책/QR UI 상태 구현
 *
 * 의존:
 * - app route type
 * - session entity(roomCode 표시)
 *
 * 사용 위치:
 * - AppRouter
 */
import type { ReactNode } from 'react'
import { buildInvitePath, routes, type AppRoute } from '@/app/router/routes'
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { RoomInviteShareMenu } from '@/features/room-invite/ui/RoomInviteShareMenu'
import './AppLayout.css'

type AppLayoutProps = {
  currentRoute: AppRoute
  children: ReactNode
  onLeaveGame?: () => void
}

export function AppLayout({ currentRoute, children, onLeaveGame }: AppLayoutProps) {
  const roomCode = useSessionStore((state) => state.roomCode)
  const isGameRoute = currentRoute === routes.game
  const normalizedRoomCode = roomCode?.trim() ?? ''
  const inviteUrl =
    isGameRoute && normalizedRoomCode && typeof window !== 'undefined'
      ? new URL(buildInvitePath(normalizedRoomCode), window.location.origin).toString()
      : null

  return (
    <div className={isGameRoute ? 'app-layout app-layout--game' : 'app-layout'} data-route={currentRoute}>
      <header className={isGameRoute ? 'app-layout__header app-layout__header--game' : 'app-layout__header'}>
        <span className="app-layout__brand">KOPIC</span>
        {isGameRoute ? (
          <div className="app-layout__game-meta">
            <strong className="app-layout__room-code">{normalizedRoomCode || '-'}</strong>
            <RoomInviteShareMenu inviteUrl={inviteUrl} roomCode={normalizedRoomCode} />
            <button type="button" className="app-layout__leave-button" onClick={() => onLeaveGame?.()}>
              나가기
            </button>
          </div>
        ) : (
          <span className="app-layout__status">feature migration</span>
        )}
      </header>
      <main className="app-layout__main">{children}</main>
    </div>
  )
}
