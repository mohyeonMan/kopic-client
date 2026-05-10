import './ParticipantPanel.css'
import type { AnimationEvent as ReactAnimationEvent, RefObject } from 'react'
import { getParticipantAccentColor, participantTone, type AnimatedParticipantItem } from '../gamePageShared'

type ParticipantPanelProps = {
  containerRef: RefObject<HTMLElement | null>
  animatedParticipants: AnimatedParticipantItem[]
  mySessionId: string
  drawerSessionId?: string
  currentCorrectIds: string[]
  isMobileActive: boolean
  sidePanelScrollRef: RefObject<HTMLDivElement | null>
  onParticipantItemRefChange: (sessionId: string, element: HTMLLIElement | null) => void
  onParticipantCardAnimationEnd: (
    event: ReactAnimationEvent<HTMLLIElement>,
    sessionId: string,
    phase: AnimatedParticipantItem['phase'],
  ) => void
}

export function ParticipantPanel({
  containerRef,
  animatedParticipants,
  mySessionId,
  drawerSessionId,
  currentCorrectIds,
  isMobileActive,
  sidePanelScrollRef,
  onParticipantItemRefChange,
  onParticipantCardAnimationEnd,
}: ParticipantPanelProps) {
  const asideClassName =
    `panel game-side-panel game-side-panel-left${
      isMobileActive ? ' game-participant-panel-mobile-active' : ' game-side-panel-mobile-hidden'
    }`

  return (
    <aside ref={containerRef} className={asideClassName} tabIndex={-1}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">PARTICIPANTS</p>
        </div>
      </div>

      <div ref={sidePanelScrollRef} className="side-panel-scroll">
        <div className="side-panel-scroll-inner">
          <ul className="participant-cards">
            {animatedParticipants.map(({ participant, phase }) => (
              <li
                key={participant.sessionId}
                ref={(element) => onParticipantItemRefChange(participant.sessionId, element)}
                className={
                  `${
                    participant.sessionId === mySessionId
                      ? `${participantTone(participant, drawerSessionId, currentCorrectIds)} participant-card-self`
                      : participantTone(participant, drawerSessionId, currentCorrectIds)
                  }${
                    phase === 'enter'
                      ? ' participant-card-enter'
                      : phase === 'exit'
                        ? ' participant-card-exit'
                        : ''
                  }`
                }
                onAnimationEnd={(event) => onParticipantCardAnimationEnd(event, participant.sessionId, phase)}
              >
                <div className="participant-main">
                  <div className="participant-heading participant-heading-top">
                    {getParticipantAccentColor(participant.colorIndex) ? (
                      <span
                        className="participant-color-accent"
                        style={{ ['--participant-accent-color' as string]: getParticipantAccentColor(participant.colorIndex) }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <strong>{participant.nickname}</strong>
                  </div>
                  <div className="participant-meta-row">
                    {participant.isHost ? <span className="host-badge">Host</span> : <span className="host-badge-placeholder" aria-hidden="true" />}
                    <p className="participant-score">{participant.score} pts</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
