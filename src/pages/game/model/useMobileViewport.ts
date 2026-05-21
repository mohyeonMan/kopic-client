import { useLayoutEffect } from 'react'

const KEYBOARD_INSET_PROPERTY = '--app-mobile-viewport-offset-bottom'

function readKeyboardInset() {
  if (typeof window === 'undefined') {
    return 0
  }

  const layoutViewportHeight = window.innerHeight
  const visualViewport = window.visualViewport
  const viewportHeight = Math.round(visualViewport?.height ?? layoutViewportHeight)
  const viewportTop = Math.round(visualViewport?.offsetTop ?? 0)

  return Math.max(0, layoutViewportHeight - viewportHeight - viewportTop)
}

export function useMobileViewport() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const visualViewport = window.visualViewport
    const rootStyle = document.documentElement.style
    let frameId = 0
    let previousKeyboardInset = -1

    const syncKeyboardInset = () => {
      const keyboardInset = readKeyboardInset()

      if (previousKeyboardInset !== keyboardInset) {
        rootStyle.setProperty(KEYBOARD_INSET_PROPERTY, `${keyboardInset}px`)
        previousKeyboardInset = keyboardInset
      }
    }

    const updateKeyboardInset = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        syncKeyboardInset()
      })
    }

    updateKeyboardInset()

    window.addEventListener('resize', updateKeyboardInset)
    visualViewport?.addEventListener('resize', updateKeyboardInset)
    visualViewport?.addEventListener('scroll', updateKeyboardInset)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('resize', updateKeyboardInset)
      visualViewport?.removeEventListener('resize', updateKeyboardInset)
      visualViewport?.removeEventListener('scroll', updateKeyboardInset)
      rootStyle.removeProperty(KEYBOARD_INSET_PROPERTY)
    }
  }, [])
}
