import { useEffect, useState } from 'react'

type UseCountdownSecArgs = {
  active: boolean
  deadlineAtMs?: number
  fallbackSec?: number
}

export function useCountdownSec({ active, deadlineAtMs, fallbackSec }: UseCountdownSecArgs) {
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
    return typeof fallbackSec === 'number' ? Math.max(0, Math.ceil(fallbackSec)) : undefined
  }

  if (!deadlineAtMs) {
    return typeof fallbackSec === 'number' ? Math.max(0, Math.ceil(fallbackSec)) : undefined
  }

  return Math.max(0, Math.ceil((deadlineAtMs - timerNowMs) / 1000))
}
