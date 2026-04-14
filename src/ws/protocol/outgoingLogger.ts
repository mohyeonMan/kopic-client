import { clientEventMeta, type ClientEventCode } from './events'

type ClientEventName = (typeof clientEventMeta)[number]['name']

const clientEventCodeByName = new Map<ClientEventName, ClientEventCode>(
  clientEventMeta.map((event) => [event.name, event.code]),
)

type LogOptions = {
  transport?: 'ws' | 'mock'
}

export function logOutgoingClientEvent<TPayload>(
  eventName: ClientEventName,
  payload: TPayload,
  options?: LogOptions,
) {
  if (!import.meta.env.DEV) {
    return
  }

  const code = clientEventCodeByName.get(eventName)

  if (!code) {
    return
  }

  const prefix = options?.transport === 'mock' ? '[ws:out:mock]' : '[ws:out]'
  console.info(`${prefix} ${code} ${eventName}`, {
    e: code,
    p: payload,
    at: new Date().toISOString(),
  })
}

