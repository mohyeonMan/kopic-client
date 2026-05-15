/**
 * ParticipantScorePanel
 *
 * 책임:
 * - room participants의 점수/역할/온라인 상태 표시
 * - 현재 drawer/correct role을 presentation으로만 강조
 *
 * 하지 않는 것:
 * - participant mutation
 * - game turn transition 판단
 * - room settings 표시
 *
 * 의존:
 * - game entity room snapshot
 *
 * 사용 위치:
 * - GamePage
 */
import type { AnimationEvent as ReactAnimationEvent, RefObject } from 'react'
import type { Participant, RoomSnapshot } from '@/entities/game/model/gameTypes'
import {
  getParticipantAccentColor,
  getParticipantToneClass,
  type AnimatedParticipantItem,
} from '@/features/participants/model/participantPresentation'
import { useAnimatedParticipants } from '@/features/participants/model/useAnimatedParticipants'
import './ParticipantScorePanel.css'

type ParticipantScorePanelProps = {
  containerRef?: RefObject<HTMLElement | null>
  isMobileActive?: boolean
  mySessionId: string | null
  onParticipantItemRefChange?: (sessionId: string, element: HTMLLIElement | null) => void
  room: RoomSnapshot
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

function resolveRole(
  participant: Participant,
  drawerSessionId?: string,
  correctSessionIds: string[] = [],
) {
  if (participant.sessionId === drawerSessionId) {
    return '출제자'
  }

  if (correctSessionIds.includes(participant.sessionId)) {
    return '정답'
  }

  if (participant.isHost) {
    return '방장'
  }

  return participant.isOnline ? '참여자' : '오프라인'
}

export function ParticipantScorePanel({
  containerRef,
  isMobileActive = true,
  mySessionId,
  onParticipantItemRefChange,
  room,
  scrollContainerRef,
}: ParticipantScorePanelProps) {
  const drawerSessionId = room.currentTurn?.drawerSessionId
  const correctSessionIds = room.currentTurn?.correctSessionIds ?? []
  const { animatedParticipants, handleParticipantCardAnimationEnd } =
    useAnimatedParticipants(room.participants)
  const panelClassName = isMobileActive
    ? 'participant-score-panel participant-score-panel--mobile-active'
    : 'participant-score-panel participant-score-panel--mobile-hidden'
  const handleAnimationEnd = (
    event: ReactAnimationEvent<HTMLLIElement>,
    sessionId: string,
    phase: AnimatedParticipantItem['phase'],
  ) => {
    handleParticipantCardAnimationEnd(event, sessionId, phase)
  }

  return (
    <section ref={containerRef} className={panelClassName} aria-label="참여자 점수" tabIndex={-1}>
      <header className="participant-score-panel__header">
        <div>
          <p className="participant-score-panel__eyebrow">PARTICIPANTS</p>
          <h2>참여자</h2>
        </div>
        <span>{room.participants.length}명</span>
      </header>

      <div ref={scrollContainerRef} className="participant-score-panel__scroll">
        <ul className="participant-score-panel__list">
          {animatedParticipants.map(({ participant, phase }) => {
            const role = resolveRole(participant, drawerSessionId, correctSessionIds)
            const toneClassName = getParticipantToneClass(
              participant,
              drawerSessionId,
              correctSessionIds,
            )
            const phaseClassName =
              phase === 'enter'
                ? ' participant-score-panel__item--enter'
                : phase === 'exit'
                  ? ' participant-score-panel__item--exit'
                  : ''
            const accentColor = getParticipantAccentColor(participant.colorIndex)

            return (
              <li
                key={participant.sessionId}
                ref={(element) => onParticipantItemRefChange?.(participant.sessionId, element)}
                className={`${toneClassName}${
                  participant.sessionId === mySessionId ? ' participant-score-panel__item--me' : ''
                }${phaseClassName}`}
                onAnimationEnd={(event) => handleAnimationEnd(event, participant.sessionId, phase)}
              >
                <div>
                  <strong>
                    {accentColor ? (
                      <span
                        className="participant-score-panel__color"
                        style={{ ['--participant-accent-color' as string]: accentColor }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {participant.nickname}
                  </strong>
                  <span>{role}</span>
                </div>
                <strong>{participant.score}점</strong>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
