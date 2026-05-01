import { useEffect, useState } from 'react'
import { readInviteRoomCode, routes, type AppRoute } from '../../app/router/routes'
import { useAppState } from '../../app/store/useAppState'

type EntryPageProps = {
  onNavigate: (route: AppRoute) => void
}

export function EntryPage({ onNavigate }: EntryPageProps) {
  const { state, actions } = useAppState()
  const inviteRoomCodeFromPath = readInviteRoomCode(window.location.pathname)
  const inviteRoomCodeFromSearch =
    new URLSearchParams(window.location.search).get('roomCode')?.trim() ?? null
  const inviteRoomCode =
    inviteRoomCodeFromPath && inviteRoomCodeFromPath.length > 0
      ? inviteRoomCodeFromPath
      : inviteRoomCodeFromSearch && inviteRoomCodeFromSearch.length > 0
        ? inviteRoomCodeFromSearch
        : null
  const nicknameLength = state.session.nickname.trim().length
  const nicknameValid = nicknameLength >= 1 && nicknameLength <= 10
  const joinError = state.session.joinError
  const connectionError = state.session.connectionError
  const [joinModalOpen, setJoinModalOpen] = useState(() => inviteRoomCode !== null)
  const [joinModalNickname, setJoinModalNickname] = useState(state.session.nickname)
  const [joinModalRoomCode, setJoinModalRoomCode] = useState(inviteRoomCode ?? '')
  const joinModalNicknameLength = joinModalNickname.trim().length
  const joinModalNicknameValid = joinModalNicknameLength >= 1 && joinModalNicknameLength <= 10
  const joinModalRoomCodeValid = joinModalRoomCode.trim().length > 0

  const openJoinModal = () => {
    setJoinModalNickname(state.session.nickname)
    setJoinModalRoomCode(inviteRoomCode ?? '')
    setJoinModalOpen(true)
  }

  const closeJoinModal = () => {
    setJoinModalOpen(false)
  }

  const submitJoinByRoomCode = () => {
    const nextNickname = joinModalNickname.trim()
    const nextRoomCode = joinModalRoomCode.trim()
    if (nextNickname.length < 1 || nextNickname.length > 10 || nextRoomCode.length === 0 || state.session.joinPending) {
      return
    }

    actions.updateNickname(nextNickname)
    actions.requestJoin({ roomCode: nextRoomCode, action: 0 })
    setJoinModalOpen(false)
  }

  const handleMainNicknameChange = (value: string) => {
    actions.updateNickname(value.slice(0, 10))
  }

  const handleJoinModalNicknameChange = (value: string) => {
    setJoinModalNickname(value.slice(0, 10))
  }

  useEffect(() => {
    if (!state.session.joinAccepted) {
      return
    }

    onNavigate(routes.game)
  }, [onNavigate, state.session.joinAccepted])

  useEffect(() => {
    if (!joinError && !connectionError) {
      return
    }

    setJoinModalOpen(false)
  }, [connectionError, joinError])

  return (
    <div className="page-grid entry-grid">
      <section className="entry-main-panel">
        <h1 className="entry-logo">KOPIC</h1>
        <p className="entry-tagline">
          {'그림으로 맞히는 실시간 퀴즈 게임'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 닉네임만 입력하면 바로 시작할 수 있어요.'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 방을 만들고 링크를 공유해서 친구들과 함께 즐길 수 있어요.'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 한 사람이 그림을 그리면, 다른 플레이어는 채팅으로 정답을 맞혀요.'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 먼저 맞힐수록 더 높은 점수를 얻을 수 있어요.'}
        </p>
        <p className="entry-tagline entry-rule-label">{'게임 규칙'}</p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 닉네임과 채팅에는 욕설, 비하 표현, 성적인 표현을 쓰지 말아주세요.'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 모두가 함께 즐길 수 있도록 도배나 분위기를 해치는 행동은 삼가주세요.'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 정답자가 없으면 출제자도 점수를 얻을 수 없어요. 최선을 다해 그려주세요.'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 너무 직접적인 힌트는 게임의 재미를 떨어뜨릴 수 있어요.'}
        </p>
        <p className="entry-description entry-description-sub entry-description-dash">
          {'- 정답을 맞힌 뒤 보낸 채팅은 정답자와 출제자에게만 전달돼요.'}
        </p>

        <label className="field entry-nickname-field">
          <span>{'닉네임'}</span>
          <input
            value={state.session.nickname}
            onChange={(event) => handleMainNicknameChange(event.target.value)}
            placeholder={'닉네임은 10자 이내로 입력해주세요.'}
            maxLength={10}
          />
        </label>

        <div className="button-row entry-actions">
          <button
            type="button"
            className="primary-button entry-action-quick"
            disabled={!nicknameValid || state.session.joinPending}
            onClick={() => {
              actions.requestJoin({ action: 0 })
            }}
          >
            {state.session.joinPending ? '입장 중...' : '빠른 입장'}
          </button>
          <div className="entry-actions-secondary">
            <button
              type="button"
              className="secondary-button"
              disabled={!nicknameValid || state.session.joinPending}
              onClick={() => {
                actions.requestJoin({ action: 1 })
              }}
            >
              {'방 만들기'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={state.session.joinPending}
              onClick={openJoinModal}
            >
              {'방 참여'}
            </button>
          </div>
        </div>
      </section>

      {joinModalOpen ? (
        <div
          className="entry-join-modal-backdrop"
          role="presentation"
          onClick={closeJoinModal}
        >
          <div
            className="entry-join-modal"
            role="dialog"
            aria-modal="true"
            aria-label="방 참여"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{'방 참여'}</h3>
            <label className="field">
              <span>{'닉네임'}</span>
              <input
                value={joinModalNickname}
                onChange={(event) => handleJoinModalNicknameChange(event.target.value)}
                placeholder={'닉네임은 10자 이내로 입력해주세요.'}
                maxLength={10}
              />
            </label>
            <label className="field">
              <span>{'방 코드'}</span>
              <input
                value={joinModalRoomCode}
                onChange={(event) => setJoinModalRoomCode(event.target.value)}
                placeholder={'방 코드'}
              />
            </label>
            <div className="entry-join-modal-actions entry-join-modal-actions-single">
              <button
                type="button"
                className="primary-button"
                disabled={!joinModalNicknameValid || !joinModalRoomCodeValid || state.session.joinPending}
                onClick={submitJoinByRoomCode}
              >
                {'참가'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={closeJoinModal}
              >
                {'닫기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {joinError ? (
        <div
          className="entry-join-modal-backdrop"
          role="presentation"
          onClick={() => actions.dismissJoinError()}
        >
          <div
            className="entry-join-modal entry-error-modal"
            role="dialog"
            aria-modal="true"
            aria-label="입장 실패"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{'입장 실패'}</h3>
            <p className="entry-error-message">{joinError.message}</p>
            <p className="entry-error-reason">{`사유: ${joinError.reason}`}</p>
            <div className="entry-join-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => actions.dismissJoinError()}
              >
                {'확인'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!joinError && connectionError ? (
        <div
          className="entry-join-modal-backdrop"
          role="presentation"
          onClick={() => actions.dismissConnectionError()}
        >
          <div
            className="entry-join-modal entry-error-modal"
            role="dialog"
            aria-modal="true"
            aria-label="연결 실패"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{'연결 실패'}</h3>
            <p className="entry-error-message">{connectionError.message}</p>
            <p className="entry-error-reason">{`사유: ${connectionError.reason}`}</p>
            <div className="entry-join-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => actions.dismissConnectionError()}
              >
                {'확인'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
