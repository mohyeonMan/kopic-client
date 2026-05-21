import type { PointerEvent as ReactPointerEvent } from 'react'
import type { CanvasPoint } from '@/entities/game/model'

export function clearTextSelection() {
  if (typeof window === 'undefined') {
    return
  }

  window.getSelection?.()?.removeAllRanges()
}

export function getCanvasPoint(
  event: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): CanvasPoint {
  const rect = canvas.getBoundingClientRect()

  return {
    x: Number(((event.clientX - rect.left) / rect.width).toFixed(3)),
    y: Number(((event.clientY - rect.top) / rect.height).toFixed(3)),
  }
}
