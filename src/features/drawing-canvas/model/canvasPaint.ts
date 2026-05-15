/**
 * canvasPaint
 *
 * 책임:
 * - canvas stroke를 실제 CanvasRenderingContext2D에 그리는 순수 drawing helper
 *
 * 하지 않는 것:
 * - React state 관리
 * - WebSocket 전송
 * - pointer event 처리
 *
 * 의존:
 * - canvas entity types
 *
 * 사용 위치:
 * - DrawingCanvas
 */
import type { CanvasPoint, CanvasStroke } from '@/entities/game/model/gameTypes'

export const CANVAS_BASE_WIDTH = 960
export const CANVAS_BASE_HEIGHT = 640

const FILL_TOLERANCE = 56
const SOLID_STROKE_ALPHA_THRESHOLD = 8
const SOLID_STROKE_PADDING = 2

function strokeColor(stroke: Pick<CanvasStroke, 'tool' | 'color'>) {
  return stroke.tool === 'ERASER' ? '#ffffff' : stroke.color
}

function hexToRgba(color: string): [number, number, number, number] {
  const hex = color.replace('#', '')
  const normalized =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : hex
  const value = Number.parseInt(normalized, 16)

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255]
}

function colorsMatch(
  imageData: Uint8ClampedArray,
  index: number,
  target: [number, number, number, number],
  tolerance: number,
) {
  return (
    Math.abs(imageData[index] - target[0]) <= tolerance &&
    Math.abs(imageData[index + 1] - target[1]) <= tolerance &&
    Math.abs(imageData[index + 2] - target[2]) <= tolerance &&
    Math.abs(imageData[index + 3] - target[3]) <= tolerance
  )
}

function floodFill(
  context: CanvasRenderingContext2D,
  point: CanvasPoint,
  fillColor: string,
) {
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height)
  const { data, width, height } = image
  const x = Math.max(0, Math.min(width - 1, Math.floor(point.x * width)))
  const y = Math.max(0, Math.min(height - 1, Math.floor(point.y * height)))
  const startIndex = (y * width + x) * 4
  const target: [number, number, number, number] = [
    data[startIndex],
    data[startIndex + 1],
    data[startIndex + 2],
    data[startIndex + 3],
  ]
  const replacement = hexToRgba(fillColor)

  if (
    target[0] === replacement[0] &&
    target[1] === replacement[1] &&
    target[2] === replacement[2] &&
    target[3] === replacement[3]
  ) {
    return
  }

  const stack = [[x, y]]

  while (stack.length > 0) {
    const next = stack.pop()
    if (!next) {
      continue
    }

    const [cx, cy] = next
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) {
      continue
    }

    const index = (cy * width + cx) * 4
    if (!colorsMatch(data, index, target, FILL_TOLERANCE)) {
      continue
    }

    data[index] = replacement[0]
    data[index + 1] = replacement[1]
    data[index + 2] = replacement[2]
    data[index + 3] = replacement[3]

    stack.push([cx + 1, cy])
    stack.push([cx - 1, cy])
    stack.push([cx, cy + 1])
    stack.push([cx, cy - 1])
  }

  context.putImageData(image, 0, 0)
}

export function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Pick<CanvasStroke, 'tool' | 'color' | 'size' | 'points'>,
) {
  if (stroke.points.length === 0) {
    return
  }

  if (stroke.tool === 'FILL') {
    floodFill(context, stroke.points[0], stroke.color)
    return
  }

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = strokeColor(stroke)
  context.lineWidth = stroke.size

  if (stroke.points.length === 1) {
    const point = stroke.points[0]
    context.beginPath()
    context.arc(
      point.x * CANVAS_BASE_WIDTH,
      point.y * CANVAS_BASE_HEIGHT,
      stroke.size / 2,
      0,
      Math.PI * 2,
    )
    context.fillStyle = strokeColor(stroke)
    context.fill()
    context.restore()
    return
  }

  context.beginPath()
  stroke.points.forEach((point, index) => {
    const x = point.x * CANVAS_BASE_WIDTH
    const y = point.y * CANVAS_BASE_HEIGHT

    if (index === 0) {
      context.moveTo(x, y)
      return
    }

    context.lineTo(x, y)
  })
  context.stroke()
  context.restore()
}

export function paintSolidStroke(
  context: CanvasRenderingContext2D,
  maskContext: CanvasRenderingContext2D,
  stroke: Pick<CanvasStroke, 'tool' | 'color' | 'size' | 'points'>,
) {
  if (stroke.points.length === 0) {
    return
  }

  const maskCanvas = maskContext.canvas
  const ratio = maskContext.getTransform().a || 1
  const xs = stroke.points.map((point) => point.x * CANVAS_BASE_WIDTH)
  const ys = stroke.points.map((point) => point.y * CANVAS_BASE_HEIGHT)
  const padding = stroke.size / 2 + SOLID_STROKE_PADDING
  const left = Math.max(0, Math.floor((Math.min(...xs) - padding) * ratio))
  const top = Math.max(0, Math.floor((Math.min(...ys) - padding) * ratio))
  const right = Math.min(maskCanvas.width, Math.ceil((Math.max(...xs) + padding) * ratio))
  const bottom = Math.min(maskCanvas.height, Math.ceil((Math.max(...ys) + padding) * ratio))
  const width = right - left
  const height = bottom - top

  if (width <= 0 || height <= 0) {
    return
  }

  maskContext.save()
  maskContext.setTransform(1, 0, 0, 1, 0, 0)
  maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
  maskContext.restore()
  drawStroke(maskContext, stroke)

  const maskImage = maskContext.getImageData(left, top, width, height)
  const nextImage = context.getImageData(left, top, width, height)
  const nextData = nextImage.data
  const maskData = maskImage.data
  const [red, green, blue] = hexToRgba(strokeColor(stroke))

  for (let index = 0; index < maskData.length; index += 4) {
    if (maskData[index + 3] < SOLID_STROKE_ALPHA_THRESHOLD) {
      continue
    }

    nextData[index] = red
    nextData[index + 1] = green
    nextData[index + 2] = blue
    nextData[index + 3] = 255
  }

  context.putImageData(nextImage, left, top)
}

