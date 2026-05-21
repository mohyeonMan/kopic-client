import { useEffect } from 'react'
import { wsSessionManager } from '../../../ws/client/wsSessionManager'
import { decodeConnectionErrorPayload } from './appStatePayloadDecoders'
import { decodeInboundEnvelope } from './appStateWsAdapter'
import type { AppAction } from './appStateReducer'
import type { Envelope } from '../../../ws/protocol/events'

type UseWsSessionSubscriptionArgs = {
  clearInboundStrokeQueue: () => void
  dispatch: (action: AppAction) => void
  handleServerEnvelope: (envelope: Envelope<unknown, number>) => void
}

export function useWsSessionSubscription({
  clearInboundStrokeQueue,
  dispatch,
  handleServerEnvelope,
}: UseWsSessionSubscriptionArgs) {
  useEffect(() => {
    const unsubscribe = wsSessionManager.subscribe((event) => {
      if (event.type === 'status') {
        dispatch({ type: 'connection/statusChanged', payload: event.status })
        return
      }

      if (event.type === 'error') {
        const connectionError = decodeConnectionErrorPayload(event.error)
        if (connectionError) {
          clearInboundStrokeQueue()
          dispatch({ type: 'local/connectionErrorReported', payload: connectionError })
        }
        return
      }

      try {
        const parsed = decodeInboundEnvelope(event.data)
        if (!parsed) {
          return
        }

        handleServerEnvelope(parsed)
      } catch (error) {
        console.error('[ws:in] invalid payload', error)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [clearInboundStrokeQueue, dispatch, handleServerEnvelope])
}
