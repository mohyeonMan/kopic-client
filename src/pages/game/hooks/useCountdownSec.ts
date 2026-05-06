import { useEffect, useState } from 'react'

type UseCountdownSecArgs = {
  active: boolean
  deadlineAtMs?: number
  fallbackSec?: number
}

export function useCountdownSec({ active, deadlineAtMs, fallbackSec = 0 }: UseCountdownSecArgs) {
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!active || !deadlineAtMs) {
      setTimerNowMs(Date.now())
      return
    }

    setTimerNowMs(Date.now())

    const timerId = window.setInterval(() => {
      setTimerNowMs(Date.now())
    }, 250)

    return () => {
      window.clearInterval(timerId)
    }
  }, [active, deadlineAtMs])

  if (!active) {
    return Math.max(0, Math.ceil(fallbackSec))
  }

  if (!deadlineAtMs) {
    return Math.max(0, Math.ceil(fallbackSec))
  }

  return Math.max(0, Math.ceil((deadlineAtMs - timerNowMs) / 1000))
}
