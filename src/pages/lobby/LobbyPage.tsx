import { routes, type AppRoute } from '../../app/router/routes'
import { useAppState } from '../../app/store/useAppState'

type LobbyPageProps = {
  onNavigate: (route: AppRoute) => void
}

export function LobbyPage({ onNavigate }: LobbyPageProps) {
  const { state, actions, connection } = useAppState()
  const { settings } = state.room

  const applySetting = (key: 'roundCount' | 'drawSec' | 'wordChoiceSec', value: string) => {
    actions.patchLobbySettings({ [key]: Number(value) })
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lobby</p>
            <h2>Room setup before the first round snapshot</h2>
          </div>
          <div className="pill">{state.room.roomCode}</div>
        </div>

        <div className="lobby-grid">
          <label className="field">
            <span>Round Count</span>
            <input
              type="number"
              min={3}
              max={10}
              value={settings.roundCount}
              onChange={(event) => applySetting('roundCount', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Draw Sec</span>
            <input
              type="number"
              min={20}
              max={60}
              value={settings.drawSec}
              onChange={(event) => applySetting('drawSec', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Choice Sec</span>
            <input
              type="number"
              min={5}
              max={15}
              value={settings.wordChoiceSec}
              onChange={(event) => applySetting('wordChoiceSec', event.target.value)}
            />
          </label>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              actions.requestGameStart()
              onNavigate(routes.game)
            }}
          >
            Start mock game
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => connection.setStatus('reconnecting')}
          >
            Simulate reconnect
          </button>
        </div>

      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Participants</p>
            <h2>Room audience</h2>
          </div>
          <div className="pill">{state.room.participants.length} players</div>
        </div>

        <ul className="participant-list">
          {state.room.participants.map((participant) => (
            <li
              key={participant.sessionId}
              className={participant.sessionId === state.session.sessionId ? 'participant-list-self' : undefined}
            >
              <div>
                <strong>{participant.nickname}</strong>
                <p>
                  {participant.isHost ? 'host' : 'guest'} · join #{participant.joinOrder}
                  {participant.joinedMidRound ? ' · draw from next round' : ''}
                </p>
              </div>
              <span className={participant.isOnline ? 'status-dot status-online' : 'status-dot'}>
                {participant.isOnline ? 'online' : 'offline'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
