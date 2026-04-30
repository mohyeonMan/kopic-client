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
