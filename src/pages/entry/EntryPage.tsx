/**
 * EntryPage
 *
 * 책임:
 * - entry route에서 entry-join feature와 session command boundary를 조립
 * - invite route/search parameter를 feature 초기값으로 전달
 * - session joined 상태가 되면 game route로 이동
 *
 * 하지 않는 것:
 * - entry form UI 구현
 * - WebSocket API 직접 호출
 * - session store 내부 mutation 규칙 소유
 *
 * 의존:
 * - entry-join feature
 * - session entity store
 *
 * 사용 위치:
 * - AppRouter
 */
import { useEffect, useMemo } from 'react'
import type { AppRoute } from '@/app/router/routes'
import { readInviteRoomCode, routes } from '@/app/router/routes'
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { EntryJoinView } from '@/features/entry-join/ui/EntryJoinView'

type EntryPageProps = {
  onNavigate: (route: AppRoute, options?: { replace?: boolean }) => void
}

export function EntryPage({ onNavigate }: EntryPageProps) {
  const status = useSessionStore((state) => state.status)
  const nickname = useSessionStore((state) => state.nickname)
  const joinError = useSessionStore((state) => state.joinError)
  const connectionError = useSessionStore((state) => state.connectionError)
  const startJoin = useSessionStore((state) => state.startJoin)
  const dismissJoinError = useSessionStore((state) => state.dismissJoinError)
  const dismissConnectionError = useSessionStore((state) => state.dismissConnectionError)
  const initialRoomCode = useMemo(() => {
    const pathRoomCode = readInviteRoomCode(window.location.pathname)
    const searchRoomCode = new URLSearchParams(window.location.search).get('roomCode')?.trim() ?? null

    return pathRoomCode && pathRoomCode.length > 0
      ? pathRoomCode
      : searchRoomCode && searchRoomCode.length > 0
        ? searchRoomCode
        : null
  }, [])

  useEffect(() => {
    if (status !== 'joined') {
      return
    }

    onNavigate(routes.game, { replace: true })
  }, [onNavigate, status])

  return (
    <EntryJoinView
      connectionError={connectionError}
      initialNickname={nickname}
      initialRoomCode={initialRoomCode}
      joinError={joinError}
      status={status}
      onDismissConnectionError={dismissConnectionError}
      onDismissJoinError={dismissJoinError}
      onSubmit={startJoin}
    />
  )
}
