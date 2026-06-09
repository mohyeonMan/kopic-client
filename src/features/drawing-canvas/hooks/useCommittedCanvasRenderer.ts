import {
  useCallback,
  useLayoutEffect,
  type RefObject,
} from 'react'
import type { CanvasStroke } from '@/entities/game/model'
import {
  BASE_HEIGHT,
  BASE_WIDTH,
} from '../lib/canvasBoardConstants'
import { drawStroke, paintSolidStroke } from '../lib/canvasRenderer'
import type { DraftStroke } from '../lib/canvasStroke'

type UseCommittedCanvasRendererArgs = {
  committedCanvasRef: RefObject<HTMLCanvasElement | null>
  draftCanvasRef: RefObject<HTMLCanvasElement | null>
  draftStrokeRef: RefObject<DraftStroke | null>
  renderedStrokeIdsRef: RefObject<string[]>
  strokeMaskCanvasRef: RefObject<HTMLCanvasElement | null>
  strokesRef: RefObject<CanvasStroke[]>
}

export function useCommittedCanvasRenderer({
  committedCanvasRef,
  draftCanvasRef,
  draftStrokeRef,
  renderedStrokeIdsRef,
  strokeMaskCanvasRef,
  strokesRef,
}: UseCommittedCanvasRendererArgs) {
  const drawCommittedStroke = useCallback((context: CanvasRenderingContext2D, stroke: CanvasStroke) => {
    if (stroke.clear) {
      drawStroke(context, stroke)
      return
    }

    if (stroke.tool === 'FILL') {
      drawStroke(context, stroke)
      return
    }

    const maskCanvas = strokeMaskCanvasRef.current
    const maskContext = maskCanvas?.getContext('2d')

    if (!maskContext) {
      drawStroke(context, stroke)
      return
    }

    paintSolidStroke(context, maskContext, stroke)
  }, [strokeMaskCanvasRef])

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

      let replayStartIndex = 0
      for (let index = nextStrokes.length - 1; index >= 0; index -= 1) {
        if (nextStrokes[index].clear) {
          replayStartIndex = index + 1
          break
        }
      }

      for (let index = replayStartIndex; index < nextStrokes.length; index += 1) {
        drawCommittedStroke(context, nextStrokes[index])
      }

      renderedStrokeIds.length = 0
      for (const stroke of nextStrokes) {
        renderedStrokeIds.push(stroke.id)
      }
      return
    }

    if (renderedStrokeIds.length === nextStrokes.length) {
      return
    }

    for (let index = renderedStrokeIds.length; index < nextStrokes.length; index += 1) {
      const stroke = nextStrokes[index]
      drawCommittedStroke(context, stroke)
      renderedStrokeIds.push(stroke.id)
    }
  }, [committedCanvasRef, drawCommittedStroke, renderedStrokeIdsRef])

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
  }, [draftCanvasRef, draftStrokeRef])

  const appendCommittedStroke = useCallback((stroke: CanvasStroke) => {
    const canvas = committedCanvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    drawCommittedStroke(context, stroke)
    renderedStrokeIdsRef.current.push(stroke.id)
  }, [committedCanvasRef, drawCommittedStroke, renderedStrokeIdsRef])

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

      const strokeMaskCanvas = strokeMaskCanvasRef.current
      const ratio = window.devicePixelRatio || 1

      ;[committedCanvas, draftCanvas, strokeMaskCanvas].forEach((canvas) => {
        canvas.width = BASE_WIDTH * ratio
        canvas.height = BASE_HEIGHT * ratio

        if (canvas !== strokeMaskCanvas) {
          canvas.style.width = '100%'
          canvas.style.height = '100%'
        }

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
  }, [
    committedCanvasRef,
    draftCanvasRef,
    redrawDraft,
    renderedStrokeIdsRef,
    strokeMaskCanvasRef,
    strokesRef,
    syncCommittedCanvas,
  ])

  return {
    appendCommittedStroke,
    redrawDraft,
    syncCommittedCanvas,
  }
}
