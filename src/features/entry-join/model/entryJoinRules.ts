/**
 * entryJoinRules
 *
 * 책임:
 * - entry-join feature의 입력 normalization과 validation 규칙 제공
 *
 * 하지 않는 것:
 * - React state 관리
 * - API 호출
 * - session store 변경
 *
 * 의존:
 * - 없음
 *
 * 사용 위치:
 * - useEntryJoinForm
 */
export const NICKNAME_MAX_LENGTH = 10

export function normalizeNickname(value: string) {
  return value.slice(0, NICKNAME_MAX_LENGTH)
}

export function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase()
}

export function isNicknameValid(value: string) {
  const length = value.trim().length
  return length >= 1 && length <= NICKNAME_MAX_LENGTH
}

export function isRoomCodeValid(value: string) {
  return normalizeRoomCode(value).length > 0
}

