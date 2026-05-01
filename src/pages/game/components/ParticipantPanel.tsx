import type { AnimationEvent as ReactAnimationEvent, RefObject } from 'react'
import { getParticipantAccentColor, participantTone, type AnimatedParticipantItem } from '../gamePageShared'

type ParticipantPanelProps = {
  participantCount: number
  animatedParticipants: AnimatedParticipantItem[]
  mySessionId: string
  drawerSessionId?: string
  currentCorrectIds: string[]
  sidePanelScrollRef: RefObject<HTMLDivElement | null>
  onParticipantItemRefChange: (sessionId: string, element: HTMLLIElement | null) => void
  onParticipantCardAnimationEnd: (
    event: ReactAnimationEvent<HTMLLIElement>,
    sessionId: string,
    phase: AnimatedParticipantItem['phase'],
  ) => void
}

export function ParticipantPanel({
  participantCount,
  animatedParticipants,
  mySessionId,
  drawerSessionId,
  currentCorrectIds,
  sidePanelScrollRef,
  onParticipantItemRefChange,
  onParticipantCardAnimationEnd,
}: ParticipantPanelProps) {
  return (
    <aside className="panel game-side-panel game-side-panel-left">
      <div className="section-heading participant-heading-compact">
        <h2>참여자</h2>
        <div className="pill participant-count-pill">{participantCount}명</div>
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
