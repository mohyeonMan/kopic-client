import type { GameSettings } from '@/entities/game/model'
import {
  isRecord,
  readFiniteNumber,
} from '../gameProtocol'

export function normalizeGameSettings(raw: unknown, fallback: GameSettings): GameSettings {
  const readInt = (value: unknown, current: number, min = 1) => {
    const next =
      readFiniteNumber(value) ??
      (typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : undefined)
    if (next === undefined) {
      return current
    }

    return Math.max(min, Math.round(next))
  }

  const readDrawerOrderMode = (
    value: unknown,
    current: GameSettings['drawerOrderMode'],
  ): GameSettings['drawerOrderMode'] => {
    if (value === 'JOIN_ORDER' || value === 0) {
      return 'JOIN_ORDER'
    }

    if (value === 'RANDOM' || value === 1) {
      return 'RANDOM'
    }

    return current
  }

  const readEndMode = (
    value: unknown,
    current: GameSettings['endMode'],
  ): GameSettings['endMode'] => {
    if (value === 'FIRST_CORRECT' || value === 0) {
      return 'FIRST_CORRECT'
    }

    if (value === 'TIME_OR_ALL_CORRECT' || value === 1) {
      return 'TIME_OR_ALL_CORRECT'
    }

    return current
  }

  const readCustomWordMode = (
    value: unknown,
    current: GameSettings['customWordMode'],
  ): GameSettings['customWordMode'] => {
    if (value === 'CUSTOM_ONLY' || value === 0) {
      return 'CUSTOM_ONLY'
    }

    if (value === 'BASE_PLUS_CUSTOM' || value === 1) {
      return 'BASE_PLUS_CUSTOM'
    }

    return current
  }

  const readCustomWordsRaw = (value: unknown, current: string): string => {
    if (typeof value === 'string') {
      return value
    }

    if (value === null) {
      return ''
    }

    return current
  }

  if (Array.isArray(raw)) {
    return {
      roundCount: readInt(raw[0], fallback.roundCount),
      drawSec: readInt(raw[1], fallback.drawSec),
      wordChoiceSec: readInt(raw[2], fallback.wordChoiceSec),
      wordChoiceCount: readInt(raw[3], fallback.wordChoiceCount),
      hintRevealSec: readInt(raw[4], fallback.hintRevealSec),
      hintLetterCount: readInt(raw[5], fallback.hintLetterCount),
      drawerOrderMode: readDrawerOrderMode(raw[6], fallback.drawerOrderMode),
      endMode: readEndMode(raw[7], fallback.endMode),
      customWordMode: readCustomWordMode(raw[8], fallback.customWordMode),
      customWordsRaw: readCustomWordsRaw(raw[9], fallback.customWordsRaw),
    }
  }

  return fallback
}

export function readRawSettingsPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return undefined
  }

  return payload.st
}

export function decodeSettingsUpdatePayload(
  payload: unknown,
  fallback: GameSettings,
): GameSettings | null {
  const rawSettings = readRawSettingsPayload(payload) ?? payload

  if (Array.isArray(rawSettings)) {
    return normalizeGameSettings(rawSettings, fallback)
  }

  return null
}
