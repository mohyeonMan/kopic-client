import { useEffect, useState } from 'react'
import type { RoomState, TurnSummary } from '../../../entities/game/model'

type UseTurnTimerArgs = {
  currentTurn: TurnSummary | null
  roomState: RoomState
}

export function useTurnTimer({ currentTurn, roomState }: UseTurnTimerArgs) {
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!currentTurn?.deadlineAtMs || roomState !== 'RUNNING') {
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
  }, [currentTurn?.deadlineAtMs, roomState])

  const displayedRemainingSec =
    currentTurn?.deadlineAtMs !== undefined
      ? Math.max(0, Math.ceil((currentTurn.deadlineAtMs - timerNowMs) / 1000))
      : currentTurn?.remainingSec ?? 0

  return displayedRemainingSec
}
