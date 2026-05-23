import { useEffect, useRef } from 'react'
import type { GameSoundEvent } from '@/entities/game/model'
import {
  initializeGameSoundSystem,
  playGameSound,
  setGameSoundEnabled,
} from '@/features/game-board/model/gameSoundManager'

const MAX_PLAYED_SOUND_EVENT_IDS = 500

function trimPlayedSoundEventIds(playedSoundEventIds: Set<string>) {
  while (playedSoundEventIds.size > MAX_PLAYED_SOUND_EVENT_IDS) {
    const oldestId = playedSoundEventIds.values().next().value
    if (!oldestId) {
      break
    }

    playedSoundEventIds.delete(oldestId)
  }
}

type UseGameSoundsArgs = {
  enabled: boolean
  soundEvents: GameSoundEvent[]
}

export function useGameSounds({
  enabled,
  soundEvents,
}: UseGameSoundsArgs) {
  const playedSoundEventIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    setGameSoundEnabled(enabled)

    if (enabled) {
      initializeGameSoundSystem()
    }
  }, [enabled])

  useEffect(() => {
    const playedSoundEventIds = playedSoundEventIdsRef.current

    if (!enabled) {
      for (const event of soundEvents) {
        playedSoundEventIds.add(event.id)
      }

      trimPlayedSoundEventIds(playedSoundEventIds)
      return
    }

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

    trimPlayedSoundEventIds(playedSoundEventIds)
  }, [enabled, soundEvents])
}
