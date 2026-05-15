/**
 * useTurnCountdown
 *
 * 책임:
 * - turn deadline을 화면 표시용 초 단위 값으로 변환
 * - countdown tick이라는 UI side effect만 소유
 *
 * 하지 않는 것:
 * - game state mutation
 * - server timer 보정
 * - WebSocket event 처리
 *
 * side effect:
 * - deadline이 있는 동안 1초 interval 구동
 */
import { useEffect, useState } from 'react'

function resolveRemainingSec(deadlineAtMs: number | undefined, fallbackSec: number, nowMs: number) {
  if (!deadlineAtMs) {
    return Math.max(0, Math.round(fallbackSec))
  }

  return Math.max(0, Math.ceil((deadlineAtMs - nowMs) / 1000))
}

export function useTurnCountdown(deadlineAtMs?: number, fallbackSec = 0) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!deadlineAtMs) {
      return
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1_000)

    return () => window.clearInterval(intervalId)
  }, [deadlineAtMs])

  return resolveRemainingSec(deadlineAtMs, fallbackSec, nowMs)
}
