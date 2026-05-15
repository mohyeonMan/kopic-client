import { useEffect, useRef, useState } from 'react'
import { isAppRoute, normalizeRoutePath, routes, type AppRoute } from './routes'
import { wsSessionManager, wsSessionOwner } from '../../ws/client/wsSessionManager'
import { useAppActions } from '../store/useAppActions'
import { useAppSessionState } from '../store/useAppSessionState'

function getCurrentRoute(): AppRoute {
  const pathname = normalizeRoutePath(window.location.pathname)
  return isAppRoute(pathname) ? pathname : routes.main
}

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
  const actions = useAppActions()
  const session = useAppSessionState()
  const previousRouteRef = useRef<AppRoute>(route)
  const shouldKeepGameSession = session.joinPending || session.joinAccepted
  const joinRoomCode = session.joinPending ? session.joinRoomCode ?? null : undefined
  const joinAction = session.joinPending ? session.joinAction ?? 0 : undefined

  useEffect(() => {
    if (!shouldKeepGameSession) {
      return
    }

    wsSessionManager.acquire(wsSessionOwner.game, session.nickname, joinRoomCode, joinAction)
  }, [joinAction, joinRoomCode, session.nickname, shouldKeepGameSession])

  useEffect(() => {
    if (!session.joinAccepted) {
      return
    }

    wsSessionManager.clearJoinConnectParams()
  }, [session.joinAccepted])

  useEffect(() => {
    if (route === routes.game) {
      return
    }

    if (previousRouteRef.current !== routes.game) {
      return
    }

    actions.clearRoomCache()
  }, [actions, route])

  useEffect(() => {
    if (shouldKeepGameSession) {
      return
    }

    wsSessionManager.clearJoinConnectParams()
    wsSessionManager.release(wsSessionOwner.game)
  }, [shouldKeepGameSession])

  useEffect(() => {
    if (route !== routes.game) {
      return
    }

    if (session.joinAccepted) {
      return
    }

    window.history.replaceState({}, '', routes.main)
    setRoute(routes.main)
  }, [route, session.joinAccepted])

  useEffect(() => {
    previousRouteRef.current = route
  }, [route])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute())
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      wsSessionManager.release(wsSessionOwner.game)
    }
  }, [])

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute === route) {
      return
    }

    window.history.pushState({}, '', nextRoute)
    setRoute(nextRoute)
  }

  return {
    route,
    navigate,
  }
}
