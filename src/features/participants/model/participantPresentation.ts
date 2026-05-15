/**
 * participantPresentation
 *
 * 책임:
 * - participant panel의 legacy role tone, color accent, bubble text 표현 규칙 제공
 *
 * 하지 않는 것:
 * - participant 상태 변경
 * - DOM ref/animation lifecycle 관리
 */
import type { Participant } from '@/entities/game/model/gameTypes'

export type AnimatedParticipantItem = {
  participant: Participant
  phase: 'stable' | 'enter' | 'exit'
}

export type ParticipantBubblePosition = {
  sessionId: string
  text: string
  createdAt: number
  top: number
  left: number
}

const PARTICIPANT_COLORS = [
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
  '#cfd8dce1',
] as const

export function getParticipantAccentColor(colorIndex?: number) {
  if (typeof colorIndex !== 'number' || !Number.isFinite(colorIndex)) {
    return undefined
  }

  return PARTICIPANT_COLORS[colorIndex - 1]
}

export function getParticipantToneClass(
  participant: Participant,
  drawerSessionId?: string,
  correctSessionIds: string[] = [],
) {
  if (participant.sessionId === drawerSessionId) {
    return 'participant-score-panel__item participant-score-panel__item--drawer'
  }

  if (correctSessionIds.includes(participant.sessionId)) {
    return 'participant-score-panel__item participant-score-panel__item--correct'
  }

  return 'participant-score-panel__item'
}

export function getBubbleText(text: string) {
  const chars = Array.from(text)
  return chars.length > 20 ? `${chars.slice(0, 17).join('')}...` : text
}
