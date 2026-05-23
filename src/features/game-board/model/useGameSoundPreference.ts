import { useCallback, useEffect, useState } from 'react'

const GAME_SOUND_ENABLED_STORAGE_KEY = 'kopic.game.soundEnabled'

function readStoredGameSoundEnabled() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    return window.localStorage.getItem(GAME_SOUND_ENABLED_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function useGameSoundPreference() {
  const [soundEnabled, setSoundEnabled] = useState(readStoredGameSoundEnabled)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(
        GAME_SOUND_ENABLED_STORAGE_KEY,
        soundEnabled ? 'true' : 'false',
      )
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [soundEnabled])

  const toggleSoundEnabled = useCallback(() => {
    setSoundEnabled((currentSoundEnabled) => !currentSoundEnabled)
  }, [])

  return {
    soundEnabled,
    toggleSoundEnabled,
  }
}
