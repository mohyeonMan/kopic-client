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
  return stroke.tool === 'ERASER' ? '#fffaf0' : stroke.color
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Pick<CanvasStroke, 'tool' | 'color' | 'size' | 'points'>,
) {
  if (stroke.points.length === 0) {
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
    context.fillStyle = '#fffaf0'
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
