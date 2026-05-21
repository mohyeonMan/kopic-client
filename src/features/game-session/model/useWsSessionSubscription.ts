import { useEffect } from 'react'
import { wsSessionManager } from '@/features/game-session/api/wsSessionManager'
import { decodeInboundEnvelope } from '@/features/game-session/api/inboundEnvelope'
import { decodeConnectionErrorPayload } from '@/entities/game/api/gamePayloadDecoders'
import type { ConnectionStatus } from '@/entities/game/model'
import type { Envelope } from '@/features/game-session/api/gameSessionEvents'

type WsSessionDispatch = (action:
  | { type: 'connection/statusChanged'; payload: ConnectionStatus }
  | { type: 'local/connectionErrorReported'; payload: { reason: string; message: string } }
) => void

type UseWsSessionSubscriptionArgs = {
  clearInboundStrokeQueue: () => void
  dispatch: WsSessionDispatch
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
