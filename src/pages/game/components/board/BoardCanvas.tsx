import './BoardCanvas.css'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { CanvasStroke, DrawingTool, RoomState, TurnSummary } from '../../../../entities/game/model'
import { CanvasBoard } from '../../../../features/game-canvas/CanvasBoard'
import { getMaskedWord, type ViewerRole } from '../../gamePageShared'

type BoardCanvasProps = {
  activePaletteColor: string
  boardStrokes: CanvasStroke[]
  canDraw: boolean
  currentTurn: TurnSummary | null
  isHost: boolean
  isSecretWordBannerClosed: boolean
  onCommitStroke: (stroke: CanvasStroke) => void
  onSendStrokeChunk: (stroke: CanvasStroke) => void
  onToggleSettings: () => void
  revealedHintCount: number
  roomState: RoomState
  settingsOpen: boolean
  shouldShowSecretWordBanner: boolean
  size: number
  tool: DrawingTool
  viewerRole: ViewerRole
}

export function BoardCanvas({
  activePaletteColor,
  boardStrokes,
  canDraw,
  currentTurn,
  isHost,
  isSecretWordBannerClosed,
  onCommitStroke,
  onSendStrokeChunk,
  onToggleSettings,
  revealedHintCount,
  roomState,
  settingsOpen,
  shouldShowSecretWordBanner,
  size,
  tool,
  viewerRole,
}: BoardCanvasProps) {
  const [openedDescriptionKey, setOpenedDescriptionKey] = useState<string | null>(null)
  const [descriptionBubbleBounds, setDescriptionBubbleBounds] = useState({
    minWidth: 220,
    maxWidth: 420,
    maxHeight: 240,
  })
  const descriptionAnchorRef = useRef<HTMLDivElement | null>(null)
  const secretWordText =
    !currentTurn
      ? ''
      : viewerRole === 'drawer'
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
    viewerRole === 'drawer' &&
    typeof selectedWordDescription === 'string' &&
    selectedWordDescription.length > 0
  const isDescriptionOpen =
    canShowDescriptionButton &&
    shouldShowSecretWordBanner &&
    !isSecretWordBannerClosed &&
    openedDescriptionKey !== null &&
    openedDescriptionKey === descriptionKey

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

    const boardFrame = anchor.closest('.board-frame')
    if (!(boardFrame instanceof HTMLElement)) {
      return
    }

    const updateDescriptionBubbleBounds = () => {
      const boardFrameRect = boardFrame.getBoundingClientRect()
      const boardFrameWidth = boardFrameRect.width
      const boardFrameHeight = boardFrameRect.height
      if (!Number.isFinite(boardFrameWidth) || boardFrameWidth <= 0) {
        return
      }

      if (!Number.isFinite(boardFrameHeight) || boardFrameHeight <= 0) {
        return
      }

      const nextMinWidth = Math.round(boardFrameWidth * 0.36)
      const nextMaxWidth = Math.round(boardFrameWidth * 0.8)
      const nextMaxHeight = Math.round(boardFrameHeight * 0.45)

      setDescriptionBubbleBounds((current) =>
        current.minWidth === nextMinWidth &&
        current.maxWidth === nextMaxWidth &&
        current.maxHeight === nextMaxHeight
          ? current
          : {
              minWidth: nextMinWidth,
              maxWidth: nextMaxWidth,
              maxHeight: nextMaxHeight,
            },
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
  }, [])

  const descriptionBubbleStyle: CSSProperties = {
    minWidth: `${descriptionBubbleBounds.minWidth}px`,
    maxWidth: `${descriptionBubbleBounds.maxWidth}px`,
    maxHeight: `${descriptionBubbleBounds.maxHeight}px`,
  }

  return (
    <>
      <div className="grid-overlay" />
      <CanvasBoard
        strokes={boardStrokes}
        canDraw={canDraw}
        tool={tool}
        color={tool === 'ERASER' ? '#ffffff' : activePaletteColor}
        size={Math.max(2, size * 2)}
        onSendStrokeChunk={onSendStrokeChunk}
        onCommitStroke={onCommitStroke}
      />

      {roomState === 'LOBBY' ? (
        <button
          type="button"
          className={
            settingsOpen
              ? 'board-settings-toggle secondary-button board-settings-toggle-hidden'
              : 'board-settings-toggle secondary-button'
          }
          onClick={onToggleSettings}
        >
          {isHost ? '설정 열기' : '설정 보기'}
        </button>
      ) : null}

      {shouldShowSecretWordBanner && currentTurn ? (
        <div
          key={
            viewerRole === 'drawer'
              ? `${currentTurn.turnId}-${currentTurn.selectedWord ?? 'hidden'}`
              : `${currentTurn.turnId}-masked-${currentTurn.hintPattern ?? currentTurn.answerLength ?? 'unknown'}`
          }
          className={
            isSecretWordBannerClosed
              ? `secret-word-banner${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-closed`
              : `secret-word-banner secret-word-banner-landing${viewerRole !== 'drawer' ? ' secret-word-banner-masked' : ''} secret-word-banner-open`
          }
        >
          <div ref={descriptionAnchorRef} className="secret-word-banner-content">
            <span
              className={
                viewerRole === 'drawer'
                  ? 'secret-word-banner-text'
                  : 'secret-word-banner-text secret-word-banner-text-masked'
              }
            >
              {secretWordText}
            </span>
            {canShowDescriptionButton ? (
              <button
                type="button"
                className="secret-word-description-button"
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
                className="secret-word-description-bubble"
                style={descriptionBubbleStyle}
                role="tooltip"
              >
                {selectedWordDescription}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
