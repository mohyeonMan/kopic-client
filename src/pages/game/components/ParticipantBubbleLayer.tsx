import './ParticipantBubbleLayer.css'
import type { ParticipantBubblePosition } from '../gamePageShared'

type ParticipantBubbleLayerProps = {
  participantBubbles: ParticipantBubblePosition[]
}

export function ParticipantBubbleLayer({ participantBubbles }: ParticipantBubbleLayerProps) {
  return (
    <div className="participant-bubble-layer" aria-hidden="true">
      {participantBubbles.map((bubble) => (
        <div
          key={`${bubble.sessionId}-${bubble.createdAt}`}
          className="participant-bubble-floating"
          style={{ top: `${bubble.top}px`, left: `${bubble.left}px` }}
        >
          <span className="participant-bubble-text">{bubble.text}</span>
        </div>
      ))}
    </div>
  )
}
