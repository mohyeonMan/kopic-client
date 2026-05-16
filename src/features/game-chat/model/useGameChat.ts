/**
 * useGameChat
 *
 * 책임:
 * - guess input form 상태 소유
 * - guess submit command orchestration
 * - optimistic local chat message append
 *
 * 하지 않는 것:
 * - WebSocket connection 직접 접근
 * - raw server chat payload decoding
 * - participant nickname resolution
 *
 * side effect:
 * - submit 시 gameSession command 호출
 * - submit 시 local optimistic chat message 저장
 */
import { useMemo, useState } from 'react'
import { createLocalGuessMessage } from '@/entities/game/api/chatMessageNormalizer'
import { useGameStore } from '@/entities/game/model/gameStore'
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { gameSessionCommands } from '@/features/game-session/model/gameSessionCommandGateway'

const MAX_GUESS_LENGTH = 50

export function useGameChat() {
  const [input, setInput] = useState('')
  const appendChatMessage = useGameStore((state) => state.appendChatMessage)
  const nickname = useSessionStore((state) => state.nickname)
  const sessionId = useSessionStore((state) => state.sessionId)
  const roomState = useGameStore((state) => state.room.roomState)
  const currentTurn = useGameStore((state) => state.room.currentTurn)
  const chat = useGameStore((state) => state.room.chat)
  const messages = useMemo(
    () => chat.filter((message) => message.tone !== 'system'),
    [chat],
  )
  const hasCorrectAnswer =
    sessionId !== null ? currentTurn?.correctSessionIds.includes(sessionId) : false
  const canSubmitGuess =
    roomState === 'RUNNING' &&
    currentTurn?.phase === 'DRAWING' &&
    currentTurn.drawerSessionId !== sessionId &&
    !hasCorrectAnswer

  const submitGuess = () => {
    const text = input.trim().slice(0, MAX_GUESS_LENGTH)
    if (!text) {
      return
    }

    appendChatMessage(createLocalGuessMessage(text, nickname, sessionId, currentTurn))
    gameSessionCommands.sendGuess(text)
    setInput('')
  }

  return {
    canSubmitGuess,
    input,
    messages,
    setInput: (value: string) => setInput(value.slice(0, MAX_GUESS_LENGTH)),
    submitGuess,
  }
}
