import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

export function useSideSyncHeight(centerPanelRef: RefObject<HTMLElement | null>) {
  const [sideSyncHeight, setSideSyncHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const centerPanelElement = centerPanelRef.current

    if (!centerPanelElement) {
      return
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(centerPanelElement.getBoundingClientRect().height)
      setSideSyncHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    updateHeight()

    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(centerPanelElement)
    window.addEventListener('resize', updateHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [centerPanelRef])

  return sideSyncHeight
}
