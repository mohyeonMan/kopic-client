import { useEffect } from 'react'
import { routes, type AppRoute } from '../../app/router/routes'
import { useAppState } from '../../app/store/useAppState'

type EntryPageProps = {
  onNavigate: (route: AppRoute) => void
}

export function EntryPage({ onNavigate }: EntryPageProps) {
  const { state, actions } = useAppState()
  const nicknameValid = state.session.nickname.trim().length >= 2

  useEffect(() => {
    if (!state.session.joinAccepted) {
      return
    }

    onNavigate(routes.game)
  }, [onNavigate, state.session.joinAccepted])

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
            onChange={(event) => actions.updateNickname(event.target.value)}
            placeholder={'\uB2C9\uB124\uC784 \uC785\uB825'}
          />
        </label>

        <div className="button-row entry-actions">
          <button
            type="button"
            className="primary-button"
            disabled={!nicknameValid || state.session.joinPending}
            onClick={() => {
              actions.requestJoin()
            }}
          >
            {state.session.joinPending ? '\uC785\uC7A5 \uC911...' : '\uBE60\uB978 \uC785\uC7A5'}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!nicknameValid || state.session.joinPending}
            onClick={() => {
              actions.requestJoin()
            }}
          >
            {'\uBC29 \uB9CC\uB4E4\uAE30'}
          </button>
        </div>
      </section>

    </div>
  )
}
