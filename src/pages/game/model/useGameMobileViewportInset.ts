/**
 * useGameMobileViewportInset
 *
 * 책임:
 * - game page mobile viewport 변화를 CSS variable로 동기화
 * - 소프트 키보드 열림 시 하단 inset 값을 layout에서 사용할 수 있게 제공
 *
 * 하지 않는 것:
 * - game/session entity 상태 변경
 * - chat/board feature 내부 상태 제어
 * - 브라우저 zoom/gesture 정책 강제
 *
 * 의존:
 * - browser visualViewport API
 *
 * 사용 위치:
 * - GamePage
 */
import { useLayoutEffect } from 'react'

const GAME_VIEWPORT_INSET_VAR = '--game-mobile-viewport-offset-bottom'

function readViewportInsetBottom() {
  if (typeof window === 'undefined') {
    return 0
  }

  const layoutViewportHeight = window.innerHeight
  const visualViewport = window.visualViewport
  const viewportHeight = Math.round(visualViewport?.height ?? layoutViewportHeight)
  const viewportTop = Math.round(visualViewport?.offsetTop ?? 0)

  return Math.max(0, layoutViewportHeight - viewportHeight - viewportTop)
}

export function useGameMobileViewportInset() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const visualViewport = window.visualViewport
    const rootStyle = document.documentElement.style
    let frameId = 0
    let previousInset = -1

    const syncInset = () => {
      const nextInset = readViewportInsetBottom()
      if (previousInset !== nextInset) {
        rootStyle.setProperty(GAME_VIEWPORT_INSET_VAR, `${nextInset}px`)
        previousInset = nextInset
      }
    }

    const scheduleSyncInset = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        syncInset()
      })
    }

    scheduleSyncInset()
    window.addEventListener('resize', scheduleSyncInset)
    visualViewport?.addEventListener('resize', scheduleSyncInset)
    visualViewport?.addEventListener('scroll', scheduleSyncInset)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('resize', scheduleSyncInset)
      visualViewport?.removeEventListener('resize', scheduleSyncInset)
      visualViewport?.removeEventListener('scroll', scheduleSyncInset)
      rootStyle.removeProperty(GAME_VIEWPORT_INSET_VAR)
    }
  }, [])
}
