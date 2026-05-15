/**
 * chatMessageNormalizer
 *
 * 책임:
 * - server chat payload를 game chat entity shape로 변환
 * - sender id 기반 mine/nickname 보정에 필요한 최소 context만 사용
 *
 * 하지 않는 것:
 * - WebSocket 수신
 * - chat store mutation
 * - input validation
 *
 * 의존:
 * - game entity types
 *
 * 사용 위치:
 * - gameSessionApi
 * - roomSnapshotNormalizer
 */
import type { ChatMessage, ChatMessageTone, Participant } from '@/entities/game/model/gameTypes'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function createMessageId() {
  return crypto.randomUUID()
}

function resolveTone(rawTone: unknown, sealed: unknown): ChatMessageTone {
  if (rawTone === 'sealed' || sealed === true || sealed === 1 || sealed === '1' || sealed === 'true') {
    return 'sealed'
  }

  return rawTone === 'system' ||
    rawTone === 'guess' ||
    rawTone === 'correct' ||
    rawTone === 'alert' ||
    rawTone === 'alert-success'
    ? rawTone
    : 'guess'
}

type NormalizeChatMessageArgs = {
  ownSessionId?: string | null
  participants?: Participant[]
  payload: unknown
}

export function normalizeChatMessage({
  ownSessionId,
  participants = [],
  payload,
}: NormalizeChatMessageArgs): ChatMessage | null {
  if (!isRecord(payload)) {
    return null
  }

  const text = readNonEmptyString(payload.t) ?? readNonEmptyString(payload.text)
  if (!text) {
    return null
  }

  const senderSessionId =
    readNonEmptyString(payload.sid) ??
    readNonEmptyString(payload.sessionId) ??
    readNonEmptyString(payload.senderSessionId)
  const senderNickname = senderSessionId
    ? participants.find((participant) => participant.sessionId === senderSessionId)?.nickname
    : undefined

  return {
    id: readNonEmptyString(payload.id) ?? createMessageId(),
    nickname: senderNickname ?? readNonEmptyString(payload.nickname) ?? '알수없음',
    text: text.slice(0, 80),
    tone: resolveTone(payload.tone, payload.sealed),
    senderSessionId,
    mine: senderSessionId !== undefined && senderSessionId === ownSessionId,
    createdAt:
      typeof payload.createdAt === 'number' && Number.isFinite(payload.createdAt)
        ? payload.createdAt
        : Date.now(),
  }
}

export function createLocalGuessMessage(text: string, nickname: string, sessionId: string | null): ChatMessage {
  return {
    id: createMessageId(),
    nickname: nickname || '나',
    text,
    tone: 'guess',
    senderSessionId: sessionId ?? undefined,
    mine: true,
    createdAt: Date.now(),
  }
}

