import type {
  GeDrawingStartedPayload,
  GeGameResultPayload,
  GeGameStartedPayload,
  GeHintRevealedPayload,
  GeGuessCorrectPayload,
  GeReturnToLobbyPayload,
  GeRoundStartedPayload,
  GeTurnEndedPayload,
  GeTurnStartedPayload,
  GeWordChoiceOpenedPayload,
} from '@/entities/game/api/gameEventPayloads'
import {
  isRecord,
  readFiniteNumber,
  readNonEmptyString,
} from '../gameProtocol'
import { readPointsMap } from './pointPayloadDecoders'

function readTurnId(payload: Record<string, unknown>) {
  return readNonEmptyString(payload.tid)
}

export function decodeGeGameStartedPayload(payload: unknown): GeGameStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  if (!gameId) {
    return null
  }

  return {
    gameId,
    gameStartSec: readFiniteNumber(payload.sec),
  }
}

export function decodeGeRoundStartedPayload(payload: unknown): GeRoundStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const roundNo = readFiniteNumber(payload.r)
  const drawerSessionIds = Array.isArray(payload.dss)
    ? payload.dss
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : []

  if (!gameId || roundNo === undefined || drawerSessionIds.length === 0) {
    return null
  }

  return {
    gameId,
    roundNo,
    drawerSessionIds,
    roundStartSec: readFiniteNumber(payload.sec),
  }
}

export function decodeGeTurnStartedPayload(payload: unknown): GeTurnStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const roundNo = readFiniteNumber(payload.r)
  const turnId = readTurnId(payload)
  const drawerSessionId = readNonEmptyString(payload.ds)
  const remainingSec = readFiniteNumber(payload.sec)

  if (
    !gameId ||
    roundNo === undefined ||
    !turnId ||
    !drawerSessionId ||
    remainingSec === undefined
  ) {
    return null
  }

  return {
    gameId,
    roundNo,
    turnId,
    drawerSessionId,
    remainingSec,
  }
}

export function decodeGeGuessCorrectPayload(payload: unknown): GeGuessCorrectPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const turnId = readTurnId(payload)
  const sessionId = readNonEmptyString(payload.sid)
  if (!gameId || !turnId || !sessionId) {
    return null
  }

  return {
    gameId,
    turnId,
    sessionId,
  }
}

export function decodeGeWordChoiceOpenedPayload(
  payload: unknown,
): GeWordChoiceOpenedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const turnId = readTurnId(payload)
  const drawerSessionId = readNonEmptyString(payload.ds)
  const remainingSec = readFiniteNumber(payload.sec)
  if (!turnId || !drawerSessionId || remainingSec === undefined) {
    return null
  }

  const wordChoices = Array.isArray(payload.w)
    ? payload.w
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : []

  return {
    turnId,
    drawerSessionId,
    remainingSec,
    wordChoices,
  }
}

export function decodeGeDrawingStartedPayload(
  payload: unknown,
): GeDrawingStartedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const turnId = readTurnId(payload)
  const drawerSessionId = readNonEmptyString(payload.ds)
  const remainingSec = readFiniteNumber(payload.sec)
  if (!gameId || !turnId || !drawerSessionId || remainingSec === undefined) {
    return null
  }

  const answerEntry = isRecord(payload.ae) ? payload.ae : null
  const answerEntryWord = answerEntry
    ? answerEntry.w === null
      ? null
      : readNonEmptyString(answerEntry.w) ?? null
    : undefined
  const selectedWord =
    payload.ans === null || answerEntryWord === null
      ? null
      : answerEntryWord ?? readNonEmptyString(payload.ans) ?? null
  const selectedWordDescription =
    answerEntry && Object.prototype.hasOwnProperty.call(answerEntry, 'd')
      ? answerEntry.d === null
        ? null
        : typeof answerEntry.d === 'string'
          ? answerEntry.d
          : undefined
      : payload.ad === null
        ? null
        : typeof payload.ad === 'string'
          ? payload.ad
          : undefined
  const answerLength = readFiniteNumber(payload.al)
  const hintPattern =
    payload.hp === null
      ? null
      : typeof payload.hp === 'string'
        ? payload.hp
        : undefined

  return {
    gameId,
    turnId,
    drawerSessionId,
    remainingSec,
    selectedWord,
    selectedWordDescription,
    answerLength,
    hintPattern,
  }
}

export function decodeGeHintRevealedPayload(
  payload: unknown,
): GeHintRevealedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const turnId = readTurnId(payload)
  const drawerSessionId = readNonEmptyString(payload.ds)
  const hintPattern = typeof payload.hp === 'string' ? payload.hp : null
  if (!gameId || !turnId || !drawerSessionId || hintPattern === null) {
    return null
  }

  return {
    gameId,
    turnId,
    drawerSessionId,
    hintPattern,
    revealedCount: readFiniteNumber(payload.hc),
    totalRevealCount: readFiniteNumber(payload.ht),
  }
}

export function decodeGeTurnEndedPayload(payload: unknown): GeTurnEndedPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const turnId = readTurnId(payload)
  const reason = readNonEmptyString(payload.rsn)
  if (!gameId || !turnId || !reason) {
    return null
  }

  const answer = payload.ans === null ? null : readNonEmptyString(payload.ans) ?? null

  return {
    gameId,
    turnId,
    reason,
    answer,
    earnedPoints: readPointsMap(payload.ep),
    turnEndSec: readFiniteNumber(payload.sec),
  }
}

export function decodeGeGameResultPayload(payload: unknown): GeGameResultPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const resultSec = readFiniteNumber(payload.sec)
  if (!gameId || resultSec === undefined) {
    return null
  }

  return {
    gameId,
    resultSec,
    totalPoints: readPointsMap(payload.pts),
  }
}

export function decodeGeReturnToLobbyPayload(
  payload: unknown,
): GeReturnToLobbyPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const gameId = readNonEmptyString(payload.gid)
  const reason = readNonEmptyString(payload.rsn)
  if (!gameId || !reason) {
    return null
  }

  return {
    gameId,
    reason,
    restartSec: readFiniteNumber(payload.sec),
  }
}
