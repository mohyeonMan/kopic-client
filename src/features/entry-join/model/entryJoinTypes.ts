/**
 * entryJoinTypes
 *
 * 책임:
 * - entry-join feature 내부 form/submit 타입 정의
 *
 * 하지 않는 것:
 * - session store state 재정의
 * - WebSocket/API 타입 노출
 *
 * 의존:
 * - session entity join action code
 *
 * 사용 위치:
 * - useEntryJoinForm
 * - EntryJoinView
 */
import type { JoinActionCode } from '@/entities/session/model/sessionTypes'

export type EntryJoinSubmitPayload = {
  nickname: string
  roomCode?: string
  action: JoinActionCode
}

