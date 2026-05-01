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

export function isAppRoute(pathname: string): pathname is AppRoute {
  const normalized = normalizeRoutePath(pathname)
  return Object.values(routes).includes(normalized as AppRoute)
}

export function buildInvitePath(roomCode: string) {
  const normalizedRoomCode = roomCode.trim()

  if (!normalizedRoomCode) {
    return routes.main
  }

  const encodedRoomCode = encodeURIComponent(normalizedRoomCode)
  return routeBase ? `${routeBase}/${encodedRoomCode}` : `/${encodedRoomCode}`
}

export function readInviteRoomCode(pathname: string) {
  const normalizedPath = String(normalizeRoutePath(pathname))
  const inviteBase: string = routeBase

  if (normalizedPath === routes.main || normalizedPath === routes.game) {
    return null
  }

  if (inviteBase) {
    const invitePrefix = `${inviteBase}/`
    if (normalizedPath.indexOf(invitePrefix) !== 0) {
      return null
    }

    const relativePath = normalizedPath.slice(invitePrefix.length)
    if (!relativePath || relativePath.includes('/')) {
      return null
    }

    return decodeURIComponent(relativePath)
  }

  const relativePath = normalizedPath.charAt(0) === '/' ? normalizedPath.slice(1) : normalizedPath
  if (!relativePath || relativePath.includes('/')) {
    return null
  }

  return decodeURIComponent(relativePath)
}
