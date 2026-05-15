/**
 * ParticipantBubbleLayer
 *
 * 책임:
 * - participant card 위치 기준 floating chat bubble 표시
 *
 * 하지 않는 것:
 * - bubble 위치 계산
 * - chat/participant 상태 읽기
 */
import type { ParticipantBubblePosition } from '@/features/participants/model/participantPresentation'
import './ParticipantBubbleLayer.css'

type ParticipantBubbleLayerProps = {
  participantBubbles: ParticipantBubblePosition[]
}

export function ParticipantBubbleLayer({ participantBubbles }: ParticipantBubbleLayerProps) {
  return (
    <div className="participant-bubble-layer" aria-hidden="true">
      {participantBubbles.map((bubble) => (
        <div
          key={`${bubble.sessionId}-${bubble.createdAt}`}
          className="participant-bubble-layer__bubble"
          style={{ top: `${bubble.top}px`, left: `${bubble.left}px` }}
        >
          <span>{bubble.text}</span>
        </div>
      ))}
    </div>
  )
}
