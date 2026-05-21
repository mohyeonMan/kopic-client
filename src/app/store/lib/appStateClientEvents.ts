import { useCallback } from 'react'
import { wsSessionManager } from '../../../ws/client/wsSessionManager'
import {
  clientEventMeta,
  type ClientEventCode,
  type Envelope,
} from '../../../ws/protocol/events'

type ClientEventName = (typeof clientEventMeta)[number]['name']

export type SendClientEvent = <TPayload>(
  eventName: ClientEventName,
  payload: TPayload,
  fallback?: () => void,
) => void

const clientEventCodeByName = new Map<ClientEventName, ClientEventCode>(
  clientEventMeta.map((event) => [event.name, event.code]),
)

export function useClientEventSender(): SendClientEvent {
  return useCallback(
    <TPayload,>(eventName: ClientEventName, payload: TPayload, fallback?: () => void) => {
      const code = clientEventCodeByName.get(eventName)

      if (!code) {
        fallback?.()
        return
      }

      const envelope: Envelope<TPayload, ClientEventCode> = {
        e: code,
        p: payload,
      }

      const sent = wsSessionManager.send(JSON.stringify(envelope))
      if (!sent) {
        console.warn('[ws:out] dropped (socket not open)', { eventName, payload })
        fallback?.()
      }
    },
    [],
  )
}
