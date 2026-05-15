/**
 * GameStageOverlay
 *
 * 책임:
 * - board surface 위의 game/round/turn/word/result overlay 표시
 * - drawer/guesser별 제시어 선택 affordance 제공
 *
 * 하지 않는 것:
 * - WebSocket protocol 처리
 * - game entity state mutation
 * - page-level responsive layout
 */
import type { Participant, RoomSnapshot, TurnSummary } from '@/entities/game/model/gameTypes'
import {
  useGameStageOverlay,
  type StageOverlayPhase,
} from '@/features/game-board/model/useGameStageOverlay'
import './GameStageOverlay.css'

type GameStageOverlayProps = {
  isDrawer: boolean
  onChooseWord: (choiceIndex: number) => void
  room: RoomSnapshot
}

type EarnedScoreRow = {
  participant: Participant
  role: 'drawer' | 'correct' | 'missed'
  score: number
}

function getMaskedAnswer(answerLength?: number, hintPattern?: string | null) {
  if (hintPattern && hintPattern.trim().length > 0) {
    return hintPattern
  }

  return '●'.repeat(answerLength && answerLength > 0 ? answerLength : 3)
}

function resolveDrawerName(room: RoomSnapshot, turn: TurnSummary | null) {
  return (
    room.participants.find((participant) => participant.sessionId === turn?.drawerSessionId)?.nickname ??
    '출제자'
  )
}

function resolveNextDrawerName(room: RoomSnapshot) {
  const round = room.currentRound
  if (!round) {
    return null
  }

  const nextDrawerSessionId = round.drawerOrder[round.turnCursor + 1]
  if (!nextDrawerSessionId) {
    return null
  }

  return room.participants.find((participant) => participant.sessionId === nextDrawerSessionId)?.nickname ?? null
}

function resolveEarnedScores(room: RoomSnapshot, turn: TurnSummary): EarnedScoreRow[] {
  return room.participants
    .map((participant) => {
      const isDrawer = participant.sessionId === turn.drawerSessionId
      const isCorrect = turn.correctSessionIds.includes(participant.sessionId)
      const role: EarnedScoreRow['role'] = isDrawer ? 'drawer' : isCorrect ? 'correct' : 'missed'

      return {
        participant,
        role,
        score: turn.earnedPoints[participant.sessionId] ?? 0,
      }
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      return right.participant.score - left.participant.score
    })
}

function resolveRanking(room: RoomSnapshot) {
  return room.participants.slice().sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score
    }

    return left.joinOrder - right.joinOrder
  })
}

export function GameStageOverlay({ isDrawer, onChooseWord, room }: GameStageOverlayProps) {
  const {
    activeStageOverlay,
    handleStageOverlayTransitionEnd,
    previewMode,
    stageOverlayOpen,
  } = useGameStageOverlay({ room })
  const currentTurn = room.currentTurn
  const drawerName = resolveDrawerName(room, currentTurn)
  const nextDrawerName = resolveNextDrawerName(room)
  const ranking = resolveRanking(room)
  const topScore = ranking[0]?.score
  const winnerCount =
    topScore === undefined ? 0 : ranking.filter((participant) => participant.score === topScore).length
  const overlayClassName = (overlay: StageOverlayPhase, modifier: string) =>
    activeStageOverlay === overlay && stageOverlayOpen
      ? `game-stage-overlay ${modifier} game-stage-overlay--open`
      : `game-stage-overlay ${modifier} game-stage-overlay--closed`

  if (previewMode === 'gameResult') {
    return (
      <div className="game-stage-overlay game-stage-overlay--result game-stage-overlay--open" aria-live="polite">
        <div className="game-stage-overlay__panel">
          <p className="game-stage-overlay__eyebrow">게임 종료</p>
          <strong className="game-stage-overlay__title">
            {winnerCount <= 0
              ? '게임 종료'
              : winnerCount === 1
                ? `${ranking[0].nickname}님 우승`
                : `${winnerCount}명 공동 우승`}
          </strong>
          <ol className="game-stage-overlay__ranking">
            {ranking.slice(0, 5).map((participant, index) => (
              <li key={participant.sessionId}>
                <span>{index + 1}</span>
                <strong>{participant.nickname}</strong>
                <em>{participant.score}점</em>
              </li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  if (room.roomState !== 'RUNNING') {
    return null
  }

  if (activeStageOverlay === 'wordChoice' && currentTurn) {
    return (
      <div
        className={overlayClassName('wordChoice', 'game-stage-overlay--word-choice')}
        aria-live="polite"
        aria-hidden={activeStageOverlay !== 'wordChoice'}
        onTransitionEnd={handleStageOverlayTransitionEnd}
      >
        <div className="game-stage-overlay__panel">
          <p className="game-stage-overlay__eyebrow">제시어 선택</p>
          <strong className="game-stage-overlay__title">
            {isDrawer ? '이번 턴의 제시어를 선택하세요' : `${drawerName}님이 제시어를 선택하고 있습니다`}
          </strong>
          {currentTurn.wordChoices.length > 0 ? (
            <div className="game-stage-overlay__word-actions">
              {currentTurn.wordChoices.map((word, index) => (
                <button
                  key={`${currentTurn.turnId}-stage-choice-${index}`}
                  type="button"
                  disabled={!isDrawer}
                  onClick={() => onChooseWord(index)}
                >
                  {word}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (activeStageOverlay === 'turnEnd' && currentTurn?.phase === 'TURN_END') {
    const earnedScores = resolveEarnedScores(room, currentTurn)

    return (
      <div
        className={overlayClassName('turnEnd', 'game-stage-overlay--turn-end')}
        aria-live="polite"
        aria-hidden={activeStageOverlay !== 'turnEnd'}
        onTransitionEnd={handleStageOverlayTransitionEnd}
      >
        <div className="game-stage-overlay__panel">
          <p className="game-stage-overlay__eyebrow">정답 공개</p>
          <strong className="game-stage-overlay__answer">
            {currentTurn.selectedWord ?? getMaskedAnswer(currentTurn.answerLength)}
          </strong>
          <div className="game-stage-overlay__score-list">
            {earnedScores.map((row, index) => (
              <div
                key={row.participant.sessionId}
                className={`game-stage-overlay__score-row game-stage-overlay__score-row--${row.role}`}
              >
                <span>{index + 1}</span>
                <strong>{row.participant.nickname}</strong>
                <em>{row.role === 'drawer' ? '출제자' : row.role === 'correct' ? '정답' : '미정답'}</em>
                <b>{row.score}점</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (
    activeStageOverlay !== 'gameStart' &&
    activeStageOverlay !== 'roundStart' &&
    activeStageOverlay !== 'turnStart'
  ) {
    return null
  }

  const title =
    activeStageOverlay === 'gameStart'
      ? '게임을 시작합니다'
      : activeStageOverlay === 'roundStart'
        ? `${room.currentRound?.roundNo ?? 1}라운드`
        : `${drawerName}님이 그림을 그립니다`
  const subtitle =
    activeStageOverlay === 'turnStart' && nextDrawerName
      ? `다음은 ${nextDrawerName}님`
      : activeStageOverlay === 'roundStart'
        ? '새 라운드가 시작됩니다'
        : '준비하세요'

  return (
    <div
      className={overlayClassName(activeStageOverlay, 'game-stage-overlay--transient')}
      aria-live="polite"
      aria-hidden={!activeStageOverlay}
      onTransitionEnd={handleStageOverlayTransitionEnd}
    >
      <strong className="game-stage-overlay__transient-title">{title}</strong>
      <span>{subtitle}</span>
    </div>
  )
}
