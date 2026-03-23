import { routes, type AppRoute } from '../../app/router/routes'
import { useAppState } from '../../app/store/useAppState'
import { ProtocolPanel } from '../../features/protocol/ProtocolPanel'

type EntryPageProps = {
  onNavigate: (route: AppRoute) => void
}

export function EntryPage({ onNavigate }: EntryPageProps) {
  const { state, updateNickname, setConnectionStatus } = useAppState()

  return (
    <div className="page-grid">
      <section className="panel hero-panel">
        <p className="eyebrow">Phase 1</p>
        <h2>Entry and room bootstrap</h2>
        <p className="hero-copy">
          닉네임과 room 진입 컨텍스트를 먼저 만들고, 이후 HTTP API와 WS handshake를 연결할 수 있도록
          화면 골격을 분리했다.
        </p>

        <label className="field">
          <span>Nickname</span>
          <input
            value={state.session.nickname}
            onChange={(event) => updateNickname(event.target.value)}
            placeholder="Enter nickname"
          />
        </label>

        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => onNavigate(routes.lobby)}>
            Create private room
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setConnectionStatus('connecting')
              onNavigate(routes.lobby)
            }}
          >
            Join by room code
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
          <li>nickname input</li>
          <li>private room create CTA</li>
          <li>room code join CTA</li>
          <li>latest error/connection hint slot</li>
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
              <dd>{routes.lobby}</dd>
            </div>
          </dl>
        </div>
      </section>

      <ProtocolPanel />
    </div>
  )
}
