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
import type { ChatMessage, ChatMessageTone, Participant, TurnSummary } from '@/entities/game/model/gameTypes'
import { resolvePrivilegedChatVisibility } from '@/entities/game/model/chatMessages'

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
  currentTurn?: TurnSummary | null
  ownSessionId?: string | null
  participants?: Participant[]
  payload: unknown
}

export function normalizeChatMessage({
  currentTurn = null,
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

  const tone = resolveTone(payload.tone, payload.sealed)

  return {
    id: readNonEmptyString(payload.id) ?? createMessageId(),
    nickname: senderNickname ?? readNonEmptyString(payload.nickname) ?? '알수없음',
    text: text.slice(0, 80),
    tone,
    privilegedVisible:
      typeof payload.privilegedVisible === 'boolean'
        ? payload.privilegedVisible
        : resolvePrivilegedChatVisibility(tone, currentTurn, ownSessionId ?? null, senderSessionId),
    senderSessionId,
    mine: senderSessionId !== undefined && senderSessionId === ownSessionId,
    createdAt:
      typeof payload.createdAt === 'number' && Number.isFinite(payload.createdAt)
        ? payload.createdAt
        : Date.now(),
  }
}

export function createLocalGuessMessage(
  text: string,
  nickname: string,
  sessionId: string | null,
  currentTurn?: TurnSummary | null,
): ChatMessage {
  return {
    id: createMessageId(),
    nickname: nickname || '나',
    text,
    tone: 'guess',
    privilegedVisible: resolvePrivilegedChatVisibility('guess', currentTurn ?? null, sessionId, sessionId ?? undefined),
    senderSessionId: sessionId ?? undefined,
    mine: true,
    createdAt: Date.now(),
  }
}
