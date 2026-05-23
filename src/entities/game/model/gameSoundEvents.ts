import type { GameSoundEvent } from './types'

const MAX_GAME_SOUND_EVENTS = 50

export function appendGameSoundEvent(
  soundEvents: GameSoundEvent[],
  event: GameSoundEvent,
) {
  if (soundEvents.some((item) => item.id === event.id)) {
    return soundEvents
  }

  return [...soundEvents, event].slice(-MAX_GAME_SOUND_EVENTS)
}
