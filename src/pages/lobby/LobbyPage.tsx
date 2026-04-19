import { routes, type AppRoute } from '../../app/router/routes'
import { useAppState } from '../../app/store/useAppState'

type LobbyPageProps = {
  onNavigate: (route: AppRoute) => void
}

const SETTING_OPTIONS = {
  roundCount: [3, 4, 5, 6, 7, 8, 9, 10],
  drawSec: [20, 30, 40, 50, 60],
  wordChoiceSec: [5, 7, 10, 12, 15],
} as const

export function LobbyPage({ onNavigate }: LobbyPageProps) {
  const { state, actions, connection } = useAppState()
  const { settings } = state.room
  const isHost = state.room.hostSessionId === state.session.sessionId

  const applySetting = (key: 'roundCount' | 'drawSec' | 'wordChoiceSec', value: string) => {
    if (!isHost) {
      return
    }

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
            {isHost ? (
              <select
                value={settings.roundCount}
                onChange={(event) => applySetting('roundCount', event.target.value)}
              >
                {SETTING_OPTIONS.roundCount.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{settings.roundCount}</strong>
            )}
          </label>
          <label className="field">
            <span>Draw Sec</span>
            {isHost ? (
              <select
                value={settings.drawSec}
                onChange={(event) => applySetting('drawSec', event.target.value)}
              >
                {SETTING_OPTIONS.drawSec.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{settings.drawSec}</strong>
            )}
          </label>
          <label className="field">
            <span>Choice Sec</span>
            {isHost ? (
              <select
                value={settings.wordChoiceSec}
                onChange={(event) => applySetting('wordChoiceSec', event.target.value)}
              >
                {SETTING_OPTIONS.wordChoiceSec.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{settings.wordChoiceSec}</strong>
            )}
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
