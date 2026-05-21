import type { Participant } from '../../../../../entities/game/model'
import type { OverlayPreview } from '../../../gamePageShared'

type GameResultOverlayProps = {
  previewMode: OverlayPreview
  ranking: Participant[]
  returnToLobbyCountdownText: string | null
}

export function GameResultOverlay({
  previewMode,
  ranking,
  returnToLobbyCountdownText,
}: GameResultOverlayProps) {
  if (previewMode !== 'gameResult') {
    return null
  }

  const topScore = ranking.length > 0 ? ranking[0].score : null
  const winnerCount =
    topScore === null
      ? 0
      : ranking.filter((participant) => participant.score === topScore).length
  const gameResultHeadline =
    ranking.length === 0
      ? '게임 종료'
      : winnerCount <= 1
        ? `${ranking[0].nickname}님 우승!`
        : `${winnerCount}명 공동 우승!`

  return (
    <div className="canvas-result-screen">
      {returnToLobbyCountdownText ? (
        <p className="overlay-seconds-only overlay-seconds-only-result">
          {returnToLobbyCountdownText}
        </p>
      ) : null}
      <div className="canvas-result-panel">
        <div className="overlay-heading result-heading">
          <p className="panel-label">게임 종료</p>
          <strong className="result-title">{gameResultHeadline}</strong>
        </div>
        <ol className="result-ranking-list">
          {ranking.map((participant, index) => (
            <li
              key={participant.sessionId}
              className={
                index === 0
                  ? 'result-ranking-item result-ranking-item-winner'
                  : 'result-ranking-item'
              }
            >
              <span className="result-rank-badge">{index + 1}</span>
              <span className="result-rank-name">{participant.nickname}</span>
              <strong className="result-rank-score">{participant.score} pts</strong>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
