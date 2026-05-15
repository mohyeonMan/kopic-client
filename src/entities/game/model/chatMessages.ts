/**
 * chatMessages
 *
 * 책임:
 * - game chat message의 viewer-specific 표시 보정
 * - legacy privileged chat visibility와 local alert message 생성 규칙 제공
 *
 * 하지 않는 것:
 * - store mutation
 * - WebSocket event decoding
 * - chat panel rendering
 */
import type { ChatMessage, Participant, TurnSummary } from '@/entities/game/model/gameTypes'

function createMessageId() {
  return crypto.randomUUID()
}

function isPrivilegedViewerForTurn(currentTurn: TurnSummary | null, ownSessionId: string | null) {
  if (!currentTurn || !ownSessionId) {
    return false
  }

  return (
    currentTurn.drawerSessionId === ownSessionId ||
    currentTurn.correctSessionIds.includes(ownSessionId)
  )
}

function isPrivilegedSenderForTurn(currentTurn: TurnSummary | null, senderSessionId?: string) {
  if (!currentTurn || !senderSessionId) {
    return false
  }

  return (
    currentTurn.drawerSessionId === senderSessionId ||
    currentTurn.correctSessionIds.includes(senderSessionId)
  )
}

export function resolvePrivilegedChatVisibility(
  tone: ChatMessage['tone'],
  currentTurn: TurnSummary | null,
  ownSessionId: string | null,
  senderSessionId?: string,
) {
  if (tone === 'sealed') {
    return true
  }

  return (
    isPrivilegedViewerForTurn(currentTurn, ownSessionId) &&
    isPrivilegedSenderForTurn(currentTurn, senderSessionId)
  )
}

export function resolveChatMessageForViewer(
  message: ChatMessage,
  participants: Participant[],
  currentTurn: TurnSummary | null,
  ownSessionId: string | null,
): ChatMessage {
  const senderNickname = message.senderSessionId
    ? participants.find((participant) => participant.sessionId === message.senderSessionId)?.nickname
    : undefined
  const isMine = Boolean(message.senderSessionId && message.senderSessionId === ownSessionId)

  return {
    ...message,
    nickname: senderNickname ?? message.nickname ?? '알수없음',
    mine: isMine,
    privilegedVisible:
      typeof message.privilegedVisible === 'boolean'
        ? message.privilegedVisible
        : resolvePrivilegedChatVisibility(
            message.tone,
            currentTurn,
            ownSessionId,
            message.senderSessionId,
          ),
  }
}

export function createPresenceMessage(nickname: string, joined: boolean): ChatMessage {
  return {
    id: createMessageId(),
    nickname: '알림',
    text: `${nickname} 님이 ${joined ? '입장' : '퇴장'} 하셨습니다`,
    tone: 'alert',
    createdAt: Date.now(),
  }
}

export function createHostChangedMessage(nickname: string): ChatMessage {
  return {
    id: createMessageId(),
    nickname: '알림',
    text: `${nickname}님이 새로운 방장이 되셨습니다.`,
    tone: 'alert',
    createdAt: Date.now(),
  }
}

export function createCorrectAnswerAlertMessage(nickname: string): ChatMessage {
  return {
    id: createMessageId(),
    nickname: '알림',
    text: `${nickname} 님이 정답을 맞혔습니다.`,
    tone: 'alert-success',
    createdAt: Date.now(),
  }
}
