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
import type { Participant, RoomSnapshot } from '@/entities/game/model/gameTypes'
import './ParticipantScorePanel.css'

type ParticipantScorePanelProps = {
  mySessionId: string | null
  room: RoomSnapshot
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

export function ParticipantScorePanel({ mySessionId, room }: ParticipantScorePanelProps) {
  const drawerSessionId = room.currentTurn?.drawerSessionId
  const correctSessionIds = room.currentTurn?.correctSessionIds ?? []

  return (
    <section className="participant-score-panel" aria-label="참여자 점수">
      <header className="participant-score-panel__header">
        <div>
          <p className="participant-score-panel__eyebrow">PARTICIPANTS</p>
          <h2>참여자</h2>
        </div>
        <span>{room.participants.length}명</span>
      </header>

      {room.participants.length > 0 ? (
        <ul className="participant-score-panel__list">
          {room.participants.map((participant) => {
            const role = resolveRole(participant, drawerSessionId, correctSessionIds)
            return (
              <li
                key={participant.sessionId}
                className={
                  participant.sessionId === mySessionId
                    ? 'participant-score-panel__item participant-score-panel__item--me'
                    : 'participant-score-panel__item'
                }
              >
                <div>
                  <strong>{participant.nickname}</strong>
                  <span>{role}</span>
                </div>
                <strong>{participant.score}점</strong>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="participant-score-panel__empty">참여자 정보를 기다리고 있습니다.</p>
      )}
    </section>
  )
}
