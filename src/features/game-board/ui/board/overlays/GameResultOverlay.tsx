import type { Participant } from '@/entities/game/model'
import type { OverlayPreview } from '@/features/game-board/model/gameBoardShared'

type GameResultOverlayProps = {
  mySessionId: string
  previewMode: OverlayPreview
  ranking: Participant[]
  returnToLobbyCountdownText: string | null
}

export function GameResultOverlay({
  mySessionId,
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
      <div className="canvas-result-panel turn-end-summary">
        {returnToLobbyCountdownText ? (
          <p className="overlay-seconds-only overlay-seconds-only-result">
            {returnToLobbyCountdownText}
          </p>
        ) : null}
        <div className="overlay-heading result-heading">
          <p className="panel-label">최종 결과</p>
          <strong className="result-title">{gameResultHeadline}</strong>
        </div>
        <div className="earned-score-content turn-end-earned-score-content result-score-content">
          <div className="earned-score-table result-score-table">
            <div className="earned-score-table-head" aria-hidden="true">
              <span className="score-col-rank">순위</span>
              <span className="score-col-name">참여자</span>
              <span className="score-col-points">점수</span>
            </div>
            <div className="earned-score-table-body result-score-table-body">
              {ranking.map((participant, index) => {
                const isWinner = topScore !== null && participant.score === topScore
                const isSelf = participant.sessionId === mySessionId
                const rowClassName = [
                  'earned-score-row',
                  'result-score-row',
                  isWinner ? 'result-score-row-winner' : '',
                  isSelf ? 'result-score-row-self' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <div key={participant.sessionId} className={rowClassName}>
                    <span className="earned-score-rank score-col-rank">{index + 1}</span>
                    <span className="earned-score-name result-score-name score-col-name">
                      <span className="result-score-name-text">{participant.nickname}</span>
                    </span>
                    <strong className="earned-score-points score-col-points">
                      {participant.score} pts
                    </strong>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
