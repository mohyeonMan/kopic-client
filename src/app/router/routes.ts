export const routes = {
  entry: '/',
  lobby: '/lobby',
  game: '/game',
  result: '/result',
} as const

export type AppRoute = (typeof routes)[keyof typeof routes]

export function isAppRoute(pathname: string): pathname is AppRoute {
  return Object.values(routes).includes(pathname as AppRoute)
}
