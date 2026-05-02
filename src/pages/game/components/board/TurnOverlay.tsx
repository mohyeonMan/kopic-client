import './TurnOverlay.css'
import type { TransitionEvent as ReactTransitionEvent } from 'react'
import type {
  Participant,
  RoundSummary,
  RoomState,
  TurnSummary,
} from '../../../../entities/game/model'
import {
  getMaskedWord,
  type EarnedScore,
  type OverlayPreview,
  type StageOverlayPhase,
  type TurnEndOverlaySnapshot,
  type ViewerRole,
} from '../../gamePageShared'

type TurnOverlayProps = {
  activeStageOverlay: StageOverlayPhase | null
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  drawerName: string
  earnedScores: EarnedScore[]
  nextDrawerName: string | null
  onRequestWordChoice: (word: string) => void
  onStageOverlayTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void
  previewMode: OverlayPreview
  ranking: Participant[]
  roomState: RoomState
  stageOverlayOpen: boolean
  turnEndOverlaySnapshot: TurnEndOverlaySnapshot | null
  viewerRole: ViewerRole
}

function renderOverlayState(
  activeStageOverlay: StageOverlayPhase | null,
  stageOverlayOpen: boolean,
  overlay: StageOverlayPhase,
) {
  return activeStageOverlay === overlay && stageOverlayOpen
}

export function TurnOverlay({
  activeStageOverlay,
  currentRound,
  currentTurn,
  drawerName,
  earnedScores,
  nextDrawerName,
  onRequestWordChoice,
  onStageOverlayTransitionEnd,
  previewMode,
  ranking,
  roomState,
  stageOverlayOpen,
  turnEndOverlaySnapshot,
  viewerRole,
}: TurnOverlayProps) {
  return (
    <>
      {roomState === 'RUNNING' ? (
        <div
          className={
            renderOverlayState(activeStageOverlay, stageOverlayOpen, 'gameStart')
              ? 'canvas-full-overlay canvas-full-overlay-open'
              : 'canvas-full-overlay canvas-full-overlay-closed'
          }
          aria-hidden={activeStageOverlay !== 'gameStart'}
          onTransitionEnd={onStageOverlayTransitionEnd}
        >
          <strong>게임을 시작합니다.</strong>
        </div>
      ) : null}

      {roomState === 'RUNNING' ? (
        <div
          className={
            renderOverlayState(activeStageOverlay, stageOverlayOpen, 'roundStart')
              ? 'canvas-full-overlay canvas-full-overlay-open'
              : 'canvas-full-overlay canvas-full-overlay-closed'
          }
          aria-hidden={activeStageOverlay !== 'roundStart'}
          onTransitionEnd={onStageOverlayTransitionEnd}
        >
          <strong>{currentRound ? `${currentRound.roundNo}라운드` : '1라운드'}</strong>
        </div>
      ) : null}

      {roomState === 'RUNNING' && currentTurn ? (
        <div
          className={
            renderOverlayState(activeStageOverlay, stageOverlayOpen, 'wordChoice')
              ? 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-open'
              : 'canvas-overlay-card canvas-overlay-card-word-choice canvas-overlay-card-word-choice-closed'
          }
          aria-hidden={activeStageOverlay !== 'wordChoice'}
          onTransitionEnd={onStageOverlayTransitionEnd}
        >
          <div className="overlay-heading">
            <strong>
              {viewerRole === 'drawer' && currentTurn.wordChoices.length > 0
                ? '제시어를 선택해주세요.'
                : `${drawerName}님이 제시어를 선택중입니다.`}
            </strong>
          </div>
          {currentTurn.wordChoices.length > 0 ? (
            <div
              className={`button-row overlay-actions word-choice-actions word-choice-actions-count-${currentTurn.wordChoices.length}`}
            >
              {currentTurn.wordChoices.map((word) => (
                <button
                  key={word}
                  type="button"
                  className="word-choice-button"
                  onClick={() => onRequestWordChoice(word)}
                >
                  {word}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {roomState === 'RUNNING' ? (
        <div
          className={
            renderOverlayState(activeStageOverlay, stageOverlayOpen, 'turnStart')
              ? 'canvas-full-overlay canvas-full-overlay-open'
              : 'canvas-full-overlay canvas-full-overlay-closed'
          }
          aria-hidden={activeStageOverlay !== 'turnStart'}
          onTransitionEnd={onStageOverlayTransitionEnd}
        >
          <strong>{`${drawerName}님이 그림을 그립니다.`}</strong>
          {nextDrawerName ? <span>{`다음은 ${nextDrawerName}님`}</span> : null}
        </div>
      ) : null}

      {roomState === 'RUNNING' ? (
        <div
          className={
            renderOverlayState(activeStageOverlay, stageOverlayOpen, 'turnEnd')
              ? 'canvas-full-overlay canvas-full-overlay-open canvas-full-overlay-turn-end'
              : 'canvas-full-overlay canvas-full-overlay-closed canvas-full-overlay-turn-end'
          }
          aria-hidden={activeStageOverlay !== 'turnEnd'}
          onTransitionEnd={onStageOverlayTransitionEnd}
        >
          <div className="canvas-full-overlay-panel">
            <div className="turn-end-summary">
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
                    {(turnEndOverlaySnapshot?.earnedScores ?? earnedScores).map((row, index) => (
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
        </div>
      ) : null}

      {previewMode === 'gameResult' ? (
        <div className="canvas-result-screen">
          {ranking.map((participant, index) => (
            <div
              key={participant.sessionId}
              className={index === 0 ? 'result-rank result-rank-winner' : 'result-rank'}
            >
              <strong>{`${index + 1}# ${participant.nickname} ${participant.score} pts`}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
