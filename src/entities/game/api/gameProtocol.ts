import {
  CANVAS_COLOR_PALETTE,
  DEFAULT_CANVAS_COLOR,
  type CanvasStroke,
  type ChatMessage,
  type DrawingTool,
  type GameSettings,
} from '@/entities/game/model'
import { createUUID } from '@/shared/lib/createUUID'

type CompactPoint = [number, number, number]
type CompactStrokePayload = [number, number, CompactPoint[], string?]
type CompactGameSettingsPayload = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
]

const colorIndexByHex = new Map<string, number>(
  CANVAS_COLOR_PALETTE.map((color, index) => [color, index]),
)

const TOOL_CODE_BY_NAME: Record<DrawingTool, number> = {
  PEN: 0,
  ERASER: 1,
  FILL: 2,
}

const TOOL_NAME_BY_CODE: DrawingTool[] = ['PEN', 'ERASER', 'FILL']

export const CANVAS_CLEAR_MARKER: CompactStrokePayload = [3, 0, []]

export function createCanvasUndoMarker(cid: string): CompactStrokePayload {
  return [4, 0, [], cid]
}

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
  return rounded >= 1 && rounded <= CANVAS_COLOR_PALETTE.length ? rounded : undefined
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function encodeCompactStroke(stroke: CanvasStroke): CompactStrokePayload {
  const toolCode = TOOL_CODE_BY_NAME[stroke.tool]
  const colorIndex = colorIndexByHex.get(stroke.color) ?? colorIndexByHex.get(DEFAULT_CANVAS_COLOR) ?? 0
  const points: CompactPoint[] = stroke.points.map((point) => [
    roundTo(point.x, 3),
    roundTo(point.y, 3),
    roundTo(point.size, 1),
  ])

  return stroke.cid ? [toolCode, colorIndex, points, stroke.cid] : [toolCode, colorIndex, points]
}

export function encodeCompactGameSettings(settings: GameSettings): CompactGameSettingsPayload {
  const drawerOrderMode = settings.drawerOrderMode === 'RANDOM' ? 1 : 0
  const endMode = settings.endMode === 'TIME_OR_ALL_CORRECT' ? 1 : 0
  const customWordMode = settings.customWordMode === 'CUSTOM_ONLY' ? 0 : 1

  return [
    settings.roundCount,
    settings.drawSec,
    settings.wordChoiceSec,
    settings.wordChoiceCount,
    settings.hintRevealSec,
    settings.hintLetterCount,
    drawerOrderMode,
    endMode,
    customWordMode,
    settings.customWordsRaw ?? '',
  ]
}

export function decodeCompactStroke(payload: unknown): CanvasStroke | null {
  if (!Array.isArray(payload)) {
    return null
  }

  const [toolCode, color, points, cid] = payload
  const tool = TOOL_NAME_BY_CODE[toolCode]
  if (
    !tool ||
    typeof color !== 'number' ||
    !Array.isArray(points)
  ) {
    return null
  }

  const colorHex = CANVAS_COLOR_PALETTE[color] ?? DEFAULT_CANVAS_COLOR
  const normalizedPoints = points
    .filter((point): point is CompactPoint =>
      Array.isArray(point) &&
      point.length === 3 &&
      typeof point[0] === 'number' &&
      Number.isFinite(point[0]) &&
      typeof point[1] === 'number' &&
      Number.isFinite(point[1]) &&
      typeof point[2] === 'number' &&
      Number.isFinite(point[2]) &&
      point[2] > 0,
    )
    .map(([x, y, pointSize]) => ({ x, y, size: pointSize }))

  return {
    id: createUUID(),
    ...(readNonEmptyString(cid) ? { cid: readNonEmptyString(cid) } : {}),
    tool,
    color: colorHex,
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

  const { sid, t, s } = payload as {
    sid?: unknown
    t?: unknown
    s?: unknown
  }
  const rawText = typeof t === 'string' ? t : null

  if (!rawText || rawText.trim().length === 0) {
    return null
  }

  const senderSessionId =
    typeof sid === 'string' && sid.trim().length > 0
      ? sid.trim()
      : undefined

  return {
    id: createUUID(),
    nickname: '알수없음',
    text: rawText.slice(0, 50),
    tone: resolveChatTone(undefined, s),
    senderSessionId,
    mine: false,
    createdAt: Date.now(),
  }
}
