import { useLayoutEffect, useState } from 'react'

type MobileViewportState = {
  isKeyboardVisible: boolean
  keyboardInset: number
  viewportHeight: number
}

const KEYBOARD_VISIBLE_THRESHOLD = 120

function readViewportState(): MobileViewportState {
  if (typeof window === 'undefined') {
    return {
      isKeyboardVisible: false,
      keyboardInset: 0,
      viewportHeight: 0,
    }
  }

  const layoutViewportHeight = window.innerHeight
  const visualViewport = window.visualViewport
  const viewportHeight = Math.round(visualViewport?.height ?? layoutViewportHeight)
  const viewportTop = Math.round(visualViewport?.offsetTop ?? 0)
  const keyboardInset = Math.max(0, layoutViewportHeight - viewportHeight - viewportTop)

  return {
    isKeyboardVisible: keyboardInset > KEYBOARD_VISIBLE_THRESHOLD,
    keyboardInset,
    viewportHeight,
  }
}

export function useMobileViewport() {
  const [viewportState, setViewportState] = useState<MobileViewportState>(() => readViewportState())

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const visualViewport = window.visualViewport
    let frameId = 0

    const updateViewportState = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        setViewportState((current) => {
          const next = readViewportState()

          return current.keyboardInset === next.keyboardInset &&
            current.viewportHeight === next.viewportHeight &&
            current.isKeyboardVisible === next.isKeyboardVisible
            ? current
            : next
        })
      })
    }

    updateViewportState()

    window.addEventListener('resize', updateViewportState)
    window.addEventListener('orientationchange', updateViewportState)
    visualViewport?.addEventListener('resize', updateViewportState)
    visualViewport?.addEventListener('scroll', updateViewportState)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('resize', updateViewportState)
      window.removeEventListener('orientationchange', updateViewportState)
      visualViewport?.removeEventListener('resize', updateViewportState)
      visualViewport?.removeEventListener('scroll', updateViewportState)
    }
  }, [])

  return viewportState
}
