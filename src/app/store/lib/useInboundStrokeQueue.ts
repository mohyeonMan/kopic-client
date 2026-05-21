import { useCallback, useEffect, useRef } from 'react'
import type { CanvasStroke } from '../../../entities/game/model'
import type { AppAction } from './appStateReducer'

export function useInboundStrokeQueue(dispatch: (action: AppAction) => void) {
  const inboundStrokeQueueRef = useRef<CanvasStroke[]>([])
  const inboundStrokeFlushRafRef = useRef<number | null>(null)

  const flushInboundStrokeQueue = useCallback(() => {
    inboundStrokeFlushRafRef.current = null
    const pending = inboundStrokeQueueRef.current
    if (pending.length === 0) {
      return
    }

    inboundStrokeQueueRef.current = []
    dispatch({ type: 'server/canvasStrokesReceived', payload: pending })
  }, [dispatch])

  const clearInboundStrokeQueue = useCallback(() => {
    inboundStrokeQueueRef.current = []
    if (inboundStrokeFlushRafRef.current !== null) {
      window.cancelAnimationFrame(inboundStrokeFlushRafRef.current)
      inboundStrokeFlushRafRef.current = null
    }
  }, [])

  const enqueueInboundStroke = useCallback(
    (stroke: CanvasStroke) => {
      inboundStrokeQueueRef.current.push(stroke)

      if (inboundStrokeFlushRafRef.current !== null) {
        return
      }

      inboundStrokeFlushRafRef.current = window.requestAnimationFrame(flushInboundStrokeQueue)
    },
    [flushInboundStrokeQueue],
  )

  useEffect(() => {
    return () => {
      clearInboundStrokeQueue()
    }
  }, [clearInboundStrokeQueue])

  return {
    clearInboundStrokeQueue,
    enqueueInboundStroke,
  }
}
