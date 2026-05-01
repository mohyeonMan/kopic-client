import { useEffect, useRef, useState } from 'react'
import type { TransitionEvent as ReactTransitionEvent } from 'react'
import type {
  RoomState,
  RoundSummary,
  TurnSummary,
} from '../../../entities/game/model'
import {
  getMaskedWord,
  STAGE_OVERLAY_PHASES,
  TRANSIENT_STAGE_OVERLAY_MS,
  type EarnedScore,
  type OverlayPreview,
  type StageOverlayPhase,
  type TurnEndOverlaySnapshot,
} from '../gamePageShared'

type UseGameStageOverlayArgs = {
  currentRound: RoundSummary | null
  currentTurn: TurnSummary | null
  earnedScores: EarnedScore[]
  gameId: string | null
  isDrawer: boolean
  roomState: RoomState
}

export function useGameStageOverlay({
  currentRound,
  currentTurn,
  earnedScores,
  gameId,
  isDrawer,
  roomState,
}: UseGameStageOverlayArgs) {
  const [overlayPreview, setOverlayPreview] = useState<OverlayPreview>('actual')
  const [activeStageOverlay, setActiveStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [pendingStageOverlay, setPendingStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [stageOverlayOpen, setStageOverlayOpen] = useState(false)
  const [turnEndOverlaySnapshot, setTurnEndOverlaySnapshot] =
    useState<TurnEndOverlaySnapshot | null>(null)
  const stageOverlayOpenRafRef = useRef<number | null>(null)
  const overlayPreviewTimeoutIdsRef = useRef<number[]>([])
  const autoPreviewGameKeyRef = useRef<string | null>(null)
  const autoPreviewRoundKeyRef = useRef<string | null>(null)
  const autoPreviewTurnKeyRef = useRef<string | null>(null)

  const previewMode: OverlayPreview = (() => {
    if (overlayPreview !== 'actual') {
      return overlayPreview
    }

    if (roomState === 'RESULT') {
      return 'gameResult'
    }

    if (roomState === 'LOBBY' || currentTurn?.phase === 'READY') {
      return 'actual'
    }

    if (currentTurn?.phase === 'TURN_END') {
      return 'turnEnd'
    }

    if (currentTurn?.phase === 'DRAWING') {
      return isDrawer ? 'drawingDrawer' : 'drawingGuesser'
    }

    return 'wordChoice'
  })()

  const requestedStageOverlay: StageOverlayPhase | null =
    roomState === 'RUNNING' &&
    STAGE_OVERLAY_PHASES.includes(previewMode as StageOverlayPhase) &&
    (previewMode !== 'wordChoice' || Boolean(currentTurn))
      ? (previewMode as StageOverlayPhase)
      : null
  const shouldShowSecretWordBanner =
    roomState === 'RUNNING' &&
    (Boolean(currentTurn?.selectedWord) || typeof currentTurn?.answerLength === 'number') &&
    (isDrawer || currentTurn?.phase === 'DRAWING' || previewMode === 'turnEnd')
  const isSecretWordBannerClosed = previewMode === 'turnEnd'

  useEffect(() => {
    if (roomState !== 'RUNNING' || !currentTurn || currentTurn.phase !== 'TURN_END') {
      return
    }

    setTurnEndOverlaySnapshot({
      turnId: currentTurn.turnId,
      answerText: currentTurn.selectedWord ?? getMaskedWord(null, 0, currentTurn.answerLength),
      earnedScores,
    })
  }, [currentTurn, earnedScores, roomState])

  const queueStageOverlayOpen = () => {
    if (stageOverlayOpenRafRef.current !== null) {
      window.cancelAnimationFrame(stageOverlayOpenRafRef.current)
    }

    stageOverlayOpenRafRef.current = window.requestAnimationFrame(() => {
      stageOverlayOpenRafRef.current = null
      setStageOverlayOpen(true)
    })
  }

  const clearOverlayPreviewTimers = () => {
    for (const timeoutId of overlayPreviewTimeoutIdsRef.current) {
      window.clearTimeout(timeoutId)
    }
    overlayPreviewTimeoutIdsRef.current = []
  }

  const handleStageOverlayTransitionEnd = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') {
      return
    }

    if (stageOverlayOpen) {
      return
    }

    if (pendingStageOverlay) {
      setActiveStageOverlay(pendingStageOverlay)
      setPendingStageOverlay(null)
      queueStageOverlayOpen()
      return
    }

    setActiveStageOverlay(null)
  }

  useEffect(() => {
    return () => {
      clearOverlayPreviewTimers()
      if (stageOverlayOpenRafRef.current !== null) {
        window.cancelAnimationFrame(stageOverlayOpenRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (roomState === 'RUNNING') {
      return
    }

    autoPreviewGameKeyRef.current = null
    autoPreviewRoundKeyRef.current = null
    autoPreviewTurnKeyRef.current = null
    clearOverlayPreviewTimers()
    if (overlayPreview !== 'actual') {
      setOverlayPreview('actual')
    }
  }, [overlayPreview, roomState])

  useEffect(() => {
    const gameKey = roomState === 'RUNNING' && gameId ? `${gameId}` : null
    const roundKey =
      roomState === 'RUNNING' && currentRound
        ? `${gameId ?? 'no-game'}:round:${currentRound.roundNo}`
        : null
    const turnKey =
      roomState === 'RUNNING' && currentTurn
        ? `${gameId ?? 'no-game'}:turn:${currentTurn.turnId}`
        : null

    if (!gameKey) {
      autoPreviewGameKeyRef.current = null
      autoPreviewRoundKeyRef.current = null
      autoPreviewTurnKeyRef.current = null
      clearOverlayPreviewTimers()
      return
    }

    if (gameKey !== autoPreviewGameKeyRef.current) {
      autoPreviewGameKeyRef.current = gameKey
      autoPreviewRoundKeyRef.current = null
      autoPreviewTurnKeyRef.current = null
      setOverlayPreview('gameStart')
      return
    }

    if (!roundKey) {
      autoPreviewRoundKeyRef.current = null
      autoPreviewTurnKeyRef.current = null
      clearOverlayPreviewTimers()
      return
    }

    if (roundKey !== autoPreviewRoundKeyRef.current) {
      autoPreviewRoundKeyRef.current = roundKey
      autoPreviewTurnKeyRef.current = null
      setOverlayPreview('roundStart')
      return
    }

    if (!turnKey || turnKey === autoPreviewTurnKeyRef.current) {
      return
    }

    autoPreviewTurnKeyRef.current = turnKey
    setOverlayPreview('turnStart')
  }, [currentRound, currentTurn, gameId, roomState])

  useEffect(() => {
    if (
      overlayPreview !== 'gameStart' &&
      overlayPreview !== 'roundStart' &&
      overlayPreview !== 'turnStart'
    ) {
      return
    }

    clearOverlayPreviewTimers()
    const currentPreview = overlayPreview
    const timeoutId = window.setTimeout(() => {
      setOverlayPreview((preview) => (preview === currentPreview ? 'actual' : preview))
    }, TRANSIENT_STAGE_OVERLAY_MS)
    overlayPreviewTimeoutIdsRef.current.push(timeoutId)

    return () => {
      clearOverlayPreviewTimers()
    }
  }, [overlayPreview])

  useEffect(() => {
    if (overlayPreview === 'turnStart' && currentTurn?.phase && currentTurn.phase !== 'READY') {
      clearOverlayPreviewTimers()
      setOverlayPreview('actual')
    }
  }, [currentTurn?.phase, overlayPreview])

  useEffect(() => {
    if (!requestedStageOverlay) {
      setPendingStageOverlay(null)

      if (activeStageOverlay && stageOverlayOpen) {
        setStageOverlayOpen(false)
        return
      }

      if (activeStageOverlay) {
        setActiveStageOverlay(null)
      }

      return
    }

    if (!activeStageOverlay) {
      setPendingStageOverlay(null)
      setActiveStageOverlay(requestedStageOverlay)
      setStageOverlayOpen(false)
      queueStageOverlayOpen()
      return
    }

    if (activeStageOverlay === requestedStageOverlay) {
      setPendingStageOverlay(null)

      if (!stageOverlayOpen) {
        queueStageOverlayOpen()
      }

      return
    }

    setPendingStageOverlay(requestedStageOverlay)

    if (stageOverlayOpen) {
      setStageOverlayOpen(false)
      return
    }

    setActiveStageOverlay(requestedStageOverlay)
    setPendingStageOverlay(null)
    queueStageOverlayOpen()
  }, [activeStageOverlay, requestedStageOverlay, stageOverlayOpen])

  return {
    activeStageOverlay,
    handleStageOverlayTransitionEnd,
    isSecretWordBannerClosed,
    overlayPreview,
    previewMode,
    setOverlayPreview,
    shouldShowSecretWordBanner,
    stageOverlayOpen,
    turnEndOverlaySnapshot,
  }
}
