/**
 * routes
 *
 * 책임:
 * - 앱에서 허용하는 route path를 한 곳에 선언
 * - Vite base path와 무관하게 route 비교 기준을 안정화
 *
 * 하지 않는 것:
 * - navigation side effect 수행
 * - route별 component import
 * - feature 권한 판단
 *
 * 의존:
 * - Vite env BASE_URL
 *
 * 사용 위치:
 * - AppRouter
 * - useAppRouter
 */
function normalizeBasePath(baseUrl: string) {
  if (!baseUrl || baseUrl === '/') {
    return ''
  }

  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function normalizeRoutePath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

const routeBase = normalizeBasePath(import.meta.env.BASE_URL)

export const routes = {
  main: routeBase || '/',
  game: routeBase ? `${routeBase}/game` : '/game',
} as const

export type AppRoute = (typeof routes)[keyof typeof routes]

export function buildInvitePath(roomCode: string) {
  const normalizedRoomCode = roomCode.trim()

  if (!normalizedRoomCode) {
    return routes.main
  }

  const encodedRoomCode = encodeURIComponent(normalizedRoomCode)
  return routeBase ? `${routeBase}/${encodedRoomCode}` : `/${encodedRoomCode}`
}

export function readInviteRoomCode(pathname: string) {
  const normalizedPath = normalizeRoutePath(pathname)

  if (normalizedPath === routes.main || normalizedPath === routes.game) {
    return null
  }

  if (routeBase) {
    const invitePrefix = `${routeBase}/`
    if (!normalizedPath.startsWith(invitePrefix)) {
      return null
    }

    const relativePath = normalizedPath.slice(invitePrefix.length)
    if (!relativePath || relativePath.includes('/')) {
      return null
    }

    return decodeURIComponent(relativePath)
  }

  const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath
  if (!relativePath || relativePath.includes('/')) {
    return null
  }

  return decodeURIComponent(relativePath)
}

export function resolveRoute(pathname: string): AppRoute {
  const normalized = normalizeRoutePath(pathname)

  if (normalized === routes.game) {
    return routes.game
  }

  return routes.main
}
