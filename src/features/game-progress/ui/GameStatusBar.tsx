import './GameStatusBar.css'
import type { RefObject } from 'react'
import type { RoundSummary, TurnSummary } from '@/entities/game/model'
import type { VisibleOrderEntry } from '@/features/game-board/model/gameBoardShared'

type GameStatusBarProps = {
  containerRef?: RefObject<HTMLElement | null>
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  displayedRemainingSec: number
  visibleOrderEntries: VisibleOrderEntry[]
}

export function GameStatusBar({
  containerRef,
  currentRound,
  currentTurn,
  displayedRemainingSec,
  visibleOrderEntries,
}: GameStatusBarProps) {
  const isDrawingPhase = currentTurn?.phase === 'DRAWING'

  return (
    <section ref={containerRef} className="panel game-status-bar">
      <div className="status-bar-row">
        <div className="status-inline-chip status-inline-chip-round">
          <span>라운드</span>
          <strong>{currentRound ? `${currentRound.roundNo} / ${currentRound.totalRounds}` : '-'}</strong>
        </div>
        <div className="status-inline-chip status-inline-chip-time">
          <span>남은 시간</span>
          <strong>{isDrawingPhase ? Math.max(0, displayedRemainingSec) : '-'}</strong>
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
