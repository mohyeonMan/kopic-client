import { useEffect, useRef, useState } from 'react'
import { isAppRoute, routes, type AppRoute } from './routes'
import { wsSessionManager, wsSessionOwner } from '../../ws/client/wsSessionManager'
import { useAppState } from '../store/useAppState'

function getCurrentRoute(): AppRoute {
  return isAppRoute(window.location.pathname) ? window.location.pathname : routes.main
}

function isReloadNavigation() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigationEntries = window.performance.getEntriesByType('navigation')
  if (navigationEntries.length > 0) {
    const firstEntry = navigationEntries[0] as PerformanceNavigationTiming
    return firstEntry.type === 'reload'
  }

  return false
}

export function useAppRouter() {
  const currentRoute = getCurrentRoute()
  const blockGameRouteOnReload = currentRoute === routes.game && isReloadNavigation()
  const [route, setRoute] = useState<AppRoute>(() =>
    blockGameRouteOnReload ? routes.main : currentRoute,
  )
  const { state, actions } = useAppState()
  const previousRouteRef = useRef<AppRoute>(route)

  useEffect(() => {
    if (!blockGameRouteOnReload) {
      return
    }

    actions.clearRoomCache()
    wsSessionManager.release(wsSessionOwner.game)
    window.history.replaceState({}, '', routes.main)
  }, [actions, blockGameRouteOnReload])

  useEffect(() => {
    if (route !== routes.game) {
      return
    }

    wsSessionManager.acquire(wsSessionOwner.game, state.session.nickname)
  }, [route, state.session.nickname])

  useEffect(() => {
    if (route === routes.game) {
      return
    }

    if (previousRouteRef.current === routes.game) {
      actions.clearRoomCache()
    }

    wsSessionManager.release(wsSessionOwner.game)
  }, [route])

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
