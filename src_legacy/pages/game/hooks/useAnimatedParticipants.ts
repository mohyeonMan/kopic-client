import { useEffect, useState } from 'react'
import type { AnimationEvent as ReactAnimationEvent } from 'react'
import type { Participant } from '../../../entities/game/model'
import type { AnimatedParticipantItem } from '../gamePageShared'

export function useAnimatedParticipants(participants: Participant[]) {
  const [animatedParticipants, setAnimatedParticipants] = useState<AnimatedParticipantItem[]>(() =>
    participants.map((participant) => ({
      participant,
      phase: 'stable',
    })),
  )

  useEffect(() => {
    setAnimatedParticipants((current) => {
      const nextMap = new Map(
        participants.map((participant) => [participant.sessionId, participant]),
      )
      const seenSessionIds = new Set<string>()
      const merged: AnimatedParticipantItem[] = []

      for (const currentItem of current) {
        const sessionId = currentItem.participant.sessionId
        const nextParticipant = nextMap.get(sessionId)
        if (nextParticipant) {
          merged.push({
            participant: nextParticipant,
            phase: currentItem.phase === 'exit' ? 'enter' : currentItem.phase,
          })
          seenSessionIds.add(sessionId)
          continue
        }

        merged.push({
          participant: currentItem.participant,
          phase: 'exit',
        })
      }

      const getActiveOrderIndex = (sessionId: string) =>
        participants.findIndex((participant) => participant.sessionId === sessionId)

      for (const nextParticipant of participants) {
        if (seenSessionIds.has(nextParticipant.sessionId)) {
          continue
        }

        const targetIndex = getActiveOrderIndex(nextParticipant.sessionId)
        let insertAt = merged.findIndex((item) => {
          const itemIndex = getActiveOrderIndex(item.participant.sessionId)
          return itemIndex !== -1 && itemIndex > targetIndex
        })
        if (insertAt < 0) {
          insertAt = merged.length
        }

        merged.splice(insertAt, 0, {
          participant: nextParticipant,
          phase: 'enter',
        })
      }

      return merged
    })
  }, [participants])

  const handleParticipantCardAnimationEnd = (
    event: ReactAnimationEvent<HTMLLIElement>,
    sessionId: string,
    phase: AnimatedParticipantItem['phase'],
  ) => {
    if (event.target !== event.currentTarget || phase === 'stable') {
      return
    }

    setAnimatedParticipants((current) => {
      let didChange = false
      const next: AnimatedParticipantItem[] = []

      for (const item of current) {
        if (item.participant.sessionId !== sessionId) {
          next.push(item)
          continue
        }

        if (phase === 'exit') {
          didChange = true
          continue
        }

        if (item.phase !== 'stable') {
          didChange = true
          next.push({
            ...item,
            phase: 'stable',
          })
          continue
        }

        next.push(item)
      }

      return didChange ? next : current
    })
  }

  return {
    animatedParticipants,
    handleParticipantCardAnimationEnd,
  }
}
