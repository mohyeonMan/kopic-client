import { useEffect, useRef } from 'react'
import type { Participant, RoomState } from '@/entities/game/model'
import type { StageOverlayPhase } from '@/features/game-board/model/gameBoardShared'
import cardSlideSoundUrl from '@/assets/sounds/card-slide.wav'
import clearAllSoundUrl from '@/assets/sounds/clear-all.wav'
import correctSoundUrl from '@/assets/sounds/correct.wav'
import gameResultSoundUrl from '@/assets/sounds/game-result.wav'
import participantJoinSoundUrl from '@/assets/sounds/participant-join.wav'
import participantLeaveSoundUrl from '@/assets/sounds/participant-leave.wav'

export const GAME_SOUND_FILES = {
  cardSlide: cardSlideSoundUrl,
  gameResult: gameResultSoundUrl,
  clearAll: clearAllSoundUrl,
  correct: correctSoundUrl,
  participantJoin: participantJoinSoundUrl,
  participantLeave: participantLeaveSoundUrl,
} as const

type GameSoundName = keyof typeof GAME_SOUND_FILES

const GAME_SOUND_VOLUMES: Record<GameSoundName, number> = {
  cardSlide: 0.45,
  gameResult: 0.65,
  clearAll: 0.55,
  correct: 0.7,
  participantJoin: 0.45,
  participantLeave: 0.45,
}

const audioCache = new Map<GameSoundName, HTMLAudioElement>()
let gameSoundsPreloaded = false

function getGameAudio(name: GameSoundName) {
  if (typeof Audio === 'undefined') {
    return null
  }

  const soundFile = GAME_SOUND_FILES[name]
  if (!soundFile) {
    return null
  }

  const cachedAudio = audioCache.get(name)
  if (cachedAudio) {
    return cachedAudio
  }

  const audio = new Audio(soundFile)
  audio.preload = 'auto'
  audio.volume = GAME_SOUND_VOLUMES[name]
  audioCache.set(name, audio)
  return audio
}

function preloadGameSounds() {
  if (gameSoundsPreloaded) {
    return
  }

  gameSoundsPreloaded = true

  for (const name of Object.keys(GAME_SOUND_FILES) as GameSoundName[]) {
    const audio = getGameAudio(name)

    if (!audio) {
      continue
    }

    audio.load()
  }
}

function playGameSound(name: GameSoundName) {
  const baseAudio = getGameAudio(name)
  if (!baseAudio) {
    return
  }

  const audio = baseAudio.paused ? baseAudio : (baseAudio.cloneNode(true) as HTMLAudioElement)
  audio.volume = GAME_SOUND_VOLUMES[name]

  try {
    audio.currentTime = 0
  } catch {
    // Some browsers block seeking until metadata is available.
  }

  void audio.play().catch(() => {
    // Missing files or browser autoplay policy should not break gameplay.
  })
}

type CanvasSoundState = {
  key: string | null
  strokeCount: number
}

type CardSlideSoundState = {
  active: boolean
  key: string | null
}

type UseGameSoundsArgs = {
  activeStageOverlay: StageOverlayPhase | null
  canvasSoundKey: string | null
  canvasStrokeCount: number
  isCorrectHighlightActive: boolean
  participants: Participant[]
  roomState: RoomState
  secretWordBannerSoundKey: string | null
  settingsOpen: boolean
  stageOverlayOpen: boolean
}

export function useGameSounds({
  activeStageOverlay,
  canvasSoundKey,
  canvasStrokeCount,
  isCorrectHighlightActive,
  participants,
  roomState,
  secretWordBannerSoundKey,
  settingsOpen,
  stageOverlayOpen,
}: UseGameSoundsArgs) {
  const cardSlideStateRef = useRef<CardSlideSoundState | null>(null)
  const canvasStateRef = useRef<CanvasSoundState | null>(null)
  const correctHighlightWasActiveRef = useRef<boolean | null>(null)
  const participantIdsRef = useRef<Set<string> | null>(null)
  const previousRoomStateRef = useRef<RoomState | null>(null)
  const secretWordBannerStateRef = useRef<CardSlideSoundState | null>(null)

  useEffect(() => {
    preloadGameSounds()
  }, [])

  useEffect(() => {
    const stageOverlayKey =
      activeStageOverlay && stageOverlayOpen ? `stage:${activeStageOverlay}` : null
    const cardSlideKey = settingsOpen ? 'settings' : stageOverlayKey
    const cardSlideActive = settingsOpen || stageOverlayKey !== null
    const previous = cardSlideStateRef.current

    if (
      previous &&
      cardSlideActive &&
      (!previous.active || previous.key !== cardSlideKey)
    ) {
      playGameSound('cardSlide')
    }

    cardSlideStateRef.current = {
      active: cardSlideActive,
      key: cardSlideActive ? cardSlideKey : null,
    }
  }, [activeStageOverlay, settingsOpen, stageOverlayOpen])

  useEffect(() => {
    const bannerActive = secretWordBannerSoundKey !== null
    const previous = secretWordBannerStateRef.current

    if (
      previous &&
      bannerActive &&
      (!previous.active || previous.key !== secretWordBannerSoundKey)
    ) {
      playGameSound('cardSlide')
    }

    secretWordBannerStateRef.current = {
      active: bannerActive,
      key: secretWordBannerSoundKey,
    }
  }, [secretWordBannerSoundKey])

  useEffect(() => {
    const previous = previousRoomStateRef.current

    if (previous !== null && previous !== 'RESULT' && roomState === 'RESULT') {
      playGameSound('gameResult')
    }

    previousRoomStateRef.current = roomState
  }, [roomState])

  useEffect(() => {
    const previous = canvasStateRef.current

    if (
      previous?.key &&
      previous.key === canvasSoundKey &&
      previous.strokeCount > 0 &&
      canvasStrokeCount === 0
    ) {
      playGameSound('clearAll')
    }

    canvasStateRef.current = {
      key: canvasSoundKey,
      strokeCount: canvasStrokeCount,
    }
  }, [canvasSoundKey, canvasStrokeCount])

  useEffect(() => {
    const previous = correctHighlightWasActiveRef.current

    if (previous !== null && !previous && isCorrectHighlightActive) {
      playGameSound('correct')
    }

    correctHighlightWasActiveRef.current = isCorrectHighlightActive
  }, [isCorrectHighlightActive])

  useEffect(() => {
    const nextIds = new Set(participants.map((participant) => participant.sessionId))
    const previousIds = participantIdsRef.current

    if (previousIds === null || previousIds.size === 0) {
      participantIdsRef.current = nextIds
      return
    }

    let hasJoined = false
    let hasLeft = false

    for (const sessionId of nextIds) {
      if (!previousIds.has(sessionId)) {
        hasJoined = true
        break
      }
    }

    for (const sessionId of previousIds) {
      if (!nextIds.has(sessionId)) {
        hasLeft = true
        break
      }
    }

    if (hasJoined) {
      playGameSound('participantJoin')
    }

    if (hasLeft) {
      playGameSound('participantLeave')
    }

    participantIdsRef.current = nextIds
  }, [participants])
}
