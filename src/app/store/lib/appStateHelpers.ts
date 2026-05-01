import type { CanvasStroke, ChatMessage, DrawingTool, GameSettings } from '../../../entities/game/model'
import { createUUID } from '../../utils/createUUID'

type CompactPoint = [number, number]
type CompactStrokePayload = [number, number, number, CompactPoint[]]
type CompactGameSettingsPayload = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

const WS_COLOR_PALETTE = [
  '#203247',
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

const colorIndexByHex = new Map<string, number>(
  WS_COLOR_PALETTE.map((color, index) => [color, index]),
)

const TOOL_CODE_BY_NAME: Record<DrawingTool, number> = {
  PEN: 0,
  ERASER: 1,
  FILL: 2,
}

const TOOL_NAME_BY_CODE: DrawingTool[] = ['PEN', 'ERASER', 'FILL']

export const CANVAS_CLEAR_MARKER: CompactStrokePayload = [3, 0, 0, []]

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function normalizeParticipantColorIndex(value: unknown) {
  const colorIndex = readFiniteNumber(value)
  if (colorIndex === undefined) {
    return undefined
  }

  const rounded = Math.round(colorIndex)
  return rounded >= 1 && rounded <= WS_COLOR_PALETTE.length ? rounded : undefined
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function encodeCompactStroke(stroke: CanvasStroke): CompactStrokePayload {
  const toolCode = TOOL_CODE_BY_NAME[stroke.tool]
  const colorIndex = colorIndexByHex.get(stroke.color) ?? colorIndexByHex.get('#203247') ?? 0

  return [
    toolCode,
    colorIndex,
    roundTo(stroke.size, 1),
    stroke.points.map((point) => [roundTo(point.x, 3), roundTo(point.y, 3)]),
  ]
}

export function encodeCompactGameSettings(settings: GameSettings): CompactGameSettingsPayload {
  const drawerOrderMode = settings.drawerOrderMode === 'RANDOM' ? 1 : 0
  const endMode = settings.endMode === 'TIME_OR_ALL_CORRECT' ? 1 : 0

  return [
    settings.roundCount,
    settings.drawSec,
    settings.wordChoiceSec,
    settings.wordChoiceCount,
    settings.hintRevealSec,
    settings.hintLetterCount,
    drawerOrderMode,
    endMode,
  ]
}

export function decodeCompactStroke(payload: unknown): CanvasStroke | null {
  if (!Array.isArray(payload)) {
    return null
  }

  const [toolCode, color, size, points] = payload
  const tool = TOOL_NAME_BY_CODE[toolCode]
  if (
    !tool ||
    typeof color !== 'number' ||
    typeof size !== 'number' ||
    !Array.isArray(points)
  ) {
    return null
  }

  const colorHex = WS_COLOR_PALETTE[color] ?? '#203247'
  const normalizedPoints = points
    .filter((point): point is [number, number] =>
      Array.isArray(point) &&
      point.length === 2 &&
      typeof point[0] === 'number' &&
      typeof point[1] === 'number',
    )
    .map(([x, y]) => ({ x, y }))

  return {
    id: createUUID(),
    tool,
    color: colorHex,
    size,
    points: normalizedPoints,
  }
}

export function createSystemMessage(text: string): ChatMessage {
  return {
    id: createUUID(),
    nickname: 'system',
    text,
    tone: 'system',
  }
}

export function createPresenceMessage(nickname: string, joined: boolean): ChatMessage {
  return {
    id: createUUID(),
    nickname: '알림',
    text: `${nickname} 님이 ${joined ? '입장' : '퇴장'} 하셨습니다`,
    tone: 'alert',
    createdAt: Date.now(),
  }
}

export function createHostChangedMessage(nickname: string): ChatMessage {
  return {
    id: createUUID(),
    nickname: '알림',
    text: `${nickname}님이 새로운 방장이 되셨습니다.`,
    tone: 'alert',
    createdAt: Date.now(),
  }
}

export function createCorrectAnswerAlertMessage(nickname: string): ChatMessage {
  return {
    id: createUUID(),
    nickname: '알림',
    text: `${nickname} 님이 정답을 맞혔습니다.`,
    tone: 'alert-success',
    createdAt: Date.now(),
  }
}

function isSealedChatValue(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export function resolveChatTone(rawTone: unknown, sealed: unknown): ChatMessage['tone'] {
  if (rawTone === 'sealed' || isSealedChatValue(sealed)) {
    return 'sealed'
  }

  return rawTone === 'system' ||
    rawTone === 'guess' ||
    rawTone === 'correct' ||
    rawTone === 'alert' ||
    rawTone === 'alert-success'
    ? rawTone
    : 'guess'
}

export function decodeGuessSubmittedMessage(payload: unknown): ChatMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { sid, sessionId, t, text, sealed } = payload as {
    sid?: unknown
    sessionId?: unknown
    t?: unknown
    text?: unknown
    sealed?: unknown
  }
  const rawText =
    typeof t === 'string'
      ? t
      : typeof text === 'string'
        ? text
        : null

  if (!rawText || rawText.trim().length === 0) {
    return null
  }

  const senderSessionId =
    typeof sid === 'string' && sid.trim().length > 0
      ? sid.trim()
      : typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId.trim()
        : undefined

  return {
    id: createUUID(),
    nickname: '알수없음',
    text: rawText.slice(0, 50),
    tone: resolveChatTone(undefined, sealed),
    senderSessionId,
    mine: false,
    createdAt: Date.now(),
  }
}
