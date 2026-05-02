import './GameStatusBar.css'
import type { RoundSummary, TurnSummary } from '../../../entities/game/model'
import type { VisibleOrderEntry } from '../gamePageShared'

type GameStatusBarProps = {
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  displayedRemainingSec: number
  visibleOrderEntries: VisibleOrderEntry[]
}

export function GameStatusBar({
  currentRound,
  currentTurn,
  displayedRemainingSec,
  visibleOrderEntries,
}: GameStatusBarProps) {
  return (
    <section className="panel game-status-bar">
      <div className="status-bar-row">
        <div className="status-inline-chip status-inline-chip-round">
          <span>라운드</span>
          <strong>{currentRound ? `${currentRound.roundNo} / ${currentRound.totalRounds}` : '-'}</strong>
        </div>
        <div className="status-inline-chip status-inline-chip-time">
          <span>남은 시간</span>
          <strong>{currentTurn ? `${displayedRemainingSec}s` : '-'}</strong>
        </div>
        <div className="order-strip-box">
          <span className="order-strip-label">이번 라운드 그림 순서</span>
          <div className="order-strip" role="list">
            {visibleOrderEntries.map((entry) => (
              <span key={entry.sessionId} className="order-pill" role="listitem">
                {entry.nickname}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
