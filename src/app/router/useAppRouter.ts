import { useEffect, useState } from 'react'
import { isAppRoute, routes, type AppRoute } from './routes'
import { wsSessionManager, wsSessionOwner } from '../../ws/client/wsSessionManager'

function getCurrentRoute(): AppRoute {
  return isAppRoute(window.location.pathname) ? window.location.pathname : routes.main
}

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)

  useEffect(() => {
    if (route === routes.game) {
      wsSessionManager.acquire(wsSessionOwner.game)
      return
    }

    wsSessionManager.release(wsSessionOwner.game)
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
