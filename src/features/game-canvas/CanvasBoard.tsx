import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { CanvasPoint, CanvasStroke, DrawingTool } from '../../app/store/mockAppState'

type CanvasBoardProps = {
  strokes: CanvasStroke[]
  canDraw: boolean
  tool: DrawingTool
  color: string
  size: number
  onCommitStroke: (stroke: CanvasStroke) => void
}

type DraftStroke = Omit<CanvasStroke, 'id'>

const BASE_WIDTH = 960
const BASE_HEIGHT = 640
const MAX_POINTS_PER_STROKE = 5
const FILL_TOLERANCE = 12

function getCanvasPoint(
  event: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): CanvasPoint {
  const rect = canvas.getBoundingClientRect()

  return {
    x: Number(((event.clientX - rect.left) / rect.width).toFixed(5)),
    y: Number(((event.clientY - rect.top) / rect.height).toFixed(5)),
  }
}

function strokeColor(stroke: Pick<CanvasStroke, 'tool' | 'color'>) {
  return stroke.tool === 'ERASER' ? '#ffffff' : stroke.color
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
  const x = Math.max(0, Math.min(BASE_WIDTH - 1, Math.floor(point.x * BASE_WIDTH)))
  const y = Math.max(0, Math.min(BASE_HEIGHT - 1, Math.floor(point.y * BASE_HEIGHT)))
  const image = context.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT)
  const { data, width, height } = image
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

function drawStroke(
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
    context.arc(point.x * BASE_WIDTH, point.y * BASE_HEIGHT, stroke.size / 2, 0, Math.PI * 2)
    context.fillStyle = strokeColor(stroke)
    context.fill()
    context.restore()
    return
  }

  context.beginPath()
  stroke.points.forEach((point, index) => {
    const x = point.x * BASE_WIDTH
    const y = point.y * BASE_HEIGHT

    if (index === 0) {
      context.moveTo(x, y)
      return
    }

    context.lineTo(x, y)
  })
  context.stroke()
  context.restore()
}

function buildCommittedStroke(draftStroke: DraftStroke): CanvasStroke {
  return {
    id: crypto.randomUUID(),
    ...draftStroke,
  }
}

export function CanvasBoard({
  strokes,
  canDraw,
  tool,
  color,
  size,
  onCommitStroke,
}: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const draftStrokeRef = useRef<DraftStroke | null>(null)
  const activePointerIdRef = useRef<number | null>(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    strokes.forEach((stroke) => drawStroke(context, stroke))

    if (draftStrokeRef.current) {
      drawStroke(context, draftStrokeRef.current)
    }
  }, [strokes])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      canvas.width = BASE_WIDTH * ratio
      canvas.height = BASE_HEIGHT * ratio
      canvas.style.width = '100%'
      canvas.style.height = '100%'

      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      redraw()
    }

    resize()
    window.addEventListener('resize', resize)

    return () => window.removeEventListener('resize', resize)
  }, [redraw])

  useEffect(() => {
    redraw()
  }, [redraw])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    if (tool === 'FILL') {
      const committedStroke = buildCommittedStroke({
        tool,
        color,
        size,
        points: [getCanvasPoint(event, canvas)],
      })

      onCommitStroke(committedStroke)
      redraw()
      return
    }

    activePointerIdRef.current = event.pointerId
    canvas.setPointerCapture(event.pointerId)
    draftStrokeRef.current = {
      tool,
      color,
      size,
      points: [getCanvasPoint(event, canvas)],
    }
    redraw()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || activePointerIdRef.current !== event.pointerId || !draftStrokeRef.current) {
      return
    }

    const nextPoints = [...draftStrokeRef.current.points, getCanvasPoint(event, canvas)]

    if (nextPoints.length > MAX_POINTS_PER_STROKE) {
      const flushedPoints = nextPoints.slice(0, MAX_POINTS_PER_STROKE)
      const carryPoint = flushedPoints[flushedPoints.length - 1]
      const committedStroke = buildCommittedStroke({
        ...draftStrokeRef.current,
        points: flushedPoints,
      })

      onCommitStroke(committedStroke)
      console.log('DRAW_STROKE mock', committedStroke)

      draftStrokeRef.current = {
        ...draftStrokeRef.current,
        points: [carryPoint, nextPoints[nextPoints.length - 1]],
      }
      redraw()
      return
    }

    draftStrokeRef.current = {
      ...draftStrokeRef.current,
      points: nextPoints,
    }
    redraw()
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || activePointerIdRef.current !== event.pointerId || !draftStrokeRef.current) {
      return
    }

    canvas.releasePointerCapture(event.pointerId)
    activePointerIdRef.current = null

    const committedStroke = buildCommittedStroke(draftStrokeRef.current)

    draftStrokeRef.current = null
    onCommitStroke(committedStroke)
    console.log('DRAW_STROKE mock', committedStroke)
    redraw()
  }

  const cancelStroke = () => {
    activePointerIdRef.current = null
    draftStrokeRef.current = null
    redraw()
  }

  return (
    <canvas
      ref={canvasRef}
      className={canDraw ? 'draw-surface draw-surface-active' : 'draw-surface'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={cancelStroke}
      onPointerLeave={(event) => {
        if (event.buttons === 0) {
          cancelStroke()
        }
      }}
    />
  )
}
