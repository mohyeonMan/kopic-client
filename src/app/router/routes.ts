export const routes = {
  main: '/',
  game: '/game',
} as const

export type AppRoute = (typeof routes)[keyof typeof routes]

export function isAppRoute(pathname: string): pathname is AppRoute {
  return Object.values(routes).includes(pathname as AppRoute)
}
