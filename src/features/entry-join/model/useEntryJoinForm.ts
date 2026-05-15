/**
 * useEntryJoinForm
 *
 * 책임:
 * - entry join form UI 상태 소유
 * - nickname/roomCode validation orchestration
 * - submit payload 생성
 *
 * 하지 않는 것:
 * - API 직접 호출
 * - session 전역 상태 변경
 * - navigation 처리
 *
 * side effect:
 * - 없음
 */
import { useState } from 'react'
import type { EntryJoinSubmitPayload } from '@/features/entry-join/model/entryJoinTypes'
import {
  isNicknameValid,
  isRoomCodeValid,
  normalizeNickname,
  normalizeRoomCode,
} from '@/features/entry-join/model/entryJoinRules'

type UseEntryJoinFormArgs = {
  initialNickname: string
  initialRoomCode: string | null
  onSubmit: (payload: EntryJoinSubmitPayload) => void
}

export function useEntryJoinForm({
  initialNickname,
  initialRoomCode,
  onSubmit,
}: UseEntryJoinFormArgs) {
  const [nickname, setNickname] = useState(() => normalizeNickname(initialNickname))
  const [joinDialogOpen, setJoinDialogOpen] = useState(() => initialRoomCode !== null)
  const [dialogNickname, setDialogNickname] = useState(() => normalizeNickname(initialNickname))
  const [dialogRoomCode, setDialogRoomCode] = useState(() => normalizeRoomCode(initialRoomCode ?? ''))
  const nicknameValid = isNicknameValid(nickname)
  const dialogNicknameValid = isNicknameValid(dialogNickname)
  const dialogRoomCodeValid = isRoomCodeValid(dialogRoomCode)

  const openJoinDialog = () => {
    setDialogNickname(normalizeNickname(nickname))
    setDialogRoomCode(normalizeRoomCode(initialRoomCode ?? ''))
    setJoinDialogOpen(true)
  }

  const submitQuickJoin = () => {
    if (!nicknameValid) {
      return
    }

    onSubmit({
      nickname: nickname.trim(),
      action: 0,
    })
  }

  const submitCreateRoom = () => {
    if (!nicknameValid) {
      return
    }

    onSubmit({
      nickname: nickname.trim(),
      action: 1,
    })
  }

  const submitJoinRoom = () => {
    if (!dialogNicknameValid || !dialogRoomCodeValid) {
      return
    }

    onSubmit({
      nickname: dialogNickname.trim(),
      roomCode: normalizeRoomCode(dialogRoomCode),
      action: 0,
    })
    setJoinDialogOpen(false)
  }

  return {
    dialogNickname,
    dialogNicknameValid,
    dialogRoomCode,
    dialogRoomCodeValid,
    joinDialogOpen,
    nickname,
    nicknameValid,
    closeJoinDialog: () => setJoinDialogOpen(false),
    openJoinDialog,
    setDialogNickname: (value: string) => setDialogNickname(normalizeNickname(value)),
    setDialogRoomCode: (value: string) => setDialogRoomCode(normalizeRoomCode(value)),
    setNickname: (value: string) => setNickname(normalizeNickname(value)),
    submitCreateRoom,
    submitJoinRoom,
    submitQuickJoin,
  }
}

