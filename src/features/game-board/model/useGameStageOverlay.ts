/**
 * useGameStageOverlay
 *
 * 책임:
 * - game-board surface 위 stage overlay projection 계산
 * - legacy처럼 transient overlay open/closed 전환과 pending queue를 관리
 *
 * 하지 않는 것:
 * - game entity state 변경
 * - WebSocket command 실행
 * - page layout 상태 소유
 */
import { useEffect, useRef, useState, type TransitionEvent as ReactTransitionEvent } from 'react'
import type { RoomSnapshot } from '@/entities/game/model/gameTypes'

export type StageOverlayPhase = 'gameStart' | 'roundStart' | 'turnStart' | 'wordChoice' | 'turnEnd'
export type OverlayPreview =
  | 'actual'
  | 'gameStart'
  | 'roundStart'
  | 'turnStart'
  | 'wordChoice'
  | 'turnEnd'
  | 'gameResult'

type UseGameStageOverlayArgs = {
  room: RoomSnapshot
}

const STAGE_OVERLAY_PHASES: readonly StageOverlayPhase[] = [
  'gameStart',
  'roundStart',
  'turnStart',
  'wordChoice',
  'turnEnd',
]
const TRANSIENT_STAGE_OVERLAY_MS = 5_000

export function useGameStageOverlay({ room }: UseGameStageOverlayArgs) {
  const [overlayPreview, setOverlayPreview] = useState<OverlayPreview>('actual')
  const [activeStageOverlay, setActiveStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [pendingStageOverlay, setPendingStageOverlay] = useState<StageOverlayPhase | null>(null)
  const [stageOverlayOpen, setStageOverlayOpen] = useState(false)
  const stageOverlayOpenRafRef = useRef<number | null>(null)
  const overlayPreviewTimeoutIdsRef = useRef<number[]>([])
  const autoPreviewGameKeyRef = useRef<string | null>(null)
  const autoPreviewRoundKeyRef = useRef<string | null>(null)
  const autoPreviewTurnKeyRef = useRef<string | null>(null)
  const currentTurn = room.currentTurn

  const previewMode: OverlayPreview = (() => {
    if (overlayPreview !== 'actual') {
      return overlayPreview
    }

    if (room.roomState === 'RESULT') {
      return 'gameResult'
    }

    if (room.roomState !== 'RUNNING' || currentTurn?.phase === 'READY') {
      return 'actual'
    }

    if (currentTurn?.phase === 'TURN_END') {
      return 'turnEnd'
    }

    if (currentTurn?.phase === 'WORD_CHOICE') {
      return 'wordChoice'
    }

    return 'actual'
  })()

  const requestedStageOverlay: StageOverlayPhase | null =
    room.roomState === 'RUNNING' &&
    STAGE_OVERLAY_PHASES.includes(previewMode as StageOverlayPhase) &&
    (previewMode !== 'wordChoice' || Boolean(currentTurn))
      ? (previewMode as StageOverlayPhase)
      : null

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
    if (room.roomState === 'RUNNING') {
      return
    }

    autoPreviewGameKeyRef.current = null
    autoPreviewRoundKeyRef.current = null
    autoPreviewTurnKeyRef.current = null
    clearOverlayPreviewTimers()
    if (overlayPreview !== 'actual') {
      const timeoutId = window.setTimeout(() => setOverlayPreview('actual'), 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [overlayPreview, room.roomState])

  useEffect(() => {
    let timeoutId: number | null = null
    const scheduleOverlayPreview = (preview: OverlayPreview) => {
      timeoutId = window.setTimeout(() => setOverlayPreview(preview), 0)
    }
    const gameKey = room.roomState === 'RUNNING' && room.gameId ? `${room.gameId}` : null
    const roundKey =
      room.roomState === 'RUNNING' && room.currentRound
        ? `${room.gameId ?? 'no-game'}:round:${room.currentRound.roundNo}`
        : null
    const turnKey =
      room.roomState === 'RUNNING' && currentTurn
        ? `${room.gameId ?? 'no-game'}:turn:${currentTurn.turnId}`
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
      scheduleOverlayPreview('gameStart')
      return () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      }
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
      scheduleOverlayPreview('roundStart')
      return () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      }
    }

    if (!turnKey || turnKey === autoPreviewTurnKeyRef.current) {
      return
    }

    autoPreviewTurnKeyRef.current = turnKey
    scheduleOverlayPreview('turnStart')
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [currentTurn, room.currentRound, room.gameId, room.roomState])

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
      const timeoutId = window.setTimeout(() => setOverlayPreview('actual'), 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [currentTurn?.phase, overlayPreview])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
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
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeStageOverlay, requestedStageOverlay, stageOverlayOpen])

  return {
    activeStageOverlay,
    handleStageOverlayTransitionEnd,
    previewMode,
    stageOverlayOpen,
  }
}
