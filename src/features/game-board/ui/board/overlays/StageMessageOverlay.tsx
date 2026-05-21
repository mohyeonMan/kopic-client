import type { TransitionEvent as ReactTransitionEvent } from 'react'
import type { StageOverlayPhase } from '@/features/game-board/model/gameBoardShared'
import { StageOverlayShell } from './StageOverlayShell'

type StageMessageOverlayProps = {
  activeStageOverlay: StageOverlayPhase | null
  countdownMessage: string
  countdownText: string | null
  message: string
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  overlay: StageOverlayPhase
  secondaryText?: string | null
  stageOverlayOpen: boolean
}

export function StageMessageOverlay({
  activeStageOverlay,
  countdownMessage,
  countdownText,
  message,
  onTransitionEnd,
  overlay,
  secondaryText,
  stageOverlayOpen,
}: StageMessageOverlayProps) {
  return (
    <StageOverlayShell
      activeStageOverlay={activeStageOverlay}
      onTransitionEnd={onTransitionEnd}
      overlay={overlay}
      stageOverlayOpen={stageOverlayOpen}
    >
      {countdownText ? (
        <p className="overlay-countdown-line">
          <span>{countdownText}</span>
          <strong>{countdownMessage}</strong>
        </p>
      ) : (
        <strong>{message}</strong>
      )}
      {secondaryText ? <span>{secondaryText}</span> : null}
    </StageOverlayShell>
  )
}
