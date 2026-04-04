import { routes, type AppRoute } from '../../app/router/routes'
import { useAppState } from '../../app/store/useAppState'
import { ProtocolPanel } from '../../features/protocol/ProtocolPanel'

type EntryPageProps = {
  onNavigate: (route: AppRoute) => void
}

export function EntryPage({ onNavigate }: EntryPageProps) {
  const { state, updateNickname, setConnectionStatus } = useAppState()
  const nicknameValid = state.session.nickname.trim().length >= 2

  return (
    <div className="page-grid">
      <section className="panel hero-panel">
        <p className="eyebrow">Main Page</p>
        <h2>Enter the room flow</h2>
        <p className="hero-copy">
          캐주얼한 스케치를 바로 시작할 수 있게 진입 결정을 단순하게 유지한다. 닉네임을 먼저 잡고
          무작위 매칭 또는 private room 생성 중 하나를 선택한다.
        </p>

        <label className="field">
          <span>Nickname</span>
          <input
            value={state.session.nickname}
            onChange={(event) => updateNickname(event.target.value)}
            placeholder="Enter nickname"
          />
        </label>
        <p className="info-copy">
          닉네임은 2자 이상으로 가정한다. 요청/에러/로딩 처리만 붙이면 그대로 실제 진입 버튼으로 전환 가능하다.
        </p>

        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            disabled={!nicknameValid}
            onClick={() => {
              setConnectionStatus('connecting')
              onNavigate(routes.game)
            }}
          >
            Random matching
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!nicknameValid}
            onClick={() => {
              setConnectionStatus('synced')
              onNavigate(routes.game)
            }}
          >
            Create private room
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Session</p>
            <h2>Entry requirements</h2>
          </div>
          <div className="pill">{state.room.roomId}</div>
        </div>

        <ul className="check-list">
          <li>nickname validation gate</li>
          <li>random matching CTA</li>
          <li>private room create CTA</li>
          <li>request error / loading slot</li>
        </ul>

        <div className="status-card">
          <p className="panel-label">Room bootstrap snapshot</p>
          <dl className="meta-grid">
            <div>
              <dt>User ID</dt>
              <dd>{state.session.userId}</dd>
            </div>
            <div>
              <dt>Room Code</dt>
              <dd>{state.room.roomCode}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>{state.connectionStatus}</dd>
            </div>
            <div>
              <dt>Next Route</dt>
              <dd>{routes.game}</dd>
            </div>
          </dl>
        </div>
      </section>

      <ProtocolPanel />
    </div>
  )
}
