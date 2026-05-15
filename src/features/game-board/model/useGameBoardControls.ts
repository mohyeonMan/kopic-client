/**
 * useGameBoardControls
 *
 * 책임:
 * - game-board toolbar UI 상태 소유
 * - canvas stroke commit/send/clear command orchestration
 *
 * 하지 않는 것:
 * - WebSocket connection 직접 접근
 * - room snapshot 저장
 * - canvas pointer event 처리
 *
 * side effect:
 * - stroke send/clear command 호출
 * - optimistic local canvas store update
 */
import { useState } from 'react'
import type { CanvasStroke, DrawingTool } from '@/entities/game/model/gameTypes'
import { useGameStore } from '@/entities/game/model/gameStore'
import { gameSessionCommands } from '@/features/game-session/model/gameSessionCommandGateway'
import { BOARD_COLORS } from '@/features/game-board/model/boardToolOptions'

type UseGameBoardControlsArgs = {
  canDraw: boolean
}

export function useGameBoardControls({ canDraw }: UseGameBoardControlsArgs) {
  const [tool, setTool] = useState<DrawingTool>('PEN')
  const [size, setSize] = useState(10)
  const [color, setColor] = useState<string>(BOARD_COLORS[0])
  const applyCanvasStroke = useGameStore((state) => state.applyCanvasStroke)
  const clearCanvasState = useGameStore((state) => state.clearCanvas)

  const sendStrokeChunk = (stroke: CanvasStroke) => {
    if (!canDraw) {
      return
    }

    gameSessionCommands.sendCanvasStroke(stroke)
  }

  const commitStroke = (stroke: CanvasStroke) => {
    if (!canDraw) {
      return
    }

    applyCanvasStroke(stroke)
  }

  const clearCanvas = () => {
    if (!canDraw) {
      return
    }

    clearCanvasState()
    gameSessionCommands.sendCanvasClear()
  }

  const selectColor = (nextColor: string) => {
    setTool((currentTool) => (currentTool === 'ERASER' ? 'PEN' : currentTool))
    setColor(nextColor)
  }

  return {
    activeColor: color,
    canDraw,
    clearCanvas,
    commitStroke,
    selectColor,
    sendStrokeChunk,
    setSize,
    setTool,
    size,
    tool,
  }
}
