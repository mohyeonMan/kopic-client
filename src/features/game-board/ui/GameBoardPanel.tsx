/**
 * GameBoardPanel
 *
 * 책임:
 * - room canvas strokes와 board controls를 조립
 * - drawing-canvas feature에 drawing 가능한 상태와 command를 전달
 *
 * 하지 않는 것:
 * - WebSocket protocol encode/decode
 * - room/session store 직접 mutation 규칙 소유
 * - chat/participant panel 구현
 *
 * 의존:
 * - game entity room state
 * - drawing-canvas feature
 * - game-board control hook
 *
 * 사용 위치:
 * - GamePage
 */
import type { RoomSnapshot } from '@/entities/game/model/gameTypes'
import { DrawingCanvas } from '@/features/drawing-canvas/ui/DrawingCanvas'
import { BOARD_COLORS, BOARD_TOOLS } from '@/features/game-board/model/boardToolOptions'
import { useGameBoardControls } from '@/features/game-board/model/useGameBoardControls'
import { gameSessionCommands } from '@/features/game-session/model/gameSessionCommandGateway'
import './GameBoardPanel.css'

type GameBoardPanelProps = {
  mySessionId: string | null
  room: RoomSnapshot
}

const toolLabels = {
  PEN: '펜',
  ERASER: '지우개',
  FILL: '채우기',
} as const

const phaseLabels = {
  READY: '턴 준비',
  WORD_CHOICE: '제시어 선택',
  DRAWING: '그리기',
  TURN_END: '턴 종료',
} as const

function getMaskedAnswer(answerLength?: number, hintPattern?: string | null) {
  if (hintPattern && hintPattern.trim().length > 0) {
    return hintPattern
  }

  return '●'.repeat(answerLength && answerLength > 0 ? answerLength : 3)
}

export function GameBoardPanel({ mySessionId, room }: GameBoardPanelProps) {
  const currentTurn = room.currentTurn
  const drawer = room.participants.find(
    (participant) => participant.sessionId === currentTurn?.drawerSessionId,
  )
  const isDrawer = Boolean(currentTurn && currentTurn.drawerSessionId === mySessionId)
  const isRunningTurn = room.roomState === 'RUNNING' && currentTurn !== null
  const canDraw =
    room.roomState === 'LOBBY' ||
    (currentTurn?.phase === 'DRAWING' && currentTurn.drawerSessionId === mySessionId)
  const controls = useGameBoardControls({ canDraw })
  const activeStrokes = isRunningTurn ? currentTurn.canvasStrokes : room.lobbyCanvasStrokes
  const boardTitle =
    room.roomState === 'LOBBY'
      ? '대기실 그림판'
      : room.roomState === 'RESULT'
        ? '게임 결과'
        : `${drawer?.nickname ?? '출제자'}님의 턴`
  const boardEyebrow =
    room.roomState === 'LOBBY'
      ? 'LOBBY CANVAS'
      : room.currentRound
        ? `ROUND ${room.currentRound.roundNo} / ${room.currentRound.totalRounds}`
        : 'GAME BOARD'
  const statusText =
    currentTurn !== null
      ? phaseLabels[currentTurn.phase]
      : room.roomState === 'RESULT'
        ? '결과 확인'
        : '대기 중'

  return (
    <section className="game-board-panel">
      <header className="game-board-panel__header">
        <div>
          <p className="game-board-panel__eyebrow">{boardEyebrow}</p>
          <h2>{boardTitle}</h2>
          <p className="game-board-panel__status">{statusText}</p>
        </div>
        <button
          type="button"
          className="game-board-panel__clear"
          disabled={!controls.canDraw || activeStrokes.length === 0}
          onClick={controls.clearCanvas}
        >
          지우기
        </button>
      </header>

      {currentTurn?.phase === 'WORD_CHOICE' ? (
        <div className="game-board-panel__choice" aria-live="polite">
          <p>
            {isDrawer
              ? '이번 턴의 제시어를 선택하세요.'
              : `${drawer?.nickname ?? '출제자'}님이 제시어를 선택하고 있습니다.`}
          </p>
          {currentTurn.wordChoices.length > 0 ? (
            <div className="game-board-panel__choice-actions">
              {currentTurn.wordChoices.map((word, index) => (
                <button
                  key={`${currentTurn.turnId}-${word}-${index}`}
                  type="button"
                  disabled={!isDrawer}
                  onClick={() => gameSessionCommands.sendWordChoice(index)}
                >
                  {word}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {currentTurn?.phase === 'DRAWING' ? (
        <div className="game-board-panel__turn-info">
          {isDrawer ? (
            <span>제시어: {currentTurn.selectedWord ?? '선택한 단어'}</span>
          ) : (
            <span>정답: {getMaskedAnswer(currentTurn.answerLength, currentTurn.hintPattern)}</span>
          )}
        </div>
      ) : null}

      {currentTurn?.phase === 'TURN_END' ? (
        <div className="game-board-panel__turn-info">
          <span>정답: {currentTurn.selectedWord ?? '공개 대기 중'}</span>
        </div>
      ) : null}

      <div className="game-board-panel__surface" aria-label="게임 그림판">
        <DrawingCanvas
          activeColor={controls.activeColor}
          canDraw={controls.canDraw}
          onCommitStroke={controls.commitStroke}
          onSendStrokeChunk={controls.sendStrokeChunk}
          size={controls.size}
          strokes={activeStrokes}
          tool={controls.tool}
        />
      </div>

      <div className="game-board-panel__toolbar" aria-label="그림 도구">
        <div className="game-board-panel__tools">
          {BOARD_TOOLS.map((tool) => (
            <button
              key={tool}
              type="button"
              className={
                controls.tool === tool
                  ? 'game-board-panel__tool game-board-panel__tool--active'
                  : 'game-board-panel__tool'
              }
              disabled={!controls.canDraw}
              onClick={() => controls.setTool(tool)}
            >
              {toolLabels[tool]}
            </button>
          ))}
        </div>

        <label className="game-board-panel__size">
          <span>굵기</span>
          <input
            max={28}
            min={4}
            type="range"
            value={controls.size}
            disabled={!controls.canDraw}
            onChange={(event) => controls.setSize(Number(event.target.value))}
          />
        </label>

        <div className="game-board-panel__colors" aria-label="색상">
          {BOARD_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={
                controls.activeColor === color
                  ? 'game-board-panel__color game-board-panel__color--active'
                  : 'game-board-panel__color'
              }
              style={{ backgroundColor: color }}
              disabled={!controls.canDraw}
              aria-label={`색상 ${color}`}
              onClick={() => controls.selectColor(color)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
