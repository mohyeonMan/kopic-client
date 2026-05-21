import './GamePage.css'
import { GameBoardPanel } from '@/features/game-board/ui/GameBoardPanel'
import { GameChatPanel } from '@/features/game-chat/ui/GameChatPanel'
import { GameStatusBar } from '@/features/game-progress/ui/GameStatusBar'
import { ActionErrorModal } from '@/features/game-session/ui/ActionErrorModal'
import { ParticipantBubbleLayer } from '@/features/participants/ui/ParticipantBubbleLayer'
import { ParticipantPanel } from '@/features/participants/ui/ParticipantPanel'
import { useGamePageModel } from './model/useGamePageModel'

export function GamePage() {
  const {
    actionError,
    chatPanelProps,
    dismissActionError,
    focusMobilePanel,
    gameBoardPanelProps,
    mobilePanel,
    pageClassName,
    participantBubbles,
    participantPanelProps,
    stageRef,
    stageStyle,
    statusBarProps,
  } = useGamePageModel()

  return (
    <div className={pageClassName}>
      <GameStatusBar {...statusBarProps} />

      <ActionErrorModal
        actionError={actionError}
        onDismiss={dismissActionError}
      />

      <section ref={stageRef} className="game-stage-layout" style={stageStyle}>
        <ParticipantPanel {...participantPanelProps} />

        <GameBoardPanel {...gameBoardPanelProps} />

        <div className="game-mobile-panel-switcher" role="tablist" aria-label="모바일 하단 패널">
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel.activeMobilePanel === 'chat'}
            className={
              mobilePanel.activeMobilePanel === 'chat'
                ? 'game-mobile-panel-switcher-button game-mobile-panel-switcher-button-active'
                : 'game-mobile-panel-switcher-button'
            }
            onClick={() => focusMobilePanel('chat')}
          >
            채팅
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel.activeMobilePanel === 'participants'}
            className={
              mobilePanel.activeMobilePanel === 'participants'
                ? 'game-mobile-panel-switcher-button game-mobile-panel-switcher-button-active'
                : 'game-mobile-panel-switcher-button'
            }
            onClick={() => focusMobilePanel('participants')}
          >
            참여자 {mobilePanel.participantCount}
          </button>
        </div>

        <GameChatPanel {...chatPanelProps} />

        <ParticipantBubbleLayer participantBubbles={participantBubbles} />
      </section>
    </div>
  )
}
