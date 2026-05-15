/**
 * GamePage
 *
 * 책임:
 * - joined session의 game route 조립
 * - desktop/mobile game layout orchestration
 * - room-lobby, game-board, game-chat feature에 session/game entity state 전달
 *
 * 하지 않는 것:
 * - feature 내부 비즈니스 로직 구현
 * - WebSocket protocol 처리
 *
 * 의존:
 * - game entity store
 * - session entity store
 * - page-level mobile viewport hook
 *
 * 사용 위치:
 * - AppRouter
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '@/entities/game/model/gameStore'
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { GameBoardPanel } from '@/features/game-board/ui/GameBoardPanel'
import { GameChatPanel } from '@/features/game-chat/ui/GameChatPanel'
import { GameStatusStrip } from '@/features/game-progress/ui/GameStatusStrip'
import { useParticipantBubbles } from '@/features/participants/model/useParticipantBubbles'
import { ParticipantBubbleLayer } from '@/features/participants/ui/ParticipantBubbleLayer'
import { ParticipantScorePanel } from '@/features/participants/ui/ParticipantScorePanel'
import { RoomLobbyView } from '@/features/room-lobby/ui/RoomLobbyView'
import { useGameMobileViewportInset } from '@/pages/game/model/useGameMobileViewportInset'
import './GamePage.css'

type MobilePanel = 'chat' | 'participants'

export function GamePage() {
  useGameMobileViewportInset()

  const nickname = useSessionStore((state) => state.nickname)
  const sessionId = useSessionStore((state) => state.sessionId)
  const room = useGameStore((state) => state.room)
  const statusStripRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLElement | null>(null)
  const participantPanelRef = useRef<HTMLElement | null>(null)
  const participantScrollRef = useRef<HTMLDivElement | null>(null)
  const chatPanelRef = useRef<HTMLElement | null>(null)
  const isPageAtBottomRef = useRef(false)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('chat')
  const [isChatComposerFocused, setIsChatComposerFocused] = useState(false)
  const activeMobilePanel = isChatComposerFocused ? 'chat' : mobilePanel
  const pageClassName =
    activeMobilePanel === 'chat'
      ? 'game-page game-page--mobile-chat'
      : 'game-page game-page--mobile-participants'
  const visibleChat = useMemo(
    () => room.chat.filter((message) => message.tone !== 'system'),
    [room.chat],
  )
  const { handleParticipantItemRefChange, participantBubbles } = useParticipantBubbles({
    participants: room.participants,
    scrollContainerRef: participantScrollRef,
    stageRef,
    visibleChat,
  })

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

  const focusMobilePanel = (panel: MobilePanel) => {
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

  const scrollComposerAnchor = () => {
    const targetElement = isPageAtBottomRef.current ? chatPanelRef.current : statusStripRef.current
    targetElement?.scrollIntoView({
      block: 'start',
      inline: 'nearest',
    })
  }

  return (
    <div className={pageClassName}>
      <div ref={statusStripRef}>
        <GameStatusStrip room={room} />
      </div>
      <section ref={stageRef} className="game-page__stage">
        <div className="game-page__left-panel">
          <ParticipantScorePanel
            containerRef={participantPanelRef}
            isMobileActive={activeMobilePanel === 'participants'}
            mySessionId={sessionId}
            onParticipantItemRefChange={handleParticipantItemRefChange}
            room={room}
            scrollContainerRef={participantScrollRef}
          />
          <RoomLobbyView mySessionId={sessionId} nickname={nickname} room={room} />
        </div>
        <div className="game-page__center-panel">
          <GameBoardPanel mySessionId={sessionId} room={room} />
        </div>
        <div className="game-page__mobile-switcher" role="tablist" aria-label="모바일 게임 패널">
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === 'chat'}
            className={
              activeMobilePanel === 'chat'
                ? 'game-page__mobile-switcher-button game-page__mobile-switcher-button--active'
                : 'game-page__mobile-switcher-button'
            }
            onClick={() => focusMobilePanel('chat')}
          >
            채팅
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === 'participants'}
            className={
              activeMobilePanel === 'participants'
                ? 'game-page__mobile-switcher-button game-page__mobile-switcher-button--active'
                : 'game-page__mobile-switcher-button'
            }
            onClick={() => focusMobilePanel('participants')}
          >
            참여자 {room.participants.length}
          </button>
        </div>
        <div className="game-page__right-panel">
          <GameChatPanel
            containerRef={chatPanelRef}
            isComposerFocused={isChatComposerFocused}
            isMobileActive={activeMobilePanel === 'chat'}
            onComposerBlur={() => setIsChatComposerFocused(false)}
            onComposerFocus={() => {
              setIsChatComposerFocused(true)
              setMobilePanel('chat')
            }}
            onScrollComposerAnchor={scrollComposerAnchor}
          />
        </div>
        <ParticipantBubbleLayer participantBubbles={participantBubbles} />
      </section>
    </div>
  )
}
