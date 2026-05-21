import type { TransitionEvent as ReactTransitionEvent } from 'react'
import type { RoomState, TurnSummary } from '@/entities/game/model'
import type { StageOverlayPhase, ViewerRole } from '@/features/game-board/model/gameBoardShared'

type WordChoiceOverlayProps = {
  activeStageOverlay: StageOverlayPhase | null
  currentTurn: TurnSummary | null
  drawerName: string
  onRequestWordChoice: (choiceIndex: number) => void
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  roomState: RoomState
  stageOverlayOpen: boolean
  viewerRole: ViewerRole
  wordChoiceCountdownText: string | null
}

export function WordChoiceOverlay({
  activeStageOverlay,
  currentTurn,
  drawerName,
  onRequestWordChoice,
  onTransitionEnd,
  roomState,
  stageOverlayOpen,
  viewerRole,
  wordChoiceCountdownText,
}: WordChoiceOverlayProps) {
  if (roomState !== 'RUNNING' || !currentTurn) {
    return null
  }

  const isOpen = activeStageOverlay === 'wordChoice' && stageOverlayOpen

  return (
    <div
      className={
        isOpen
          ? 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-open'
          : 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-closed'
      }
      aria-hidden={activeStageOverlay !== 'wordChoice'}
      onTransitionEnd={onTransitionEnd}
    >
      <div className="word-choice-top">
        <div className="overlay-heading word-choice-heading">
          <strong>
            {viewerRole === 'drawer' && currentTurn.wordChoices.length > 0
              ? '제시어를 선택해주세요.'
              : `${drawerName}님이 제시어를 선택중입니다.`}
          </strong>
        </div>
        {wordChoiceCountdownText ? (
          <p className="overlay-seconds-only overlay-seconds-only-word-choice">
            {wordChoiceCountdownText}
          </p>
        ) : null}
      </div>
      {currentTurn.wordChoices.length > 0 ? (
        <div className="word-choice-body">
          <div
            className={`button-row overlay-actions word-choice-actions word-choice-actions-count-${currentTurn.wordChoices.length}`}
          >
            {currentTurn.wordChoices.map((word, index) => (
              <button
                key={`${currentTurn.turnId}-choice-${index}`}
                type="button"
                className="word-choice-button"
                onClick={() => onRequestWordChoice(index)}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
