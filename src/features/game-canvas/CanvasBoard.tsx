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
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef(strokes)
  const draftStrokeRef = useRef<DraftStroke | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const renderedStrokeIdsRef = useRef<string[]>([])

  strokesRef.current = strokes

  const syncCommittedCanvas = useCallback((nextStrokes: CanvasStroke[], forceFullRedraw = false) => {
    const canvas = committedCanvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const renderedStrokeIds = renderedStrokeIdsRef.current
    const hasMismatch =
      renderedStrokeIds.length > nextStrokes.length ||
      renderedStrokeIds.some((id, index) => nextStrokes[index]?.id !== id)

    if (forceFullRedraw || hasMismatch) {
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.restore()
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

      nextStrokes.forEach((stroke) => drawStroke(context, stroke))
      renderedStrokeIdsRef.current = nextStrokes.map((stroke) => stroke.id)
      return
    }

    if (renderedStrokeIds.length === nextStrokes.length) {
      return
    }

    const appendedStrokes = nextStrokes.slice(renderedStrokeIds.length)
    appendedStrokes.forEach((stroke) => drawStroke(context, stroke))
    renderedStrokeIdsRef.current = [...renderedStrokeIds, ...appendedStrokes.map((stroke) => stroke.id)]
  }, [])

  const redrawDraft = useCallback(() => {
    const canvas = draftCanvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()

    if (draftStrokeRef.current) {
      drawStroke(context, draftStrokeRef.current)
    }
  }, [])

  const appendCommittedStroke = useCallback((stroke: CanvasStroke) => {
    const canvas = committedCanvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    drawStroke(context, stroke)
    renderedStrokeIdsRef.current = [...renderedStrokeIdsRef.current, stroke.id]
  }, [])

  useLayoutEffect(() => {
    const resize = () => {
      const committedCanvas = committedCanvasRef.current
      const draftCanvas = draftCanvasRef.current
      if (!committedCanvas || !draftCanvas) {
        return
      }

      const ratio = window.devicePixelRatio || 1

      ;[committedCanvas, draftCanvas].forEach((canvas) => {
        canvas.width = BASE_WIDTH * ratio
        canvas.height = BASE_HEIGHT * ratio
        canvas.style.width = '100%'
        canvas.style.height = '100%'

        const context = canvas.getContext('2d')
        if (!context) {
          return
        }

        context.setTransform(ratio, 0, 0, ratio, 0, 0)
      })

      renderedStrokeIdsRef.current = []
      syncCommittedCanvas(strokesRef.current, true)
      redrawDraft()
    }

    resize()
    window.addEventListener('resize', resize)

    return () => window.removeEventListener('resize', resize)
  }, [redrawDraft, syncCommittedCanvas])

  useEffect(() => {
    syncCommittedCanvas(strokes, false)
  }, [strokes, syncCommittedCanvas])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) {
      return
    }

    const canvas = draftCanvasRef.current
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

      appendCommittedStroke(committedStroke)
      onCommitStroke(committedStroke)
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
    redrawDraft()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = draftCanvasRef.current
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

      appendCommittedStroke(committedStroke)
      onCommitStroke(committedStroke)
      console.log('DRAW_STROKE mock', committedStroke)

      draftStrokeRef.current = {
        ...draftStrokeRef.current,
        points: [carryPoint, nextPoints[nextPoints.length - 1]],
      }
      redrawDraft()
      return
    }

    draftStrokeRef.current = {
      ...draftStrokeRef.current,
      points: nextPoints,
    }
    redrawDraft()
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = draftCanvasRef.current
    if (!canvas || activePointerIdRef.current !== event.pointerId || !draftStrokeRef.current) {
      return
    }

    canvas.releasePointerCapture(event.pointerId)
    activePointerIdRef.current = null

    const committedStroke = buildCommittedStroke(draftStrokeRef.current)

    draftStrokeRef.current = null
    appendCommittedStroke(committedStroke)
    onCommitStroke(committedStroke)
    console.log('DRAW_STROKE mock', committedStroke)
    redrawDraft()
  }

  const cancelStroke = () => {
    activePointerIdRef.current = null
    draftStrokeRef.current = null
    redrawDraft()
  }

  return (
    <>
      <canvas ref={committedCanvasRef} className="draw-surface draw-surface-static" aria-hidden="true" />
      <canvas
        ref={draftCanvasRef}
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
    </>
  )
}
