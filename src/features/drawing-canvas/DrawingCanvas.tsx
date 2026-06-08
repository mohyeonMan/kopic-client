import './DrawingCanvas.css'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { CanvasStroke, DrawingTool } from '@/entities/game/model'
import { useCanvasInputGuards } from './hooks/useCanvasInputGuards'
import { useCommittedCanvasRenderer } from './hooks/useCommittedCanvasRenderer'
import { MAX_POINTS_PER_STROKE } from './lib/canvasBoardConstants'
import { clearTextSelection, getCanvasPoint } from './lib/canvasPointer'
import { buildCommittedStroke, createCanvasStrokeCid, type DraftStroke } from './lib/canvasStroke'

type DrawingCanvasProps = {
  strokes: CanvasStroke[]
  canDraw: boolean
  tool: DrawingTool
  color: string
  size: number
  onSendStrokeChunk?: (stroke: CanvasStroke) => void
  onCommitStroke: (stroke: CanvasStroke) => void
}

export function DrawingCanvas({
  strokes,
  canDraw,
  tool,
  color,
  size,
  onSendStrokeChunk,
  onCommitStroke,
}: DrawingCanvasProps) {
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokeMaskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef(strokes)
  const draftStrokeRef = useRef<DraftStroke | null>(null)
  const transmitStrokeRef = useRef<DraftStroke | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const renderedStrokeIdsRef = useRef<string[]>([])

  const {
    appendCommittedStroke,
    redrawDraft,
    syncCommittedCanvas,
  } = useCommittedCanvasRenderer({
    committedCanvasRef,
    draftCanvasRef,
    draftStrokeRef,
    renderedStrokeIdsRef,
    strokeMaskCanvasRef,
    strokesRef,
  })

  useCanvasInputGuards(draftCanvasRef, canDraw)

  useLayoutEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useEffect(() => {
    syncCommittedCanvas(strokes, false)
  }, [strokes, syncCommittedCanvas])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    clearTextSelection()

    if (!canDraw) {
      return
    }

    const canvas = draftCanvasRef.current
    if (!canvas) {
      return
    }

    event.preventDefault()

    if (tool === 'FILL') {
      const cid = createCanvasStrokeCid()
      const committedStroke = buildCommittedStroke({
        cid,
        tool,
        color,
        points: [getCanvasPoint(event, canvas, size, false)],
      })

      onSendStrokeChunk?.(committedStroke)
      appendCommittedStroke(committedStroke)
      onCommitStroke(committedStroke)
      return
    }

    const startPoint = getCanvasPoint(event, canvas, size, tool === 'PEN' && event.pointerType === 'pen')
    const cid = createCanvasStrokeCid()
    activePointerIdRef.current = event.pointerId
    canvas.setPointerCapture(event.pointerId)
    draftStrokeRef.current = {
      cid,
      tool,
      color,
      points: [startPoint],
    }
    transmitStrokeRef.current = {
      cid,
      tool,
      color,
      points: [startPoint],
    }
    redrawDraft()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = draftCanvasRef.current
    if (!canvas || activePointerIdRef.current !== event.pointerId || !draftStrokeRef.current) {
      return
    }

    event.preventDefault()

    const nextPoint = getCanvasPoint(
      event,
      canvas,
      size,
      draftStrokeRef.current.tool === 'PEN' && event.pointerType === 'pen',
    )
    const nextDraftPoints = [...draftStrokeRef.current.points, nextPoint]
    const nextTransmitPoints = [...(transmitStrokeRef.current?.points ?? []), nextPoint]

    draftStrokeRef.current = {
      ...draftStrokeRef.current,
      points: nextDraftPoints,
    }

    if (nextTransmitPoints.length > MAX_POINTS_PER_STROKE) {
      const flushedPoints = nextTransmitPoints.slice(0, MAX_POINTS_PER_STROKE)
      const carryPoint = flushedPoints[flushedPoints.length - 1]
      const chunkStroke = buildCommittedStroke({
        cid: draftStrokeRef.current.cid,
        tool: draftStrokeRef.current.tool,
        color: draftStrokeRef.current.color,
        points: flushedPoints,
      })

      onSendStrokeChunk?.(chunkStroke)
      transmitStrokeRef.current = {
        cid: draftStrokeRef.current.cid,
        tool: draftStrokeRef.current.tool,
        color: draftStrokeRef.current.color,
        points: [carryPoint, nextPoint],
      }
      redrawDraft()
      return
    }

    transmitStrokeRef.current = {
      cid: draftStrokeRef.current.cid,
      tool: draftStrokeRef.current.tool,
      color: draftStrokeRef.current.color,
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

    const remainingTransmitStroke = transmitStrokeRef.current
    if (remainingTransmitStroke && remainingTransmitStroke.points.length > 0) {
      onSendStrokeChunk?.(buildCommittedStroke(remainingTransmitStroke))
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
      <canvas ref={committedCanvasRef} className="draw-surface draw-surface-static" aria-hidden="true" />
      <canvas
        ref={draftCanvasRef}
        className={canDraw ? 'draw-surface draw-surface-active' : 'draw-surface'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={cancelStroke}
        onContextMenu={(event) => event.preventDefault()}
        onPointerLeave={(event) => {
          if (event.buttons === 0) {
            cancelStroke()
          }
        }}
      />
    </>
  )
}
