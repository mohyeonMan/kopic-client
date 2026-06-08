import type { CanvasPoint, CanvasStroke } from '@/entities/game/model'
import {
  BASE_HEIGHT,
  BASE_WIDTH,
  SOLID_STROKE_ALPHA_THRESHOLD,
  SOLID_STROKE_PADDING,
} from './canvasBoardConstants'

const STROKE_WIDTH_INTERPOLATION_STEP = 4

function strokeColor(stroke: Pick<CanvasStroke, 'tool' | 'color'>) {
  return stroke.tool === 'ERASER' ? '#ffffff' : stroke.color
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

function drawStrokeSegment(
  context: CanvasRenderingContext2D,
  previousPoint: CanvasPoint,
  point: CanvasPoint,
) {
  const startX = previousPoint.x * BASE_WIDTH
  const startY = previousPoint.y * BASE_HEIGHT
  const endX = point.x * BASE_WIDTH
  const endY = point.y * BASE_HEIGHT
  const distance = Math.hypot(endX - startX, endY - startY)
  const segmentCount = Math.max(1, Math.ceil(distance / STROKE_WIDTH_INTERPOLATION_STEP))

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const fromProgress = segmentIndex / segmentCount
    const toProgress = (segmentIndex + 1) / segmentCount

    context.beginPath()
    context.lineWidth =
      (interpolate(previousPoint.size, point.size, fromProgress) +
        interpolate(previousPoint.size, point.size, toProgress)) /
      2
    context.moveTo(interpolate(startX, endX, fromProgress), interpolate(startY, endY, fromProgress))
    context.lineTo(interpolate(startX, endX, toProgress), interpolate(startY, endY, toProgress))
    context.stroke()
  }
}

function colorsMatch(
  imageData: Uint8ClampedArray,
  index: number,
  target: [number, number, number, number],
) {
  return (
    imageData[index] === target[0] &&
    imageData[index + 1] === target[1] &&
    imageData[index + 2] === target[2] &&
    imageData[index + 3] === target[3]
  )
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

  const totalPixels = width * height
  const visited = new Uint8Array(totalPixels)
  const stack = new Uint32Array(totalPixels)
  let stackLength = 0

  const enqueuePixel = (pixelX: number, pixelY: number) => {
    if (pixelX < 0 || pixelY < 0 || pixelX >= width || pixelY >= height) {
      return
    }

    const pixelIndex = pixelY * width + pixelX
    if (visited[pixelIndex]) {
      return
    }

    const index = pixelIndex * 4
    if (!colorsMatch(data, index, target)) {
      return
    }

    visited[pixelIndex] = 1
    data[index] = replacement[0]
    data[index + 1] = replacement[1]
    data[index + 2] = replacement[2]
    data[index + 3] = replacement[3]
    stack[stackLength] = pixelIndex
    stackLength += 1
  }

  enqueuePixel(x, y)

  while (stackLength > 0) {
    const pixelIndex = stack[stackLength - 1]
    stackLength -= 1

    const cx = pixelIndex % width
    const cy = Math.floor(pixelIndex / width)
    enqueuePixel(cx + 1, cy)
    enqueuePixel(cx - 1, cy)
    enqueuePixel(cx, cy + 1)
    enqueuePixel(cx, cy - 1)
  }

  context.putImageData(image, 0, 0)
}

export function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Pick<CanvasStroke, 'tool' | 'color' | 'points'>,
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

  if (stroke.points.length === 1) {
    const point = stroke.points[0]
    context.beginPath()
    context.arc(point.x * BASE_WIDTH, point.y * BASE_HEIGHT, point.size / 2, 0, Math.PI * 2)
    context.fillStyle = strokeColor(stroke)
    context.fill()
    context.restore()
    return
  }

  stroke.points.slice(1).forEach((point, index) => {
    const previousPoint = stroke.points[index]
    drawStrokeSegment(context, previousPoint, point)
  })
  context.restore()
}

export function paintSolidStroke(
  context: CanvasRenderingContext2D,
  maskContext: CanvasRenderingContext2D,
  stroke: Pick<CanvasStroke, 'tool' | 'color' | 'points'>,
) {
  if (stroke.points.length === 0) {
    return
  }

  const maskCanvas = maskContext.canvas
  const ratio = maskContext.getTransform().a || 1
  const xs = stroke.points.map((point) => point.x * BASE_WIDTH)
  const ys = stroke.points.map((point) => point.y * BASE_HEIGHT)
  const maxPointSize = Math.max(...stroke.points.map((point) => point.size))
  const padding = maxPointSize / 2 + SOLID_STROKE_PADDING
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
