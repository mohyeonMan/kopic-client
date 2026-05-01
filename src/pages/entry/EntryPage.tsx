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
        <p className="entry-description">
          {'\uC2E4\uC2DC\uAC04 \uADF8\uB9BC \uD034\uC988 \uAC8C\uC784 KOPIC\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD569\uB2C8\uB2E4. \uB2C9\uB124\uC784\uC744 \uC785\uB825\uD558\uACE0 \uBC14\uB85C \uC785\uC7A5\uD558\uAC70\uB098, \uBC29\uC744 \uB9CC\uB4E4\uC5B4 \uC9C0\uC778\uACFC \uAC19\uC774 \uC2DC\uC791\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
        </p>
        <p className="entry-description entry-description-sub">
          {'\uD55C \uD134\uB9C8\uB2E4 \uCD9C\uC81C\uC790\uAC00 \uB2E8\uC5B4\uB97C \uACE0\uB974\uACE0 \uADF8\uB9BC\uC744 \uADF8\uB9AC\uBA74, \uCC38\uC5EC\uC790\uB4E4\uC740 \uCC44\uD305\uC73C\uB85C \uB2F5\uC744 \uB9DE\uD799\uB2C8\uB2E4. \uBE60\uB974\uAC8C \uB9DE\uCD98 \uD50C\uB808\uC774\uC5B4\uC77C\uC218\uB85D \uB354 \uB192\uC740 \uC810\uC218\uB97C \uC5BB\uC2B5\uB2C8\uB2E4.'}
        </p>
        <p className="entry-description entry-description-sub">
          {'\uB77C\uC6B4\uB4DC\uAC00 \uB05D\uB098\uBA74 \uC810\uC218\uD45C\uAC00 \uBC14\uB85C \uC5C5\uB370\uC774\uD2B8\uB418\uACE0, \uB2E4\uC74C \uD134 \uC21C\uC11C\uC640 \uD604\uC7AC \uACB0\uACFC\uB97C \uD55C\uB208\uC5D0 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
        </p>
        <p className="entry-description entry-description-sub">
          {'\uBC29\uC7A5\uC740 \uAC8C\uC784 \uC124\uC815\uC5D0\uC11C \uB77C\uC6B4\uB4DC \uC218, \uD134 \uC2DC\uAC04, \uB2E8\uC5B4 \uAC1C\uC218 \uB4F1\uC744 \uC870\uC815\uD574 \uC6D0\uD558\uB294 \uC18D\uB3C4\uC640 \uB09C\uC774\uB3C4\uB85C \uC9C4\uD589\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
        </p>

        <label className="field entry-nickname-field">
          <span>{'\uB2C9\uB124\uC784'}</span>
          <input
            value={state.session.nickname}
            onChange={(event) => handleMainNicknameChange(event.target.value)}
            placeholder={'\uB2C9\uB124\uC784\uC740 10\uC790 \uC774\uB0B4\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.'}
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
            {state.session.joinPending ? '\uC785\uC7A5 \uC911...' : '\uBE60\uB978 \uC785\uC7A5'}
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
              {'\uBC29 \uB9CC\uB4E4\uAE30'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={state.session.joinPending}
              onClick={openJoinModal}
            >
              {'\uBC29 \uCC38\uC5EC'}
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
            aria-label="\uBC29 \uCC38\uC5EC"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{'\uBC29 \uCC38\uC5EC'}</h3>
            <label className="field">
              <span>{'\uB2C9\uB124\uC784'}</span>
              <input
                value={joinModalNickname}
                onChange={(event) => handleJoinModalNicknameChange(event.target.value)}
                placeholder={'\uB2C9\uB124\uC784\uC740 10\uC790 \uC774\uB0B4\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.'}
                maxLength={10}
              />
            </label>
            <label className="field">
              <span>{'\uBC29 \uCF54\uB4DC'}</span>
              <input
                value={joinModalRoomCode}
                onChange={(event) => setJoinModalRoomCode(event.target.value)}
                placeholder={'\uBC29 \uCF54\uB4DC'}
              />
            </label>
            <div className="entry-join-modal-actions entry-join-modal-actions-single">
              <button
                type="button"
                className="primary-button"
                disabled={!joinModalNicknameValid || !joinModalRoomCodeValid || state.session.joinPending}
                onClick={submitJoinByRoomCode}
              >
                {'\uCC38\uAC00'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={closeJoinModal}
              >
                {'\uB2EB\uAE30'}
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
