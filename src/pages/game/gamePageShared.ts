import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Participant } from '../../entities/game/model'

export type OverlayPreview =
  | 'actual'
  | 'gameStart'
  | 'roundStart'
  | 'turnStart'
  | 'wordChoice'
  | 'drawingDrawer'
  | 'drawingGuesser'
  | 'turnEnd'
  | 'gameResult'

export type StageOverlayPhase = 'gameStart' | 'roundStart' | 'turnStart' | 'wordChoice' | 'turnEnd'
export type ViewerRole = 'drawer' | 'guesser'

export const TOOL_COLORS = [
  '#000000',
  '#345a74',
  '#56758f',
  '#d14b3f',
  '#ea6f58',
  '#ef9b47',
  '#f2c14e',
  '#5f8d4e',
  '#7aac63',
  '#1d6b4e',
  '#1f8a8a',
  '#4aa3b8',
  '#5f6dd9',
  '#6f55c6',
  '#9656a2',
  '#bd6a88',
  '#8d6e63',
  '#6f5a4b',
  '#9aa5b1',
  '#ffffff',
] as const

function toGrayscaleHex(hexColor: string) {
  const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor
  if (hex.length !== 6) {
    return hexColor
  }

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)

  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
    return hexColor
  }

  const luminance = Math.round(red * 0.299 + green * 0.587 + blue * 0.114)
  const channel = luminance.toString(16).padStart(2, '0')
  return `#${channel}${channel}${channel}`
}

export const TOOL_COLORS_GRAYSCALE = TOOL_COLORS.map((color) => toGrayscaleHex(color))

export const SETTING_OPTIONS = {
  roundCount: [3, 4, 5, 6, 7, 8, 9, 10],
  drawSec: [20, 30, 40, 50, 60],
  wordChoiceSec: [5, 7, 10, 12, 15],
  wordChoiceCount: [3, 4, 5],
  hintRevealSec: [5, 7, 10, 12, 15],
  hintLetterCount: [1, 2, 3],
} as const

export const END_MODE_OPTIONS = [
  { value: 'FIRST_CORRECT', label: '1인' },
  { value: 'TIME_OR_ALL_CORRECT', label: '전원' },
] as const

export const STAGE_OVERLAY_PHASES: readonly StageOverlayPhase[] = ['gameStart', 'roundStart', 'turnStart', 'wordChoice', 'turnEnd']
export const TRANSIENT_STAGE_OVERLAY_MS = 5000

export type NumericSettingKey = keyof typeof SETTING_OPTIONS

export type EarnedScore = {
  sessionId: string
  nickname: string
  score: number
  role: 'drawer' | 'correct' | 'miss'
}

export type VisibleOrderEntry = {
  sessionId: string
  nickname: string
}

export type TurnEndOverlaySnapshot = {
  turnId: string
  answerText: string
  earnedScores: EarnedScore[]
}

export type ParticipantBubblePosition = {
  sessionId: string
  text: string
  createdAt: number
  top: number
  left: number
}

export type AnimatedParticipantItem = {
  participant: Participant
  phase: 'stable' | 'enter' | 'exit'
}

export const EMPTY_SESSION_IDS: string[] = []

export function participantTone(participant: Participant, drawerSessionId?: string, correctSessionIds?: string[]) {
  if (participant.sessionId === drawerSessionId) {
    return 'participant-card participant-card-drawer'
  }

  if (correctSessionIds?.includes(participant.sessionId)) {
    return 'participant-card participant-card-correct'
  }

  return 'participant-card'
}

export function buildEarnedScores(
  participants: Participant[],
  correctSessionIds: string[],
  earnedPoints: Record<string, number>,
  drawerSessionId?: string,
) {
  const rows: EarnedScore[] = participants.map((participant) => {
    const earnedPoint = earnedPoints[participant.sessionId] ?? 0

    if (participant.sessionId === drawerSessionId) {
      return { sessionId: participant.sessionId, nickname: participant.nickname, score: earnedPoint, role: 'drawer' }
    }

    if (correctSessionIds.includes(participant.sessionId)) {
      return { sessionId: participant.sessionId, nickname: participant.nickname, score: earnedPoint, role: 'correct' }
    }

    return { sessionId: participant.sessionId, nickname: participant.nickname, score: earnedPoint, role: 'miss' }
  })

  return rows.sort((left, right) => right.score - left.score)
}

export function getVisibleOrder(participants: Participant[], drawerOrder: string[] | undefined) {
  if (!drawerOrder || drawerOrder.length === 0) {
    return []
  }

  return drawerOrder
    .map((sessionId) => {
      const participant = participants.find((item) => item.sessionId === sessionId)
      if (!participant) {
        return null
      }

      return {
        sessionId: participant.sessionId,
        nickname: participant.nickname,
      }
    })
    .filter((entry): entry is VisibleOrderEntry => entry !== null)
}

export function getMaskedWord(word: string | null, revealedCount: number, answerLength?: number) {
  if (!word) {
    if (typeof answerLength === 'number' && answerLength > 0) {
      return '●'.repeat(answerLength)
    }

    return '●●●'
  }

  const chars = Array.from(word)
  const visibleCount = Math.max(0, Math.min(chars.length, revealedCount))
  let revealed = 0

  return chars
    .map((char) => {
      if (char === ' ') {
        return ' '
      }

      if (revealed < visibleCount) {
        revealed += 1
        return char
      }

      return '●'
    })
    .join('')
}

export function getBubbleText(text: string) {
  const chars = Array.from(text)
  return chars.length > 20 ? `${chars.slice(0, 17).join('')}...` : text
}

export function shouldSkipEnterSubmit(event: ReactKeyboardEvent<HTMLInputElement>) {
  const nativeEvent = event.nativeEvent as KeyboardEvent & { isComposing?: boolean }

  return nativeEvent.isComposing === true || nativeEvent.keyCode === 229
}

export function getParticipantAccentColor(colorIndex?: number) {
  if (typeof colorIndex !== 'number' || !Number.isFinite(colorIndex)) {
    return undefined
  }

  return TOOL_COLORS[colorIndex - 1]
}
