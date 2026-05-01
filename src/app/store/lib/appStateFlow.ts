import type {
  AppState,
  GameSettings,
  Participant,
  RoomSnapshot,
  RoundSummary,
  TurnPhase,
  TurnSummary,
} from '../../../entities/game/model'
import type { ServerGameStartedPayload } from '../appStateContextValue'
import { createSystemMessage } from './appStateHelpers'

const mockWordPool = ['사과', '기차', '고양이', '우주선', '피아노']

function getDrawerOrder(participants: Participant[]) {
  return participants
    .filter((participant) => !participant.joinedMidRound)
    .sort((left, right) => {
      if (left.joinOrder !== right.joinOrder) {
        return left.joinOrder - right.joinOrder
      }

      return left.sessionId.localeCompare(right.sessionId)
    })
    .map((participant) => participant.sessionId)
}

function getWordChoices(count: number) {
  const safeCount = Math.max(3, Math.min(5, count))
  return mockWordPool.slice(0, safeCount)
}

export function createMockTurn(
  roundNo: number,
  turnNo: number,
  drawerSessionId: string,
  phase: TurnPhase,
  settings: GameSettings,
): TurnSummary {
  const wordChoices = getWordChoices(settings.wordChoiceCount)
  const turnEndCorrectSessionIds =
    settings.endMode === 'FIRST_CORRECT'
      ? ['u-200']
      : ['u-200', 'u-300', 'u-400', 'u-500', 'u-600', 'u-700', 'u-800', 'u-900', 'u-1000']
  const remainingSec =
    phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0
  const earnedPoints =
    phase === 'TURN_END'
      ? Object.fromEntries(
          [
            [drawerSessionId, 40],
            ...turnEndCorrectSessionIds.map((sessionId) => [sessionId, 80] as const),
          ],
        )
      : {}

  return {
    roundNo,
    turnNo,
    turnId: `turn-r${roundNo}-${turnNo}`,
    drawerSessionId,
    phase,
    remainingSec,
    deadlineAtMs: remainingSec > 0 ? Date.now() + remainingSec * 1000 : undefined,
    correctSessionIds: phase === 'TURN_END' ? turnEndCorrectSessionIds : [],
    earnedPoints,
    wordChoices,
    selectedWord: phase === 'DRAWING' || phase === 'TURN_END' ? wordChoices[0] : null,
    canvasStrokes: [],
  }
}

export function createMockGameStartedPayload(state: AppState): ServerGameStartedPayload {
  const drawerOrder = getDrawerOrder(state.room.participants)
  const firstDrawerSessionId = drawerOrder[0] ?? state.session.sessionId
  const currentRound: RoundSummary = {
    roundNo: 1,
    totalRounds: state.room.settings.roundCount,
    turnCursor: 0,
    drawerOrder,
  }

  return {
    gameId: 'game-20260323-01',
    currentRound,
    currentTurn: createMockTurn(1, 1, firstDrawerSessionId, 'WORD_CHOICE', state.room.settings),
    chatMessages: [
      createSystemMessage('GAME_STARTED'),
      createSystemMessage('303 ROUND_STARTED with drawerOrder snapshot'),
      createSystemMessage('304 TURN_STARTED'),
    ],
  }
}

export function createGeTurnId(gameId: string | null, roundNo: number, turnNo: number) {
  const resolvedGameId = gameId && gameId.trim().length > 0 ? gameId : 'ge-game'
  return `ge:${resolvedGameId}:r${roundNo}:t${turnNo}`
}

export function createDeadlineAtMs(remainingSec: number) {
  return remainingSec > 0 ? Date.now() + remainingSec * 1000 : undefined
}

export function resolveDrawerTurnCursor(
  drawerOrder: string[],
  drawerSessionId: string,
  fallbackTurnCursor = 0,
) {
  const resolvedIndex = drawerOrder.findIndex((sessionId) => sessionId === drawerSessionId)
  return resolvedIndex >= 0 ? resolvedIndex : fallbackTurnCursor
}

export function resolveRunningRoundSummary(state: AppState): RoundSummary {
  if (state.room.currentRound) {
    return state.room.currentRound
  }

  return {
    roundNo: 1,
    totalRounds: state.room.settings.roundCount,
    turnCursor: 0,
    drawerOrder: getDrawerOrder(state.room.participants),
  }
}

export function applyEarnedPointsToParticipants(
  participants: Participant[],
  earnedPoints: Record<string, number>,
): Participant[] {
  if (Object.keys(earnedPoints).length === 0) {
    return participants
  }

  return participants.map((participant) => ({
    ...participant,
    score: participant.score + (earnedPoints[participant.sessionId] ?? 0),
  }))
}

export function resetParticipantsForLobby(participants: Participant[]): Participant[] {
  return participants.map((participant) => ({
    ...participant,
    score: 0,
    joinedMidRound: false,
  }))
}

export function createLobbySnapshot(state: AppState): RoomSnapshot {
  return {
    ...state.room,
    roomState: 'LOBBY',
    gameId: null,
    currentRound: null,
    currentTurn: null,
    settings: { ...state.room.settings },
    participants: state.room.participants.map((participant) => ({
      ...participant,
      joinedMidRound: false,
    })),
    chat: [
      ...state.room.chat,
      createSystemMessage('room reset to lobby mock state'),
    ],
  }
}

export function createForcedTurn(
  currentTurn: TurnSummary,
  phase: TurnPhase,
  settings: GameSettings,
): TurnSummary {
  const nextTurn = createMockTurn(
    currentTurn.roundNo,
    currentTurn.turnNo,
    currentTurn.drawerSessionId,
    phase,
    settings,
  )

  if (phase === 'DRAWING' || phase === 'TURN_END') {
    return {
      ...nextTurn,
      selectedWord: currentTurn.selectedWord ?? currentTurn.wordChoices[0] ?? nextTurn.selectedWord,
      wordChoices: currentTurn.wordChoices,
      earnedPoints: currentTurn.earnedPoints,
      canvasStrokes: currentTurn.canvasStrokes,
    }
  }

  return nextTurn
}

export function createClearedRoomState(state: AppState): RoomSnapshot {
  return {
    ...state.room,
    roomCode: '',
    hostSessionId: '',
    participants: [],
    lobbyCanvasStrokes: [],
    settings: { ...state.room.settings },
    roomState: 'LOBBY',
    gameId: null,
    currentRound: null,
    currentTurn: null,
    chat: [],
  }
}
