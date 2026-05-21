import { useEffect, useRef, useState, type RefObject } from 'react'

type MobileGamePanel = 'chat' | 'participants'

type UseMobileGamePanelsArgs = {
  chatPanelRef: RefObject<HTMLElement | null>
  participantPanelRef: RefObject<HTMLElement | null>
  statusBarRef: RefObject<HTMLElement | null>
}

export function useMobileGamePanels({
  chatPanelRef,
  participantPanelRef,
  statusBarRef,
}: UseMobileGamePanelsArgs) {
  const isPageAtBottomRef = useRef(false)
  const [mobilePanel, setMobilePanel] = useState<MobileGamePanel>('chat')
  const [isChatComposerFocused, setIsChatComposerFocused] = useState(false)
  const activeMobilePanel = isChatComposerFocused ? 'chat' : mobilePanel

  useEffect(() => {
    const updatePageAtBottom = () => {
      const scrollingElement = document.scrollingElement ?? document.documentElement
      const visualViewport = window.visualViewport
      const visualViewportBottom =
        window.scrollY + (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight)
      const layoutViewportBottom = scrollingElement.scrollTop + scrollingElement.clientHeight
      const viewportBottom = Math.max(visualViewportBottom, layoutViewportBottom)

      isPageAtBottomRef.current = scrollingElement.scrollHeight - viewportBottom <= 24
    }

    updatePageAtBottom()
    window.addEventListener('scroll', updatePageAtBottom, { passive: true })
    window.addEventListener('resize', updatePageAtBottom)
    window.visualViewport?.addEventListener('resize', updatePageAtBottom)
    window.visualViewport?.addEventListener('scroll', updatePageAtBottom)

    return () => {
      window.removeEventListener('scroll', updatePageAtBottom)
      window.removeEventListener('resize', updatePageAtBottom)
      window.visualViewport?.removeEventListener('resize', updatePageAtBottom)
      window.visualViewport?.removeEventListener('scroll', updatePageAtBottom)
    }
  }, [])

  const scrollComposerAnchor = (wasPageAtBottom: boolean) => {
    const targetElement = wasPageAtBottom ? chatPanelRef.current : statusBarRef.current

    targetElement?.scrollIntoView({
      block: 'start',
      inline: 'nearest',
    })
  }

  const focusMobilePanel = (panel: MobileGamePanel) => {
    setMobilePanel(panel)

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const panelElement = panel === 'chat' ? chatPanelRef.current : participantPanelRef.current

        if (!panelElement) {
          return
        }

        panelElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        })
        panelElement.focus({ preventScroll: true })
      })
    })
  }

  const handleChatComposerBlur = () => {
    setIsChatComposerFocused(false)
  }

  const handleChatComposerFocus = () => {
    const wasPageAtBottom = isPageAtBottomRef.current

    setIsChatComposerFocused(true)
    setMobilePanel('chat')
    window.requestAnimationFrame(() => scrollComposerAnchor(wasPageAtBottom))
  }

  return {
    activeMobilePanel,
    focusMobilePanel,
    handleChatComposerBlur,
    handleChatComposerFocus,
    isChatComposerFocused,
  }
}
