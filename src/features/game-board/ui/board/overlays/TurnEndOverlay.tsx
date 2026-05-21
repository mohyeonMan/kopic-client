import type { TransitionEvent as ReactTransitionEvent } from 'react'
import type { TurnSummary } from '@/entities/game/model'
import {
  getMaskedWord,
  type EarnedScore,
  type StageOverlayPhase,
  type TurnEndOverlaySnapshot,
} from '@/features/game-board/model/gameBoardShared'
import { StageOverlayShell } from './StageOverlayShell'

type TurnEndOverlayProps = {
  activeStageOverlay: StageOverlayPhase | null
  currentTurn: TurnSummary | null
  earnedScores: EarnedScore[]
  nextTurnCountdownText: string | null
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  stageOverlayOpen: boolean
  turnEndOverlaySnapshot: TurnEndOverlaySnapshot | null
}

export function TurnEndOverlay({
  activeStageOverlay,
  currentTurn,
  earnedScores,
  nextTurnCountdownText,
  onTransitionEnd,
  stageOverlayOpen,
  turnEndOverlaySnapshot,
}: TurnEndOverlayProps) {
  const rows = turnEndOverlaySnapshot?.earnedScores ?? earnedScores

  return (
    <StageOverlayShell
      activeStageOverlay={activeStageOverlay}
      onTransitionEnd={onTransitionEnd}
      overlay="turnEnd"
      stageOverlayOpen={stageOverlayOpen}
      variantClassName="canvas-full-overlay-turn-end"
    >
      <div className="canvas-full-overlay-panel">
        <div className="turn-end-summary">
          {nextTurnCountdownText ? (
            <p className="overlay-seconds-only overlay-seconds-only-turn-end">
              {nextTurnCountdownText}
            </p>
          ) : null}
          <p className="turn-end-answer">
            <span className="turn-end-answer-prefix">정답은</span>
            <strong className="turn-end-answer-word">
              {turnEndOverlaySnapshot?.answerText ??
                currentTurn?.selectedWord ??
                getMaskedWord(null, 0, currentTurn?.answerLength)}
            </strong>
            <span className="turn-end-answer-suffix">입니다.</span>
          </p>
          <div className="earned-score-content turn-end-earned-score-content">
            <div className="earned-score-table">
              <div className="earned-score-table-head" aria-hidden="true">
                <span className="score-col-rank">순위</span>
                <span className="score-col-name">참여자</span>
                <span className="score-col-result">결과</span>
                <span className="score-col-points">점수</span>
              </div>
              <div className="earned-score-table-body">
                {rows.map((row, index) => (
                  <div
                    key={row.sessionId}
                    className={
                      row.role === 'correct'
                        ? 'earned-score-row earned-score-row-correct'
                        : row.role === 'drawer'
                          ? 'earned-score-row earned-score-row-drawer'
                          : 'earned-score-row'
                    }
                  >
                    <span className="earned-score-rank score-col-rank">{index + 1}</span>
                    <span className="earned-score-name score-col-name">{row.nickname}</span>
                    <span
                      className={
                        row.role === 'correct'
                          ? 'earned-score-role earned-score-role-correct score-col-result'
                          : row.role === 'drawer'
                            ? 'earned-score-role earned-score-role-drawer score-col-result'
                            : 'earned-score-role score-col-result'
                      }
                    >
                      {row.role === 'correct'
                        ? '정답'
                        : row.role === 'drawer'
                          ? '출제자'
                          : '미정답'}
                    </span>
                    <strong className="earned-score-points score-col-points">
                      {row.score} pts
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StageOverlayShell>
  )
}
