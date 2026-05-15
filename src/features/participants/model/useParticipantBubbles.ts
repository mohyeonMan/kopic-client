/**
 * useParticipantBubbles
 *
 * 책임:
 * - 최근 채팅을 participant card 옆 floating bubble 위치로 투영
 * - panel scroll/resize에 맞춰 bubble 좌표 재계산
 *
 * 하지 않는 것:
 * - chat message mutation
 * - participant rendering
 */
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { ChatMessage, Participant } from '@/entities/game/model/gameTypes'
import {
  getBubbleText,
  type ParticipantBubblePosition,
} from '@/features/participants/model/participantPresentation'

type UseParticipantBubblesArgs = {
  participants: Participant[]
  scrollContainerRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLElement | null>
  visibleChat: ChatMessage[]
}

export function useParticipantBubbles({
  participants,
  scrollContainerRef,
  stageRef,
  visibleChat,
}: UseParticipantBubblesArgs) {
  const [participantBubbles, setParticipantBubbles] = useState<ParticipantBubblePosition[]>([])
  const participantItemRefs = useRef(new Map<string, HTMLLIElement | null>())

  const participantBubbleById = useMemo(() => {
    const map = new Map<string, { text: string; createdAt: number }>()
    const newestCreatedAt = visibleChat.at(-1)?.createdAt ?? 0

    for (const message of visibleChat.slice(-8)) {
      if (newestCreatedAt - message.createdAt > 3_000) {
        continue
      }

      const author = message.senderSessionId
        ? participants.find((participant) => participant.sessionId === message.senderSessionId)
        : undefined

      if (author) {
        map.set(author.sessionId, { text: message.text, createdAt: message.createdAt })
      }
    }

    return map
  }, [participants, visibleChat])

  const handleParticipantItemRefChange = (
    sessionId: string,
    element: HTMLLIElement | null,
  ) => {
    participantItemRefs.current.set(sessionId, element)
  }

  useLayoutEffect(() => {
    const stageElement = stageRef.current
    const scrollElement = scrollContainerRef.current

    if (!stageElement || !scrollElement) {
      const rafId = window.requestAnimationFrame(() => setParticipantBubbles([]))
      return () => window.cancelAnimationFrame(rafId)
    }

    const updateBubblePositions = () => {
      const stageRect = stageElement.getBoundingClientRect()
      const nextBubbles: ParticipantBubblePosition[] = []

      for (const [sessionId, bubble] of participantBubbleById.entries()) {
        const item = participantItemRefs.current.get(sessionId)

        if (!item) {
          continue
        }

        const itemRect = item.getBoundingClientRect()
        nextBubbles.push({
          sessionId,
          text: getBubbleText(bubble.text),
          createdAt: bubble.createdAt,
          top: itemRect.top - stageRect.top + itemRect.height / 2,
          left: itemRect.right - stageRect.left + 14,
        })
      }

      setParticipantBubbles((current) => {
        if (current.length !== nextBubbles.length) {
          return nextBubbles
        }

        const isSame = current.every((bubble, index) => {
          const next = nextBubbles[index]
          return (
            bubble.sessionId === next.sessionId &&
            bubble.text === next.text &&
            bubble.createdAt === next.createdAt &&
            bubble.top === next.top &&
            bubble.left === next.left
          )
        })

        return isSame ? current : nextBubbles
      })
    }

    const initialRafId = window.requestAnimationFrame(updateBubblePositions)
    scrollElement.addEventListener('scroll', updateBubblePositions)
    window.addEventListener('resize', updateBubblePositions)

    return () => {
      window.cancelAnimationFrame(initialRafId)
      scrollElement.removeEventListener('scroll', updateBubblePositions)
      window.removeEventListener('resize', updateBubblePositions)
    }
  }, [participantBubbleById, scrollContainerRef, stageRef])

  return {
    handleParticipantItemRefChange,
    participantBubbles,
  }
}
