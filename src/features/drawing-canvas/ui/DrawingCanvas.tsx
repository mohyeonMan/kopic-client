/**
 * DrawingCanvas
 *
 * 책임:
 * - canvas pointer input을 normalized stroke로 변환
 * - committed/draft canvas를 직접 렌더링해 drawing UX 제공
 *
 * 하지 않는 것:
 * - WebSocket send
 * - game store mutation
 * - toolbar/tool state 소유
 *
 * side effect:
 * - canvas DOM event 기본 동작 방지
 * - resize 시 canvas backing store 재설정
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { CanvasPoint, CanvasStroke, DrawingTool } from '@/entities/game/model/gameTypes'
import {
  CANVAS_BASE_HEIGHT,
  CANVAS_BASE_WIDTH,
  drawStroke,
  paintSolidStroke,
} from '@/features/drawing-canvas/model/canvasPaint'
import './DrawingCanvas.css'

type DrawingCanvasProps = {
  activeColor: string
  canDraw: boolean
  onCommitStroke: (stroke: CanvasStroke) => void
  onSendStrokeChunk: (stroke: CanvasStroke) => void
  size: number
  strokes: CanvasStroke[]
  tool: DrawingTool
}

type DraftStroke = Omit<CanvasStroke, 'id'>

const MAX_POINTS_PER_STROKE = 5

function createStrokeId() {
  return crypto.randomUUID()
}

function clearTextSelection() {
  window.getSelection?.()?.removeAllRanges()
}

function getCanvasPoint(
  event: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): CanvasPoint {
  const rect = canvas.getBoundingClientRect()

  return {
    x: Number(((event.clientX - rect.left) / rect.width).toFixed(3)),
    y: Number(((event.clientY - rect.top) / rect.height).toFixed(3)),
  }
}

function buildCommittedStroke(draftStroke: DraftStroke): CanvasStroke {
  return {
    id: createStrokeId(),
    ...draftStroke,
  }
}

export function DrawingCanvas({
  activeColor,
  canDraw,
  onCommitStroke,
  onSendStrokeChunk,
  size,
  strokes,
  tool,
}: DrawingCanvasProps) {
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokeMaskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const draftStrokeRef = useRef<DraftStroke | null>(null)
  const renderedStrokeIdsRef = useRef<string[]>([])
  const strokesRef = useRef(strokes)
  const transmitStrokeRef = useRef<DraftStroke | null>(null)

  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useEffect(() => {
    const canvas = draftCanvasRef.current
    if (!canvas) {
      return
    }

    const preventDefault = (event: Event) => {
      clearTextSelection()
      event.preventDefault()
    }

    canvas.addEventListener('touchstart', preventDefault, { passive: false })
    canvas.addEventListener('touchmove', preventDefault, { passive: false })
    canvas.addEventListener('touchend', preventDefault, { passive: false })
    canvas.addEventListener('touchcancel', preventDefault, { passive: false })
    canvas.addEventListener('gesturestart', preventDefault as EventListener, { passive: false })
    canvas.addEventListener('gesturechange', preventDefault as EventListener, { passive: false })
    canvas.addEventListener('gestureend', preventDefault as EventListener, { passive: false })
    canvas.addEventListener('contextmenu', preventDefault)
    canvas.addEventListener('selectstart', preventDefault)
    canvas.addEventListener('dragstart', preventDefault)

    return () => {
      canvas.removeEventListener('touchstart', preventDefault)
      canvas.removeEventListener('touchmove', preventDefault)
      canvas.removeEventListener('touchend', preventDefault)
      canvas.removeEventListener('touchcancel', preventDefault)
      canvas.removeEventListener('gesturestart', preventDefault as EventListener)
      canvas.removeEventListener('gesturechange', preventDefault as EventListener)
      canvas.removeEventListener('gestureend', preventDefault as EventListener)
      canvas.removeEventListener('contextmenu', preventDefault)
      canvas.removeEventListener('selectstart', preventDefault)
      canvas.removeEventListener('dragstart', preventDefault)
    }
  }, [])

  const drawCommittedStroke = useCallback((context: CanvasRenderingContext2D, stroke: CanvasStroke) => {
    if (stroke.tool === 'FILL') {
      drawStroke(context, stroke)
      return
    }

    const maskContext = strokeMaskCanvasRef.current?.getContext('2d')
    if (!maskContext) {
      drawStroke(context, stroke)
      return
    }

    paintSolidStroke(context, maskContext, stroke)
  }, [])

  const syncCommittedCanvas = useCallback(
    (nextStrokes: CanvasStroke[], forceFullRedraw = false) => {
      const canvas = committedCanvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) {
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
        context.fillRect(0, 0, CANVAS_BASE_WIDTH, CANVAS_BASE_HEIGHT)

        nextStrokes.forEach((stroke) => drawCommittedStroke(context, stroke))
        renderedStrokeIdsRef.current = nextStrokes.map((stroke) => stroke.id)
        return
      }

      if (renderedStrokeIds.length === nextStrokes.length) {
        return
      }

      const appendedStrokes = nextStrokes.slice(renderedStrokeIds.length)
      appendedStrokes.forEach((stroke) => drawCommittedStroke(context, stroke))
      renderedStrokeIdsRef.current = [
        ...renderedStrokeIds,
        ...appendedStrokes.map((stroke) => stroke.id),
      ]
    },
    [drawCommittedStroke],
  )

  const redrawDraft = useCallback(() => {
    const canvas = draftCanvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
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

  const appendCommittedStroke = useCallback(
    (stroke: CanvasStroke) => {
      const canvas = committedCanvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) {
        return
      }

      drawCommittedStroke(context, stroke)
      renderedStrokeIdsRef.current = [...renderedStrokeIdsRef.current, stroke.id]
    },
    [drawCommittedStroke],
  )

  useLayoutEffect(() => {
    const resize = () => {
      const committedCanvas = committedCanvasRef.current
      const draftCanvas = draftCanvasRef.current
      if (!committedCanvas || !draftCanvas) {
        return
      }

      if (!strokeMaskCanvasRef.current) {
        strokeMaskCanvasRef.current = document.createElement('canvas')
      }

      const ratio = window.devicePixelRatio || 1
      ;[committedCanvas, draftCanvas, strokeMaskCanvasRef.current].forEach((canvas) => {
        canvas.width = CANVAS_BASE_WIDTH * ratio
        canvas.height = CANVAS_BASE_HEIGHT * ratio

        if (canvas !== strokeMaskCanvasRef.current) {
          canvas.style.width = '100%'
          canvas.style.height = '100%'
        }

        const context = canvas.getContext('2d')
        context?.setTransform(ratio, 0, 0, ratio, 0, 0)
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

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    clearTextSelection()

    if (!canDraw) {
      event.preventDefault()
      return
    }

    const canvas = draftCanvasRef.current
    if (!canvas) {
      return
    }

    event.preventDefault()
    const strokeColor = tool === 'ERASER' ? '#ffffff' : activeColor

    if (tool === 'FILL') {
      const committedStroke = buildCommittedStroke({
        tool,
        color: strokeColor,
        size,
        points: [getCanvasPoint(event, canvas)],
      })
      onSendStrokeChunk(committedStroke)
      appendCommittedStroke(committedStroke)
      onCommitStroke(committedStroke)
      return
    }

    const startPoint = getCanvasPoint(event, canvas)
    activePointerIdRef.current = event.pointerId
    canvas.setPointerCapture(event.pointerId)
    draftStrokeRef.current = {
      tool,
      color: strokeColor,
      size,
      points: [startPoint],
    }
    transmitStrokeRef.current = {
      tool,
      color: strokeColor,
      size,
      points: [startPoint],
    }
    redrawDraft()
  }

  const moveStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = draftCanvasRef.current
    if (!canvas || activePointerIdRef.current !== event.pointerId || !draftStrokeRef.current) {
      return
    }

    event.preventDefault()
    const nextPoint = getCanvasPoint(event, canvas)
    const nextDraftPoints = [...draftStrokeRef.current.points, nextPoint]
    const nextTransmitPoints = [...(transmitStrokeRef.current?.points ?? []), nextPoint]
    draftStrokeRef.current = {
      ...draftStrokeRef.current,
      points: nextDraftPoints,
    }

    if (nextTransmitPoints.length > MAX_POINTS_PER_STROKE) {
      const flushedPoints = nextTransmitPoints.slice(0, MAX_POINTS_PER_STROKE)
      const carryPoint = flushedPoints[flushedPoints.length - 1]
      onSendStrokeChunk(
        buildCommittedStroke({
          tool: draftStrokeRef.current.tool,
          color: draftStrokeRef.current.color,
          size: draftStrokeRef.current.size,
          points: flushedPoints,
        }),
      )
      transmitStrokeRef.current = {
        tool: draftStrokeRef.current.tool,
        color: draftStrokeRef.current.color,
        size: draftStrokeRef.current.size,
        points: [carryPoint, nextPoint],
      }
      redrawDraft()
      return
    }

    transmitStrokeRef.current = {
      tool: draftStrokeRef.current.tool,
      color: draftStrokeRef.current.color,
      size: draftStrokeRef.current.size,
      points: nextTransmitPoints,
    }
    redrawDraft()
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = draftCanvasRef.current
    if (!canvas || activePointerIdRef.current !== event.pointerId || !draftStrokeRef.current) {
      return
    }

    event.preventDefault()
    canvas.releasePointerCapture(event.pointerId)
    activePointerIdRef.current = null

    if (transmitStrokeRef.current && transmitStrokeRef.current.points.length > 0) {
      onSendStrokeChunk(buildCommittedStroke(transmitStrokeRef.current))
    }

    const committedStroke = buildCommittedStroke(draftStrokeRef.current)
    draftStrokeRef.current = null
    transmitStrokeRef.current = null
    appendCommittedStroke(committedStroke)
    onCommitStroke(committedStroke)
    redrawDraft()
  }

  const cancelStroke = () => {
    activePointerIdRef.current = null
    draftStrokeRef.current = null
    transmitStrokeRef.current = null
    redrawDraft()
  }

  return (
    <>
      <canvas ref={committedCanvasRef} className="drawing-canvas drawing-canvas--static" aria-hidden="true" />
      <canvas
        ref={draftCanvasRef}
        className={canDraw ? 'drawing-canvas drawing-canvas--active' : 'drawing-canvas'}
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={cancelStroke}
        onPointerDown={startStroke}
        onPointerLeave={(event) => {
          if (event.buttons === 0) {
            cancelStroke()
          }
        }}
        onPointerMove={moveStroke}
        onPointerUp={finishStroke}
      />
    </>
  )
}
