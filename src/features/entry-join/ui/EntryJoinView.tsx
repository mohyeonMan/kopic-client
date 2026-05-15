/**
 * EntryJoinView
 *
 * 책임:
 * - entry-join feature의 사용자 입력 UI 제공
 * - form hook에서 만든 submit command를 상위 boundary로 전달
 *
 * 하지 않는 것:
 * - WebSocket/API 직접 호출
 * - route navigation
 * - session store 직접 mutation
 *
 * 의존:
 * - entry-join form hook
 * - session error/status type
 *
 * 사용 위치:
 * - EntryPage
 */
import { useEffect } from 'react'
import type { SessionError, SessionStatus } from '@/entities/session/model/sessionTypes'
import { useEntryJoinForm } from '@/features/entry-join/model/useEntryJoinForm'
import type { EntryJoinSubmitPayload } from '@/features/entry-join/model/entryJoinTypes'
import './EntryJoinView.css'

type EntryJoinViewProps = {
  connectionError: SessionError | null
  initialNickname: string
  initialRoomCode: string | null
  joinError: SessionError | null
  status: SessionStatus
  onDismissConnectionError: () => void
  onDismissJoinError: () => void
  onSubmit: (payload: EntryJoinSubmitPayload) => void
}

export function EntryJoinView({
  connectionError,
  initialNickname,
  initialRoomCode,
  joinError,
  status,
  onDismissConnectionError,
  onDismissJoinError,
  onSubmit,
}: EntryJoinViewProps) {
  const form = useEntryJoinForm({
    initialNickname,
    initialRoomCode,
    onSubmit,
  })
  const submitting = status === 'joining'

  useEffect(() => {
    if (!joinError && !connectionError) {
      return
    }

    form.closeJoinDialog()
  }, [connectionError, form, joinError])

  return (
    <section className="entry-join">
      <div className="entry-join__content">
        <div className="entry-join__copy">
          <p className="entry-join__eyebrow">KOPIC</p>
          <h1>그림으로 맞히는 실시간 퀴즈 게임</h1>
          <div className="entry-join__rules">
            <p>닉네임만 입력하면 빠르게 입장할 수 있어요.</p>
            <p>방을 만들고 링크를 공유해 친구들과 함께 플레이할 수 있어요.</p>
            <p>한 사람이 그림을 그리면 다른 플레이어는 채팅으로 정답을 맞혀요.</p>
          </div>
        </div>

        <div className="entry-join__panel" aria-label="입장 정보">
          <label className="entry-join__field">
            <span>닉네임</span>
            <input
              value={form.nickname}
              maxLength={10}
              placeholder="닉네임은 10자 이내"
              onChange={(event) => form.setNickname(event.target.value)}
            />
          </label>

          <div className="entry-join__actions">
            <button
              type="button"
              className="entry-join__primary"
              disabled={!form.nicknameValid || submitting}
              onClick={form.submitQuickJoin}
            >
              {submitting ? '입장 중...' : '빠른 입장'}
            </button>
            <button
              type="button"
              className="entry-join__secondary"
              disabled={!form.nicknameValid || submitting}
              onClick={form.submitCreateRoom}
            >
              방 만들기
            </button>
            <button
              type="button"
              className="entry-join__secondary"
              disabled={submitting}
              onClick={form.openJoinDialog}
            >
              방 참여
            </button>
          </div>
        </div>
      </div>

      {form.joinDialogOpen ? (
        <div className="entry-join__backdrop" role="presentation" onClick={form.closeJoinDialog}>
          <div
            className="entry-join__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="방 참여"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>방 참여</h2>
            <label className="entry-join__field">
              <span>닉네임</span>
              <input
                value={form.dialogNickname}
                maxLength={10}
                placeholder="닉네임은 10자 이내"
                onChange={(event) => form.setDialogNickname(event.target.value)}
              />
            </label>
            <label className="entry-join__field">
              <span>방 코드</span>
              <input
                value={form.dialogRoomCode}
                placeholder="방 코드"
                onChange={(event) => form.setDialogRoomCode(event.target.value)}
              />
            </label>
            <div className="entry-join__dialog-actions">
              <button
                type="button"
                className="entry-join__primary"
                disabled={!form.dialogNicknameValid || !form.dialogRoomCodeValid || submitting}
                onClick={form.submitJoinRoom}
              >
                참가
              </button>
              <button type="button" className="entry-join__secondary" onClick={form.closeJoinDialog}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {joinError ? (
        <EntryJoinErrorDialog title="입장 실패" error={joinError} onDismiss={onDismissJoinError} />
      ) : null}
      {!joinError && connectionError ? (
        <EntryJoinErrorDialog
          title="연결 실패"
          error={connectionError}
          onDismiss={onDismissConnectionError}
        />
      ) : null}
    </section>
  )
}

type EntryJoinErrorDialogProps = {
  title: string
  error: SessionError
  onDismiss: () => void
}

function EntryJoinErrorDialog({ title, error, onDismiss }: EntryJoinErrorDialogProps) {
  return (
    <div className="entry-join__backdrop" role="presentation" onClick={onDismiss}>
      <div
        className="entry-join__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p className="entry-join__error-message">{error.message}</p>
        <p className="entry-join__error-reason">사유: {error.reason}</p>
        <div className="entry-join__dialog-actions">
          <button type="button" className="entry-join__primary" onClick={onDismiss}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
