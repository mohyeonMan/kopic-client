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
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { RoomSnapshot } from '@/entities/game/model/gameTypes'
import { DrawingCanvas } from '@/features/drawing-canvas/ui/DrawingCanvas'
import { BOARD_COLORS, BOARD_TOOLS } from '@/features/game-board/model/boardToolOptions'
import { useGameBoardControls } from '@/features/game-board/model/useGameBoardControls'
import { GameStageOverlay } from '@/features/game-board/ui/GameStageOverlay'
import { gameSessionCommands } from '@/features/game-session/model/gameSessionCommandGateway'
import { useTurnCountdown } from '@/features/game-progress/model/useTurnCountdown'
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

function getMaskedWord(word: string | null, revealedCount: number, answerLength?: number) {
  if (!word) {
    return '●'.repeat(answerLength && answerLength > 0 ? answerLength : 3)
  }

  const chars = Array.from(word)
  const visibleCount = Math.max(0, Math.min(chars.length, revealedCount))
  let revealed = 0

  return chars
    .map((char) => {
      if (char === ' ') {
        return ' '
      }

      if (revealed < visibleCount) {
        revealed += 1
        return char
      }

      return '●'
    })
    .join('')
}

export function GameBoardPanel({ mySessionId, room }: GameBoardPanelProps) {
  const currentTurn = room.currentTurn
  const descriptionAnchorRef = useRef<HTMLDivElement | null>(null)
  const [openedDescriptionKey, setOpenedDescriptionKey] = useState<string | null>(null)
  const [descriptionBubbleBounds, setDescriptionBubbleBounds] = useState({
    minWidth: 220,
    maxWidth: 420,
    maxHeight: 240,
  })
  const drawer = room.participants.find(
    (participant) => participant.sessionId === currentTurn?.drawerSessionId,
  )
  const isDrawer = Boolean(currentTurn && currentTurn.drawerSessionId === mySessionId)
  const isRunningTurn = room.roomState === 'RUNNING' && currentTurn !== null
  const canDraw =
    room.roomState === 'LOBBY' ||
    (currentTurn?.phase === 'DRAWING' && currentTurn.drawerSessionId === mySessionId)
  const controls = useGameBoardControls({ canDraw })
  const remainingSec = useTurnCountdown(currentTurn?.deadlineAtMs, currentTurn?.remainingSec ?? 0)
  const activeStrokes = isRunningTurn ? currentTurn.canvasStrokes : room.lobbyCanvasStrokes
  const isCorrectHighlightActive =
    room.roomState === 'RUNNING' &&
    Boolean(
      currentTurn &&
        mySessionId &&
        currentTurn.drawerSessionId !== mySessionId &&
        currentTurn.correctSessionIds.includes(mySessionId),
    )
  const surfaceClassName = isCorrectHighlightActive
    ? 'game-board-panel__surface game-board-panel__surface--correct'
    : 'game-board-panel__surface'
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
  const revealedHintCount = (() => {
    if (!currentTurn || currentTurn.phase !== 'DRAWING' || !currentTurn.selectedWord) {
      return 0
    }

    const interval = Math.max(1, room.settings.hintRevealSec)
    const lettersPerReveal = Math.max(1, room.settings.hintLetterCount)
    const elapsedSec = Math.max(0, room.settings.drawSec - remainingSec)
    return Math.floor(elapsedSec / interval) * lettersPerReveal
  })()
  const shouldShowSecretWordBanner =
    room.roomState === 'RUNNING' &&
    currentTurn?.phase === 'DRAWING' &&
    (isDrawer || Boolean(currentTurn.selectedWord) || typeof currentTurn.answerLength === 'number')
  const secretWordText =
    !currentTurn
      ? ''
      : isDrawer
        ? currentTurn.selectedWord ?? getMaskedWord(null, 0, currentTurn.answerLength)
        : currentTurn.hintPattern && currentTurn.hintPattern.length > 0
          ? currentTurn.hintPattern
          : getMaskedWord(currentTurn.selectedWord, revealedHintCount, currentTurn.answerLength)
  const selectedWordDescription = currentTurn?.selectedWordDescription
  const descriptionKey =
    currentTurn && typeof selectedWordDescription === 'string'
      ? `${currentTurn.turnId}:${selectedWordDescription}`
      : null
  const canShowDescriptionButton =
    isDrawer &&
    typeof selectedWordDescription === 'string' &&
    selectedWordDescription.trim().length > 0
  const isDescriptionOpen =
    canShowDescriptionButton &&
    shouldShowSecretWordBanner &&
    openedDescriptionKey !== null &&
    openedDescriptionKey === descriptionKey
  const descriptionBubbleStyle: CSSProperties = {
    minWidth: `${descriptionBubbleBounds.minWidth}px`,
    maxWidth: `${descriptionBubbleBounds.maxWidth}px`,
    maxHeight: `${descriptionBubbleBounds.maxHeight}px`,
    ['--secret-word-description-max-height' as string]: `${descriptionBubbleBounds.maxHeight}px`,
  }

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!isDescriptionOpen) {
        return
      }

      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (descriptionAnchorRef.current?.contains(target)) {
        return
      }

      setOpenedDescriptionKey(null)
    }

    window.addEventListener('pointerdown', handleDocumentPointerDown)
    return () => window.removeEventListener('pointerdown', handleDocumentPointerDown)
  }, [isDescriptionOpen])

  useEffect(() => {
    const anchor = descriptionAnchorRef.current
    if (!anchor) {
      return
    }

    const boardFrame = anchor.closest('.game-board-panel__surface')
    if (!(boardFrame instanceof HTMLElement)) {
      return
    }

    const updateDescriptionBubbleBounds = () => {
      const boardFrameRect = boardFrame.getBoundingClientRect()
      if (boardFrameRect.width <= 0 || boardFrameRect.height <= 0) {
        return
      }

      const nextBounds = {
        minWidth: Math.round(boardFrameRect.width * 0.36),
        maxWidth: Math.round(boardFrameRect.width * 0.8),
        maxHeight: Math.round(boardFrameRect.height * 0.45),
      }

      setDescriptionBubbleBounds((current) =>
        current.minWidth === nextBounds.minWidth &&
        current.maxWidth === nextBounds.maxWidth &&
        current.maxHeight === nextBounds.maxHeight
          ? current
          : nextBounds,
      )
    }

    updateDescriptionBubbleBounds()

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateDescriptionBubbleBounds)
      resizeObserver.observe(boardFrame)
    }

    window.addEventListener('resize', updateDescriptionBubbleBounds)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateDescriptionBubbleBounds)
    }
  }, [shouldShowSecretWordBanner])

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

      {currentTurn?.phase === 'TURN_END' ? (
        <div className="game-board-panel__turn-info">
          <span>정답: {currentTurn.selectedWord ?? '공개 대기 중'}</span>
        </div>
      ) : null}

      <div className={surfaceClassName} aria-label="게임 그림판">
        <DrawingCanvas
          activeColor={controls.activeColor}
          canDraw={controls.canDraw}
          onCommitStroke={controls.commitStroke}
          onSendStrokeChunk={controls.sendStrokeChunk}
          size={controls.size}
          strokes={activeStrokes}
          tool={controls.tool}
        />
        {shouldShowSecretWordBanner && currentTurn ? (
          <div
            key={
              isDrawer
                ? `${currentTurn.turnId}-${currentTurn.selectedWord ?? 'hidden'}`
                : `${currentTurn.turnId}-masked-${currentTurn.hintPattern ?? currentTurn.answerLength ?? 'unknown'}`
            }
            className={
              isDrawer
                ? 'game-board-panel__secret-word game-board-panel__secret-word--open'
                : 'game-board-panel__secret-word game-board-panel__secret-word--masked game-board-panel__secret-word--open'
            }
          >
            <div ref={descriptionAnchorRef} className="game-board-panel__secret-word-content">
              <span
                className={
                  isDrawer
                    ? 'game-board-panel__secret-word-text'
                    : 'game-board-panel__secret-word-text game-board-panel__secret-word-text--masked'
                }
              >
                {secretWordText}
              </span>
              {canShowDescriptionButton ? (
                <button
                  type="button"
                  className="game-board-panel__secret-word-help"
                  onClick={() =>
                    setOpenedDescriptionKey((current) =>
                      current === descriptionKey ? null : descriptionKey,
                    )
                  }
                  aria-label="제시어 설명 보기"
                  aria-expanded={isDescriptionOpen}
                >
                  ?
                </button>
              ) : null}
              {canShowDescriptionButton && isDescriptionOpen ? (
                <div
                  className="game-board-panel__secret-word-description"
                  style={descriptionBubbleStyle}
                  role="tooltip"
                >
                  <span>{selectedWordDescription}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <GameStageOverlay
          isDrawer={isDrawer}
          room={room}
          onChooseWord={(choiceIndex) => gameSessionCommands.sendWordChoice(choiceIndex)}
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
