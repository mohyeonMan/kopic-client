import type {
  ChatMessage,
  RoundSummary,
  TurnSummary,
} from '@/entities/game/model'

export type ServerGameStartedPayload = {
  gameId: string
  currentRound: RoundSummary
  currentTurn: TurnSummary
  chatMessages?: ChatMessage[]
}

export type GeGameStartedPayload = {
  gameId: string
  gameStartSec?: number
}

export type GeRoundStartedPayload = {
  gameId: string
  roundNo: number
  drawerSessionIds: string[]
  roundStartSec?: number
}

export type GeTurnStartedPayload = {
  gameId: string
  roundNo: number
  turnId: string
  drawerSessionId: string
  remainingSec: number
}

export type GeGuessCorrectPayload = {
  gameId: string
  turnId: string
  sessionId: string
  selectedWord?: string | null
  selectedWordDescription?: string | null
}

export type GeWordChoiceOpenedPayload = {
  gameId?: string
  turnId: string
  drawerSessionId: string
  remainingSec: number
  wordChoices: string[]
}

export type GeDrawingStartedPayload = {
  gameId: string
  turnId: string
  drawerSessionId: string
  remainingSec: number
  selectedWord: string | null
  selectedWordDescription?: string | null
  answerLength?: number
  hintPattern?: string | null
}

export type GeHintRevealedPayload = {
  gameId: string
  turnId: string
  drawerSessionId: string
  hintPattern: string
  revealedCount?: number
  totalRevealCount?: number
}

export type GeTurnEndedPayload = {
  gameId: string
  turnId: string
  reason: string
  answer: string | null
  earnedPoints: Record<string, number>
  turnEndSec?: number
}

export type GeGameResultPayload = {
  gameId: string
  resultSec: number
  totalPoints: Record<string, number>
}

export type GeReturnToLobbyPayload = {
  gameId: string
  reason: string
  restartSec?: number
}

export type ServerWordChoicePayload = {
  selectedWord: string
  remainingSec: number
  chatMessage?: ChatMessage
}
