import type {
  CanvasStroke,
  GameSettings,
  Participant,
  RoundSummary,
  TurnPhase,
  TurnSummary,
} from '../../../../entities/game/model'
import {
  isRecord,
  readFiniteNumber,
  readNonEmptyString,
} from '../appStateHelpers'
import { readPointsMap } from '../appStatePayloadDecoders'
import { sortParticipantsByJoinOrder } from './snapshotParticipants'

function isTurnPhase(value: unknown): value is TurnPhase {
  return value === 'READY' || value === 'WORD_CHOICE' || value === 'DRAWING' || value === 'TURN_END'
}

function normalizeSnapshotTurnPhase(value: unknown): TurnPhase | null {
  if (isTurnPhase(value)) {
    return value
  }

  if (value === 'STARTING') {
    return 'READY'
  }

  if (value === 'TURN_RESULT') {
    return 'TURN_END'
  }

  return null
}

export function normalizeCurrentRound(
  raw: unknown,
  settings: GameSettings,
): RoundSummary | null {
  if (raw === null) {
    return null
  }

  if (!isRecord(raw)) {
    return null
  }

  const roundNo = readFiniteNumber(raw.r) ?? 1
  const parsedDrawerOrder = Array.isArray(raw.dss)
    ? raw.dss
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : []
  const drawerSessionId = readNonEmptyString(raw.ds)
  const turnCursorFromDrawer =
    drawerSessionId && parsedDrawerOrder.length > 0
      ? parsedDrawerOrder.findIndex((sessionId) => sessionId === drawerSessionId)
      : -1

  return {
    roundNo,
    totalRounds: settings.roundCount,
    turnCursor: turnCursorFromDrawer >= 0 ? turnCursorFromDrawer : 0,
    drawerOrder: parsedDrawerOrder,
  }
}

export function normalizeCurrentTurn(
  raw: unknown,
  settings: GameSettings,
  participants: Participant[],
  currentRound?: RoundSummary | null,
): TurnSummary | null {
  if (raw === null) {
    return null
  }

  if (!isRecord(raw)) {
    return null
  }

  const fallbackDrawerSessionId =
    sortParticipantsByJoinOrder(participants)[0]?.sessionId ??
    'unknown'
  const drawerSessionId = readNonEmptyString(raw.ds) ?? fallbackDrawerSessionId
  const phase =
    normalizeSnapshotTurnPhase(raw.tp) ??
    'WORD_CHOICE'
  const correctSessionIdsSource = Array.isArray(raw.ca) ? raw.ca : []
  const earnedPoints = readPointsMap(raw.ep)
  const wordChoices: string[] = []
  const canvasStrokes: CanvasStroke[] = []
  const selectedWord =
    raw.ans === null
      ? null
      : readNonEmptyString(raw.ans) ?? null
  const selectedWordDescription = undefined
  const roundNo =
    readFiniteNumber(raw.r) ??
    currentRound?.roundNo ??
    1
  const turnNo =
    (currentRound ? currentRound.turnCursor + 1 : undefined) ??
    1
  const correctSessionIds = (
    correctSessionIdsSource.length > 0
      ? correctSessionIdsSource
      : phase === 'TURN_END'
        ? Object.keys(earnedPoints).filter((sessionId) => sessionId !== drawerSessionId)
        : []
  )
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  const answerLength =
    readFiniteNumber(raw.al) ??
    (selectedWord !== null ? Array.from(selectedWord).length : undefined)
  const hintPattern =
    raw.hp === null
      ? null
      : typeof raw.hp === 'string'
        ? raw.hp
        : undefined

  return {
    roundNo,
    turnNo,
    turnId: readNonEmptyString(raw.tid) ?? `turn-r${roundNo}-${turnNo}`,
    drawerSessionId,
    phase,
    remainingSec:
      readFiniteNumber(raw.remainingSec) ??
      (phase === 'DRAWING' ? settings.drawSec : phase === 'WORD_CHOICE' ? settings.wordChoiceSec : 0),
    deadlineAtMs: undefined,
    correctSessionIds,
    earnedPoints,
    wordChoices,
    selectedWord,
    selectedWordDescription,
    answerLength,
    hintPattern,
    canvasStrokes,
  }
}
