import type { GameSoundName } from '@/entities/game/model'
import cardSlideSoundUrl from '@/assets/sounds/card-slide.wav'
import clearAllSoundUrl from '@/assets/sounds/clear-all.wav'
import correctSoundUrl from '@/assets/sounds/correct.wav'
import gameResultSoundUrl from '@/assets/sounds/game-result.wav'
import participantJoinSoundUrl from '@/assets/sounds/participant-join.wav'
import participantLeaveSoundUrl from '@/assets/sounds/participant-leave.wav'
import turnResultSoundUrl from '@/assets/sounds/turn-result.wav'

const GAME_SOUND_FILES: Record<GameSoundName, string> = {
  cardSlide: cardSlideSoundUrl,
  gameResult: gameResultSoundUrl,
  clearAll: clearAllSoundUrl,
  correct: correctSoundUrl,
  participantJoin: participantJoinSoundUrl,
  participantLeave: participantLeaveSoundUrl,
  turnResult: turnResultSoundUrl,
}

const GAME_SOUND_VOLUMES: Record<GameSoundName, number> = {
  cardSlide: 0.45,
  gameResult: 0.65,
  clearAll: 0.55,
  correct: 0.7,
  participantJoin: 0.45,
  participantLeave: 0.45,
  turnResult: 0.6,
}

const MAX_PENDING_SOUND_PLAYS = 32
const PENDING_SOUND_MAX_AGE_MS = 6000

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

type PendingSoundPlay = {
  name: GameSoundName
  requestedAtMs: number
  resolve: (started: boolean) => void
  volumeScale: number
}

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let unlockListenersAttached = false
let flushingPendingSounds = false

const soundBuffers = new Map<GameSoundName, AudioBuffer>()
const soundBufferPromises = new Map<GameSoundName, Promise<AudioBuffer | null>>()
const pendingSoundPlays: PendingSoundPlay[] = []

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function warnGameSound(message: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[sound] ${message}`, detail)
  }
}

function getAudioContext() {
  if (audioContext) {
    return audioContext
  }

  if (typeof window === 'undefined') {
    return null
  }

  const audioWindow = window as AudioWindow
  const AudioContextConstructor =
    audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null

  if (!AudioContextConstructor) {
    return null
  }

  try {
    audioContext = new AudioContextConstructor()
    masterGain = audioContext.createGain()
    masterGain.gain.value = 1
    masterGain.connect(audioContext.destination)
  } catch (error) {
    warnGameSound('context creation failed', error)
    audioContext = null
    masterGain = null
  }

  return audioContext
}

function loadSoundBuffer(name: GameSoundName) {
  const cachedBuffer = soundBuffers.get(name)
  if (cachedBuffer) {
    return Promise.resolve(cachedBuffer)
  }

  const cachedPromise = soundBufferPromises.get(name)
  if (cachedPromise) {
    return cachedPromise
  }

  const context = getAudioContext()
  const soundFile = GAME_SOUND_FILES[name]
  if (!context || !soundFile || typeof fetch !== 'function') {
    return Promise.resolve(null)
  }

  const bufferPromise = fetch(soundFile)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`sound fetch failed: ${response.status}`)
      }

      return response.arrayBuffer()
    })
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      soundBuffers.set(name, buffer)
      return buffer
    })
    .catch((error: unknown) => {
      soundBufferPromises.delete(name)
      warnGameSound('buffer load failed', { name, error })
      return null
    })

  soundBufferPromises.set(name, bufferPromise)
  return bufferPromise
}

export function preloadGameSounds() {
  for (const name of Object.keys(GAME_SOUND_FILES) as GameSoundName[]) {
    void loadSoundBuffer(name)
  }
}

function removeUnlockListeners() {
  if (!unlockListenersAttached || typeof window === 'undefined') {
    return
  }

  unlockListenersAttached = false
  window.removeEventListener('pointerdown', handleAudioUnlockEvent, { capture: true })
  window.removeEventListener('touchstart', handleAudioUnlockEvent, { capture: true })
  window.removeEventListener('keydown', handleAudioUnlockEvent, { capture: true })
}

function attachUnlockListeners() {
  if (unlockListenersAttached || typeof window === 'undefined') {
    return
  }

  unlockListenersAttached = true
  const options: AddEventListenerOptions = { capture: true, passive: true }
  window.addEventListener('pointerdown', handleAudioUnlockEvent, options)
  window.addEventListener('touchstart', handleAudioUnlockEvent, options)
  window.addEventListener('keydown', handleAudioUnlockEvent, options)
}

function handleAudioUnlockEvent() {
  void unlockGameAudio()
}

async function startDecodedSound(name: GameSoundName, volumeScale: number) {
  const context = getAudioContext()
  if (!context || context.state !== 'running') {
    return false
  }

  const buffer = await loadSoundBuffer(name)
  if (!buffer || context.state !== 'running') {
    return false
  }

  try {
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = GAME_SOUND_VOLUMES[name] * volumeScale
    source.connect(gain)
    gain.connect(masterGain ?? context.destination)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
    }
    source.start(context.currentTime)
    return true
  } catch (error) {
    warnGameSound('play failed', { name, error })
    return false
  }
}

function enqueueSoundPlay(name: GameSoundName, volumeScale: number) {
  return new Promise<boolean>((resolve) => {
    while (pendingSoundPlays.length >= MAX_PENDING_SOUND_PLAYS) {
      const staleSound = pendingSoundPlays.shift()
      staleSound?.resolve(false)
    }

    pendingSoundPlays.push({
      name,
      requestedAtMs: nowMs(),
      resolve,
      volumeScale,
    })
  })
}

async function flushPendingSoundPlays() {
  const context = getAudioContext()
  if (!context || context.state !== 'running' || flushingPendingSounds) {
    return
  }

  flushingPendingSounds = true

  try {
    while (pendingSoundPlays.length > 0 && context.state === 'running') {
      const pendingSound = pendingSoundPlays.shift()
      if (!pendingSound) {
        continue
      }

      if (nowMs() - pendingSound.requestedAtMs > PENDING_SOUND_MAX_AGE_MS) {
        pendingSound.resolve(false)
        continue
      }

      pendingSound.resolve(
        await startDecodedSound(pendingSound.name, pendingSound.volumeScale),
      )
    }
  } finally {
    flushingPendingSounds = false
  }
}

export function initializeGameSoundSystem() {
  const context = getAudioContext()
  if (context?.state !== 'running') {
    attachUnlockListeners()
  }

  preloadGameSounds()
}

export async function unlockGameAudio() {
  const context = getAudioContext()
  if (!context) {
    return false
  }

  preloadGameSounds()

  if (context.state === 'suspended') {
    try {
      await context.resume()
    } catch (error) {
      warnGameSound('context resume failed', error)
    }
  }

  if (context.state === 'running') {
    removeUnlockListeners()
    void flushPendingSoundPlays()
    return true
  }

  return false
}

export async function playGameSound(
  name: GameSoundName,
  options: { queueIfSuspended?: boolean; volumeScale?: number } = {},
) {
  initializeGameSoundSystem()

  const context = getAudioContext()
  if (!context) {
    return false
  }

  const volumeScale = options.volumeScale ?? 1
  if (context.state === 'suspended') {
    try {
      await context.resume()
    } catch (error) {
      warnGameSound('context resume failed', error)
    }
  }

  if (context.state !== 'running') {
    attachUnlockListeners()
    return options.queueIfSuspended === false
      ? false
      : enqueueSoundPlay(name, volumeScale)
  }

  removeUnlockListeners()
  void flushPendingSoundPlays()
  return startDecodedSound(name, volumeScale)
}
