/**
 * useAppRouter
 *
 * 책임:
 * - browser history와 React route state를 동기화
 * - app route 변경 API 제공
 *
 * 하지 않는 것:
 * - WebSocket 연결 생명주기 관리
 * - session 상태 변경
 * - feature 권한 판단
 *
 * side effect:
 * - popstate listener 등록/해제
 *
 * 사용 위치:
 * - AppRouter
 */
import { useEffect, useState } from 'react'
import { resolveRoute, type AppRoute } from '@/app/router/routes'

function getCurrentRoute() {
  return resolveRoute(window.location.pathname)
}

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = (nextRoute: AppRoute, options?: { replace?: boolean }) => {
    if (nextRoute === route) {
      return
    }

    if (options?.replace) {
      window.history.replaceState({}, '', nextRoute)
    } else {
      window.history.pushState({}, '', nextRoute)
    }
    setRoute(nextRoute)
  }

  return {
    navigate,
    route,
  }
}
