import { routes, type AppRoute } from '../../app/router/routes'
import { useAppState } from '../../app/store/useAppState'

type ResultPageProps = {
  onNavigate: (route: AppRoute) => void
}

export function ResultPage({ onNavigate }: ResultPageProps) {
  const { state, resetToLobby, setConnectionStatus } = useAppState()
  const ranking = state.room.participants.slice().sort((left, right) => right.score - left.score)
  const winner = ranking[0]

  return (
    <div className="page-grid">
      <section className="panel hero-panel">
        <p className="eyebrow">Result</p>
        <h2>{winner.nickname} wins the round set</h2>
        <p className="hero-copy">
          마지막 round의 마지막 turn이 끝나면 `307 GAME_ENDED`가 나가고, 그 결과 화면을 잠시 보여준 뒤
          private room은 다시 lobby 상태로 돌아간다.
        </p>

        <div className="winner-card">
          <strong>{winner.nickname}</strong>
          <span>{winner.score} pts</span>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              resetToLobby()
              setConnectionStatus('synced')
              onNavigate(routes.game)
            }}
          >
            Back to lobby
          </button>
          <button type="button" className="secondary-button" onClick={() => onNavigate(routes.main)}>
            Exit room
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ranking</p>
            <h2>Final scoreboard</h2>
          </div>
        </div>

        <ul className="score-list">
          {ranking.map((participant, index) => (
            <li key={participant.userId}>
              <span>#{index + 1}</span>
              <strong>{participant.nickname}</strong>
              <span>{participant.score} pts</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
