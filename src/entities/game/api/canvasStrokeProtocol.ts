/**
 * canvasStrokeProtocol
 *
 * 책임:
 * - canvas stroke를 서버 compact payload와 entity shape 사이에서 변환
 * - drawing feature와 WebSocket payload shape 사이의 결합을 차단
 *
 * 하지 않는 것:
 * - WebSocket send/receive
 * - canvas pointer handling
 * - Zustand store 변경
 *
 * 의존:
 * - game canvas entity types
 *
 * 사용 위치:
 * - gameSessionApi
 * - roomSnapshotNormalizer
 */
import type { CanvasStroke, DrawingTool } from '@/entities/game/model/gameTypes'

type CompactPoint = [number, number]
type CompactStrokePayload = [number, number, number, CompactPoint[]]

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

const toolCodeByName: Record<DrawingTool, number> = {
  PEN: 0,
  ERASER: 1,
  FILL: 2,
}

const toolNameByCode: DrawingTool[] = ['PEN', 'ERASER', 'FILL']
const colorIndexByHex = new Map<string, number>(
  WS_COLOR_PALETTE.map((color, index) => [color, index]),
)

export const CANVAS_CLEAR_MARKER: CompactStrokePayload = [3, 0, 0, []]

function createStrokeId() {
  return crypto.randomUUID()
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isCanvasClearPayload(payload: unknown) {
  if (Array.isArray(payload) && payload.length > 0 && payload[0] === 3) {
    return true
  }

  if (!isRecord(payload)) {
    return false
  }

  return payload.clear === true || payload.type === 'CANVAS_CLEAR' || payload.op === 'CANVAS_CLEAR'
}

export function encodeCompactStroke(stroke: CanvasStroke): CompactStrokePayload {
  const toolCode = toolCodeByName[stroke.tool]
  const colorIndex = colorIndexByHex.get(stroke.color) ?? colorIndexByHex.get('#203247') ?? 0

  return [
    toolCode,
    colorIndex,
    roundTo(stroke.size, 1),
    stroke.points.map((point) => [roundTo(point.x, 3), roundTo(point.y, 3)]),
  ]
}

export function decodeCompactStroke(payload: unknown): CanvasStroke | null {
  if (!Array.isArray(payload)) {
    return null
  }

  const [toolCode, color, size, points] = payload
  const tool = toolNameByCode[toolCode]
  if (
    !tool ||
    typeof color !== 'number' ||
    typeof size !== 'number' ||
    !Array.isArray(points)
  ) {
    return null
  }

  return {
    id: createStrokeId(),
    tool,
    color: WS_COLOR_PALETTE[color] ?? '#203247',
    size,
    points: points
      .filter((point): point is CompactPoint =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === 'number' &&
        typeof point[1] === 'number',
      )
      .map(([x, y]) => ({ x, y })),
  }
}

export function normalizeCanvasStroke(payload: unknown): CanvasStroke | null {
  const compactStroke = decodeCompactStroke(payload)
  if (compactStroke) {
    return compactStroke
  }

  if (!isRecord(payload)) {
    return null
  }

  const tool: DrawingTool =
    payload.tool === 'PEN' || payload.tool === 'ERASER' || payload.tool === 'FILL'
      ? payload.tool
      : 'PEN'
  const points = Array.isArray(payload.points)
    ? payload.points
        .filter((point): point is Record<string, unknown> => isRecord(point))
        .map((point) => {
          const x = typeof point.x === 'number' && Number.isFinite(point.x) ? point.x : null
          const y = typeof point.y === 'number' && Number.isFinite(point.y) ? point.y : null

          return x === null || y === null ? null : { x, y }
        })
        .filter((point): point is { x: number; y: number } => point !== null)
    : []

  return {
    id: typeof payload.id === 'string' && payload.id.trim() ? payload.id : createStrokeId(),
    tool,
    color: typeof payload.color === 'string' && payload.color.trim() ? payload.color : '#203247',
    size: typeof payload.size === 'number' && Number.isFinite(payload.size) ? payload.size : 5,
    points,
  }
}

