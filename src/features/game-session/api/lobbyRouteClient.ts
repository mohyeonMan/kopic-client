export type LobbyRouteKind = 'quick' | 'private-create' | 'private-join'

export type LobbyRouteRequest = {
  kind: LobbyRouteKind
  nickname: string
  roomCode?: string
}

export type LobbyRouteFailure = {
  reason: string
  message: string
}

type LobbyRouteResponseBody = {
  routeToken?: unknown
}

const DEFAULT_ROUTE_FAILURE: LobbyRouteFailure = {
  reason: 'ROUTE_REQUEST_FAILED',
  message: '입장 경로를 발급받을 수 없습니다.',
}

export class LobbyRouteError extends Error {
  readonly failure: LobbyRouteFailure
  readonly reason: string

  constructor(failure: LobbyRouteFailure) {
    super(failure.message)
    this.name = 'LobbyRouteError'
    this.failure = failure
    this.reason = failure.reason
  }
}

function normalizeBaseUrl(value: string) {
  const withoutTrailingSlash = value.replace(/\/+$/, '')
  return withoutTrailingSlash || '/'
}

function normalizePath(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function resolveDefaultLobbyPath() {
  const baseUrl = import.meta.env.BASE_URL ?? '/'
  const normalizedBase = normalizePath(baseUrl).replace(/\/+$/, '')
  return `${normalizedBase}/routes`
}

function resolveLobbyBaseUrl() {
  const configuredUrl = import.meta.env.VITE_LOBBY_URL?.trim()
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl)
  }

  const configuredPath = import.meta.env.VITE_LOBBY_PATH?.trim()
  if (configuredPath) {
    return normalizeBaseUrl(normalizePath(configuredPath))
  }

  return normalizeBaseUrl(resolveDefaultLobbyPath())
}

function resolveEndpoint(kind: LobbyRouteKind) {
  switch (kind) {
    case 'private-create':
      return 'private'
    case 'private-join':
      return 'private/join'
    case 'quick':
      return 'quick'
  }
}

function createRequestBody(request: LobbyRouteRequest) {
  if (request.kind === 'private-join') {
    return {
      nickname: request.nickname,
      roomCode: request.roomCode,
    }
  }

  return {
    nickname: request.nickname,
  }
}

function readStringField(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || !(field in value)) {
    return null
  }

  const fieldValue = (value as Record<string, unknown>)[field]
  return typeof fieldValue === 'string' && fieldValue.trim() ? fieldValue.trim() : null
}

function normalizeFailurePayload(value: unknown): LobbyRouteFailure {
  const reason = readStringField(value, 'reason')
  const message = readStringField(value, 'message')

  return {
    reason: reason ?? DEFAULT_ROUTE_FAILURE.reason,
    message: message ?? DEFAULT_ROUTE_FAILURE.message,
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function readFailure(response: Response): Promise<LobbyRouteFailure> {
  const body = await readJson(response)
  return normalizeFailurePayload(body)
}

export function normalizeLobbyRouteError(error: unknown): LobbyRouteFailure {
  if (error instanceof LobbyRouteError) {
    return error.failure
  }

  return DEFAULT_ROUTE_FAILURE
}

export async function requestLobbyRoute(request: LobbyRouteRequest): Promise<string> {
  const baseUrl = resolveLobbyBaseUrl()
  const endpoint = resolveEndpoint(request.kind)
  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createRequestBody(request)),
  })

  if (!response.ok) {
    throw new LobbyRouteError(await readFailure(response))
  }

  const body = await readJson(response) as LobbyRouteResponseBody | null
  const routeToken = readStringField(body, 'routeToken')
  if (!routeToken) {
    throw new LobbyRouteError(DEFAULT_ROUTE_FAILURE)
  }

  return routeToken
}
