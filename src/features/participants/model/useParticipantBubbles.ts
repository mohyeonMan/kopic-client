import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { ChatMessage, Participant } from '@/entities/game/model'
import {
  getBubbleText,
  type ParticipantBubblePosition,
} from '@/features/game-board/model/gameBoardShared'

type UseParticipantBubblesArgs = {
  participants: Participant[]
  sidePanelScrollRef: RefObject<HTMLDivElement | null>
  stageRef: RefObject<HTMLElement | null>
  visibleChat: ChatMessage[]
}

export function useParticipantBubbles({
  participants,
  sidePanelScrollRef,
  stageRef,
  visibleChat,
}: UseParticipantBubblesArgs) {
  const [participantBubbles, setParticipantBubbles] = useState<ParticipantBubblePosition[]>([])
  const [bubbleNowMs, setBubbleNowMs] = useState(() => Date.now())
  const [chatSeenAtById, setChatSeenAtById] = useState(() => new Map<string, number>())
  const participantItemRefs = useRef(new Map<string, HTMLLIElement | null>())

  useEffect(() => {
    if (visibleChat.length === 0) {
      return
    }

    const timerId = window.setInterval(() => {
      setBubbleNowMs(Date.now())
    }, 250)

    return () => {
      window.clearInterval(timerId)
    }
  }, [visibleChat.length])

  useEffect(() => {
    setChatSeenAtById((current) => {
      const next = new Map(current)
      const visibleIds = new Set<string>()
      let didChange = false

      for (const message of visibleChat) {
        visibleIds.add(message.id)
        if (next.has(message.id)) {
          continue
        }

        const createdAt =
          'createdAt' in message && typeof message.createdAt === 'number'
            ? message.createdAt
            : bubbleNowMs

        next.set(message.id, createdAt)
        didChange = true
      }

      for (const [id, createdAt] of next.entries()) {
        if (visibleIds.has(id)) {
          continue
        }

        if (bubbleNowMs - createdAt > 60000) {
          next.delete(id)
          didChange = true
        }
      }

      return didChange ? next : current
    })
  }, [bubbleNowMs, visibleChat])

  const participantBubbleById = useMemo(() => {
    const map = new Map<string, { text: string; createdAt: number }>()
    const now = bubbleNowMs

    for (const message of visibleChat.slice(-8)) {
      const createdAt = chatSeenAtById.get(message.id)
      if (!createdAt || now - createdAt > 3000) {
        continue
      }

      const author = message.senderSessionId
        ? participants.find((participant) => participant.sessionId === message.senderSessionId)
        : undefined

      if (author) {
        map.set(author.sessionId, { text: message.text, createdAt })
      }
    }

    return map
  }, [bubbleNowMs, chatSeenAtById, participants, visibleChat])

  const handleParticipantItemRefChange = (
    sessionId: string,
    element: HTMLLIElement | null,
  ) => {
    participantItemRefs.current.set(sessionId, element)
  }

  useLayoutEffect(() => {
    const stageElement = stageRef.current
    const scrollElement = sidePanelScrollRef.current

    if (!stageElement || !scrollElement) {
      setParticipantBubbles([])
      return
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

    updateBubblePositions()
    scrollElement.addEventListener('scroll', updateBubblePositions)
    window.addEventListener('resize', updateBubblePositions)

    return () => {
      scrollElement.removeEventListener('scroll', updateBubblePositions)
      window.removeEventListener('resize', updateBubblePositions)
    }
  }, [participantBubbleById, sidePanelScrollRef, stageRef])

  return {
    handleParticipantItemRefChange,
    participantBubbles,
  }
}
