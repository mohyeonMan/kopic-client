/**
 * GameStatusStrip
 *
 * 책임:
 * - 현재 라운드/턴/남은 시간/그림 순서를 표시
 * - game progress presentation만 담당
 *
 * 하지 않는 것:
 * - game lifecycle state 변경
 * - drawing/chat command 실행
 * - room lobby 설정 UI 표시
 *
 * 의존:
 * - game entity room snapshot
 * - useTurnCountdown UI hook
 *
 * 사용 위치:
 * - GamePage
 */
import type { RoomSnapshot } from '@/entities/game/model/gameTypes'
import { useTurnCountdown } from '@/features/game-progress/model/useTurnCountdown'
import './GameStatusStrip.css'

type GameStatusStripProps = {
  room: RoomSnapshot
}

const phaseLabels = {
  READY: '턴 준비',
  WORD_CHOICE: '제시어 선택',
  DRAWING: '그리기',
  TURN_END: '정답 공개',
} as const

export function GameStatusStrip({ room }: GameStatusStripProps) {
  const currentTurn = room.currentTurn
  const remainingSec = useTurnCountdown(currentTurn?.deadlineAtMs, currentTurn?.remainingSec ?? 0)
  const orderEntries =
    room.currentRound?.drawerOrder
      .map((sessionId) => room.participants.find((participant) => participant.sessionId === sessionId))
      .filter((participant) => participant !== undefined) ?? []

  return (
    <section className="game-status-strip" aria-label="게임 진행 상태">
      <div className="game-status-strip__chip">
        <span>상태</span>
        <strong>
          {currentTurn
            ? phaseLabels[currentTurn.phase]
            : room.roomState === 'RESULT'
              ? '결과'
              : '대기'}
        </strong>
      </div>
      <div className="game-status-strip__chip">
        <span>라운드</span>
        <strong>
          {room.currentRound
            ? `${room.currentRound.roundNo} / ${room.currentRound.totalRounds}`
            : '-'}
        </strong>
      </div>
      <div className="game-status-strip__chip">
        <span>남은 시간</span>
        <strong>{currentTurn ? remainingSec : '-'}</strong>
      </div>
      <div className="game-status-strip__order">
        <span>그림 순서</span>
        <div role="list">
          {orderEntries.length > 0 ? (
            orderEntries.map((participant) => (
              <strong key={participant.sessionId} role="listitem">
                {participant.nickname}
              </strong>
            ))
          ) : (
            <strong>-</strong>
          )}
        </div>
      </div>
    </section>
  )
}
