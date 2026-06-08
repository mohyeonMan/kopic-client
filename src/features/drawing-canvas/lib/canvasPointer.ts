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
  size: number,
  usePressure: boolean,
): CanvasPoint {
  const rect = canvas.getBoundingClientRect()
  const pressure = Number.isFinite(event.pressure)
    ? Math.min(1, Math.max(0, event.pressure))
    : 0.5
  const pointSize = usePressure ? size * (0.5 + pressure) : size

  return {
    x: Number(((event.clientX - rect.left) / rect.width).toFixed(3)),
    y: Number(((event.clientY - rect.top) / rect.height).toFixed(3)),
    size: Number(pointSize.toFixed(1)),
  }
}
