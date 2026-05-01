import { useEffect, useState } from 'react'
import type {
  CanvasStroke,
  DrawingTool,
  GameSettings,
  RoomState,
  TurnPhase,
} from '../../../entities/game/model'
import type { AppStateContextValue } from '../../../app/store/appStateContextValue'
import {
  TOOL_COLORS,
  type NumericSettingKey,
  type ViewerRole,
} from '../gamePageShared'

type UseGameControlsArgs = {
  actions: AppStateContextValue['actions']
  forcedPaletteColor?: string
  isHost: boolean
  onBeforeRequestWordChoice?: () => void
  roomState: RoomState
  server: AppStateContextValue['server']
  viewerRole: ViewerRole
  currentTurnPhase?: TurnPhase
  currentTurnWordChoices?: string[]
}

export function useGameControls({
  actions,
  forcedPaletteColor,
  isHost,
  onBeforeRequestWordChoice,
  roomState,
  server,
  viewerRole,
  currentTurnPhase,
  currentTurnWordChoices,
}: UseGameControlsArgs) {
  const [tool, setTool] = useState<DrawingTool>('PEN')
  const [size, setSize] = useState(5)
  const [color, setColor] = useState<string>(TOOL_COLORS[0])
  const [guessInput, setGuessInput] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (roomState !== 'LOBBY') {
      setSettingsOpen(false)
    }
  }, [roomState])

  const canDraw =
    roomState === 'LOBBY'
      ? !settingsOpen
      : roomState === 'RUNNING'
        ? viewerRole === 'drawer' && currentTurnPhase === 'DRAWING'
        : false
  const isDrawerDrawingPhase =
    roomState === 'RUNNING' && viewerRole === 'drawer' && currentTurnPhase === 'DRAWING'
  const isSharedDrawingPhase = roomState === 'LOBBY' && !settingsOpen
  const canUseFullPalette = isDrawerDrawingPhase
  const activePaletteColor = isSharedDrawingPhase && forcedPaletteColor ? forcedPaletteColor : color

  const applySetting = (key: NumericSettingKey, value: string) => {
    if (!isHost) {
      return
    }

    actions.patchLobbySettings({ [key]: Number(value) })
  }

  const applyEndMode = (value: GameSettings['endMode']) => {
    if (!isHost) {
      return
    }

    actions.patchLobbySettings({ endMode: value })
  }

  const submitGuess = () => {
    const nextText = guessInput.trim().slice(0, 50)

    if (!nextText) {
      return
    }

    actions.submitGuess(nextText)
    setGuessInput('')
  }

  const handleSendStrokeChunk = (stroke: CanvasStroke) => {
    if (roomState !== 'RUNNING' && roomState !== 'LOBBY') {
      return
    }

    actions.sendCanvasStroke(stroke)
  }

  const handleCommitStroke = (stroke: CanvasStroke) => {
    server.applyCanvasStroke(stroke)
  }

  const handleClearCanvas = () => {
    if (!canDraw) {
      return
    }

    actions.requestCanvasClear()
  }

  const handleToggleSettings = () => {
    setSettingsOpen((open) => !open)
  }

  const handleCloseSettings = () => {
    setSettingsOpen(false)
  }

  const handleStartGame = () => {
    setSettingsOpen(false)
    actions.requestGameStart()
  }

  const handleRequestWordChoice = (word: string) => {
    onBeforeRequestWordChoice?.()
    actions.requestWordChoice(word)
  }

  const handleToolChange = (nextTool: DrawingTool) => {
    setTool(nextTool)
  }

  const handleSizeChange = (nextSize: number) => {
    setSize(nextSize)
  }

  const handleColorChange = (nextColor: string) => {
    if (!canUseFullPalette) {
      return
    }

    setTool((currentTool) => (currentTool === 'ERASER' ? 'PEN' : currentTool))
    setColor(nextColor)
  }

  const currentWordChoices = Array.isArray(currentTurnWordChoices)
    ? currentTurnWordChoices
    : []

  return {
    activePaletteColor,
    applyEndMode,
    applySetting,
    canDraw,
    canUseFullPalette,
    currentWordChoices,
    guessInput,
    handleClearCanvas,
    handleCloseSettings,
    handleColorChange,
    handleCommitStroke,
    handleRequestWordChoice,
    handleSendStrokeChunk,
    handleSizeChange,
    handleStartGame,
    handleToggleSettings,
    handleToolChange,
    isDrawerDrawingPhase,
    isSharedDrawingPhase,
    setGuessInput,
    settingsOpen,
    size,
    submitGuess,
    tool,
  }
}
