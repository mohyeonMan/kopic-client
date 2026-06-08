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
  const sizeMultiplier =
    pressure <= 0.5 ? 0.3 + pressure * 1.4 : 1 + (pressure - 0.5) * 1.6
  const pointSize = usePressure ? size * sizeMultiplier : size

  return {
    x: Number(((event.clientX - rect.left) / rect.width).toFixed(3)),
    y: Number(((event.clientY - rect.top) / rect.height).toFixed(3)),
    size: Number(pointSize.toFixed(1)),
  }
}
