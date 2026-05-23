import { useEffect, useRef } from 'react'
import type { GameSoundEvent } from '@/entities/game/model'
import {
  initializeGameSoundSystem,
  playGameSound,
} from '@/features/game-board/model/gameSoundManager'

const MAX_PLAYED_SOUND_EVENT_IDS = 500

type UseGameSoundsArgs = {
  soundEvents: GameSoundEvent[]
}

export function useGameSounds({
  soundEvents,
}: UseGameSoundsArgs) {
  const playedSoundEventIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    initializeGameSoundSystem()
  }, [])

  useEffect(() => {
    const playedSoundEventIds = playedSoundEventIdsRef.current

    for (const event of soundEvents) {
      if (playedSoundEventIds.has(event.id)) {
        continue
      }

      playedSoundEventIds.add(event.id)
      void playGameSound(event.sound).then((started) => {
        if (!started) {
          playedSoundEventIds.delete(event.id)
        }
      })
    }

    while (playedSoundEventIds.size > MAX_PLAYED_SOUND_EVENT_IDS) {
      const oldestId = playedSoundEventIds.values().next().value
      if (!oldestId) {
        break
      }

      playedSoundEventIds.delete(oldestId)
    }
  }, [soundEvents])
}
