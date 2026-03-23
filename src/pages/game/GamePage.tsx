import { useState } from 'react'
import { routes, type AppRoute } from '../../app/router/routes'
import type { DrawingTool } from '../../app/store/mockAppState'
import { useAppState } from '../../app/store/useAppState'
import { CanvasBoard } from '../../features/game-canvas/CanvasBoard'

type GamePageProps = {
  onNavigate: (route: AppRoute) => void
}

const TOOL_COLOR: Record<DrawingTool, string> = {
  PEN: '#203247',
  ERASER: '#fffaf0',
}

export function GamePage({ onNavigate }: GamePageProps) {
  const [tool, setTool] = useState<DrawingTool>('PEN')
  const [size, setSize] = useState(6)
  const {
    state,
    chooseMockWord,
    appendStroke,
    clearCanvas,
    finishGame,
    setConnectionStatus,
  } = useAppState()
  const { participants, currentRound, currentTurn, chat } = state.room
  const drawer = participants.find((participant) => participant.userId === currentTurn?.drawerUserId)
  const drawerOrderParticipants = currentRound
    ? currentRound.drawerOrder
        .map((userId) => participants.find((participant) => participant.userId === userId))
        .filter((participant): participant is NonNullable<typeof participant> => participant !== undefined)
    : []
  const isDrawer = state.session.userId === currentTurn?.drawerUserId
  const canDraw = isDrawer && currentTurn?.phase === 'DRAWING'

  return (
    <div className="game-layout">
      <section className="panel board-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Game</p>
            <h2>Round and turn driven play surface</h2>
          </div>
          {currentTurn ? <div className="pill">R{currentTurn.roundNo} T{currentTurn.turnNo}</div> : null}
        </div>

        <div className="board-stage">
          <div className="board-hud">
            <span>{drawer?.nickname ?? 'Drawer TBD'}</span>
            <strong>{currentTurn?.phase ?? 'WAITING'}</strong>
            <span>{currentTurn?.remainingSec ?? 0}s</span>
          </div>
          <div className="turn-rail">
            <div>
              <p className="panel-label">Current round</p>
              <strong>
                Round {currentRound?.roundNo ?? 0} / {currentRound?.totalRounds ?? 0}
              </strong>
            </div>
            <div>
              <p className="panel-label">Turn cursor</p>
              <strong>
                {(currentRound?.turnCursor ?? 0) + 1} / {currentRound?.drawerOrder.length ?? 0}
              </strong>
            </div>
            <div>
              <p className="panel-label">Drawer order</p>
              <strong>{drawerOrderParticipants.map((participant) => participant.nickname).join(' -> ')}</strong>
            </div>
          </div>

          {isDrawer && currentTurn?.phase === 'WORD_CHOICE' ? (
            <div className="word-choice-panel">
              <p className="panel-label">Word choice</p>
              <p className="info-copy">drawer만 단어를 고를 수 있고, 선택 후에만 실제 드로잉이 열린다.</p>
              <div className="button-row">
                {currentTurn.wordChoices.map((word) => (
                  <button
                    key={word}
                    type="button"
                    className="secondary-button"
                    onClick={() => chooseMockWord(word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="board-canvas">
            <div className="grid-overlay" />
            <CanvasBoard
              strokes={currentTurn?.canvasStrokes ?? []}
              canDraw={canDraw}
              tool={tool}
              color={TOOL_COLOR[tool]}
              size={size}
              onCommitStroke={appendStroke}
            />
            {!canDraw ? (
              <div className="canvas-overlay">
                {currentTurn?.phase === 'WORD_CHOICE'
                  ? 'drawer word choice 대기 중'
                  : '현재 turn drawer만 그림을 그릴 수 있음'}
              </div>
            ) : null}
          </div>

          <div className="toolbar-row">
            <button
              type="button"
              className={tool === 'PEN' ? 'primary-button' : 'secondary-button'}
              onClick={() => setTool('PEN')}
            >
              Pen
            </button>
            <button
              type="button"
              className={tool === 'ERASER' ? 'primary-button' : 'secondary-button'}
              onClick={() => setTool('ERASER')}
            >
              Eraser
            </button>
            <label className="size-control">
              <span>Size {size}</span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              />
            </label>
            <button type="button" className="secondary-button" onClick={clearCanvas}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <aside className="side-stack">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Turn Model</p>
              <h2>All players draw once per round</h2>
            </div>
          </div>

          <ul className="turn-order-list">
            {drawerOrderParticipants.map((participant, index) => (
              <li
                key={participant.userId}
                className={participant.userId === currentTurn?.drawerUserId ? 'turn-order-active' : ''}
              >
                <span>Turn {index + 1}</span>
                <strong>{participant.nickname}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Scoreboard</p>
              <h2>Live ranking</h2>
            </div>
          </div>

          <ul className="score-list">
            {participants
              .slice()
              .sort((left, right) => right.score - left.score)
              .map((participant, index) => (
                <li key={participant.userId}>
                  <span>#{index + 1}</span>
                  <strong>{participant.nickname}</strong>
                  <span>{participant.score} pts</span>
                </li>
              ))}
          </ul>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Guess Feed</p>
              <h2>Chat, correct guesses, and answer hiding</h2>
            </div>
          </div>

          <ul className="chat-list">
            {chat.map((message) => (
              <li key={message.id} className={`chat-${message.tone}`}>
                <strong>{message.nickname}</strong>
                <span>{message.text}</span>
              </li>
            ))}
          </ul>

          <label className="field">
            <span>Guess input for current turn</span>
            <input placeholder={`Submit guess for ${currentTurn?.turnId ?? 'turn'}...`} />
          </label>

          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                finishGame()
                onNavigate(routes.result)
              }}
            >
              Finish mock game
            </button>
            <button type="button" className="secondary-button" onClick={() => setConnectionStatus('reconnecting')}>
              Snapshot recovery
            </button>
          </div>
        </section>
      </aside>
    </div>
  )
}
