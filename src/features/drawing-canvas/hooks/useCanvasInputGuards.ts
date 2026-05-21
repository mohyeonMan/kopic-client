import { useEffect, type RefObject } from 'react'
import { clearTextSelection } from '../lib/canvasPointer'

export function useCanvasInputGuards(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const preventDefault = (event: Event) => {
      clearTextSelection()
      event.preventDefault()
    }

    canvas.addEventListener('touchstart', preventDefault, { passive: false })
    canvas.addEventListener('touchmove', preventDefault, { passive: false })
    canvas.addEventListener('touchend', preventDefault, { passive: false })
    canvas.addEventListener('touchcancel', preventDefault, { passive: false })
    canvas.addEventListener('gesturestart', preventDefault as EventListener, { passive: false })
    canvas.addEventListener('gesturechange', preventDefault as EventListener, { passive: false })
    canvas.addEventListener('gestureend', preventDefault as EventListener, { passive: false })
    canvas.addEventListener('contextmenu', preventDefault)
    canvas.addEventListener('selectstart', preventDefault)
    canvas.addEventListener('dragstart', preventDefault)

    return () => {
      canvas.removeEventListener('touchstart', preventDefault)
      canvas.removeEventListener('touchmove', preventDefault)
      canvas.removeEventListener('touchend', preventDefault)
      canvas.removeEventListener('touchcancel', preventDefault)
      canvas.removeEventListener('gesturestart', preventDefault as EventListener)
      canvas.removeEventListener('gesturechange', preventDefault as EventListener)
      canvas.removeEventListener('gestureend', preventDefault as EventListener)
      canvas.removeEventListener('contextmenu', preventDefault)
      canvas.removeEventListener('selectstart', preventDefault)
      canvas.removeEventListener('dragstart', preventDefault)
    }
  }, [canvasRef, enabled])
}
