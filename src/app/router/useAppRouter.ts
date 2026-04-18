import { useEffect, useRef, useState } from 'react'
import { isAppRoute, routes, type AppRoute } from './routes'
import { wsSessionManager, wsSessionOwner } from '../../ws/client/wsSessionManager'
import { useAppState } from '../store/useAppState'

function getCurrentRoute(): AppRoute {
  return isAppRoute(window.location.pathname) ? window.location.pathname : routes.main
}

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
  const { state, actions } = useAppState()
  const previousRouteRef = useRef<AppRoute>(route)
  const shouldKeepGameSession = state.session.joinPending || state.session.joinAccepted
  const joinRoomCode = state.session.joinPending ? state.session.joinRoomCode ?? null : undefined
  const joinAction = state.session.joinPending ? state.session.joinAction ?? 0 : undefined

  useEffect(() => {
    if (!shouldKeepGameSession) {
      return
    }

    wsSessionManager.acquire(wsSessionOwner.game, state.session.nickname, joinRoomCode, joinAction)
  }, [joinAction, joinRoomCode, shouldKeepGameSession, state.session.nickname])

  useEffect(() => {
    if (!state.session.joinAccepted) {
      return
    }

    wsSessionManager.clearJoinConnectParams()
  }, [state.session.joinAccepted])

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

    if (state.session.joinAccepted) {
      return
    }

    window.history.replaceState({}, '', routes.main)
    setRoute(routes.main)
  }, [route, state.session.joinAccepted])

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
