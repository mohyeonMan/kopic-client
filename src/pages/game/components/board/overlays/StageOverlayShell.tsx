import type { ReactNode, TransitionEvent as ReactTransitionEvent } from 'react'
import type { StageOverlayPhase } from '../../../gamePageShared'

type StageOverlayShellProps = {
  activeStageOverlay: StageOverlayPhase | null
  children: ReactNode
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  overlay: StageOverlayPhase
  stageOverlayOpen: boolean
  variantClassName?: string
}

export function StageOverlayShell({
  activeStageOverlay,
  children,
  onTransitionEnd,
  overlay,
  stageOverlayOpen,
  variantClassName,
}: StageOverlayShellProps) {
  const shellClassName =
    activeStageOverlay === overlay && stageOverlayOpen
      ? 'canvas-full-overlay canvas-full-overlay-open'
      : 'canvas-full-overlay canvas-full-overlay-closed'

  return (
    <div
      className={variantClassName ? `${shellClassName} ${variantClassName}` : shellClassName}
      aria-hidden={activeStageOverlay !== overlay}
      onTransitionEnd={onTransitionEnd}
    >
      {children}
    </div>
  )
}
