import type {
  AppState,
  ChatMessage,
  Participant,
  RoomSnapshot,
  RoomState,
  TurnSummary,
} from '../../../entities/game/model'
import {
  isRecord,
  readFiniteNumber,
  readNonEmptyString,
} from './appStateHelpers'
import { readPointsMap } from './appStatePayloadDecoders'
import { normalizeSnapshotCanvasStrokes } from './snapshot/snapshotCanvas'
import {
  applyTotalPointsToParticipants,
  normalizeParticipants,
} from './snapshot/snapshotParticipants'
import {
  normalizeGameSettings,
  readRawSettingsPayload,
} from './snapshot/snapshotSettings'
import {
  normalizeCurrentRound,
  normalizeCurrentTurn,
} from './snapshot/snapshotTurn'

export { decodeSettingsUpdatePayload } from './snapshot/snapshotSettings'
export {
  applyTotalPointsToParticipants,
  sortParticipantsByJoinOrder,
} from './snapshot/snapshotParticipants'

export type NormalizedRoomSnapshotResult = {
  roomSnapshot: RoomSnapshot
  ownSessionId: string
}

function isRoomState(value: unknown): value is RoomState {
  return value === 'LOBBY' || value === 'RUNNING' || value === 'RESULT'
}

function normalizeSnapshotRoomType(
  value: unknown,
  fallback: RoomSnapshot['roomType'],
): RoomSnapshot['roomType'] {
  if (value === 'PRIVATE' || value === 'private' || value === 1) {
    return 'PRIVATE'
  }

  if (value === 'RANDOM' || value === 'random' || value === 0) {
    return 'RANDOM'
  }

  return fallback
}

function readSnapshotRoomTypeValue(payload: Record<string, unknown>): unknown {
  return payload.rt
}

function normalizeSnapshotRoomState(
  rawRoomState: unknown,
  snapshotGame: Record<string, unknown> | null,
): RoomState {
  if (isRoomState(rawRoomState)) {
    return rawRoomState
  }

  const gamePhase = snapshotGame ? readNonEmptyString(snapshotGame.gp) : undefined
  if (gamePhase === 'PLAYING') {
    return 'RUNNING'
  }

  if (gamePhase === 'GAME_RESULT') {
    return 'RESULT'
  }

  return 'LOBBY'
}

function isPrivilegedViewerForTurn(currentTurn: TurnSummary | null, ownSessionId: string) {
  if (!currentTurn) {
    return false
  }

  return (
    currentTurn.drawerSessionId === ownSessionId ||
    currentTurn.correctSessionIds.includes(ownSessionId)
  )
}

function isPrivilegedSenderForTurn(currentTurn: TurnSummary | null, senderSessionId?: string) {
  if (!currentTurn || !senderSessionId) {
    return false
  }

  return (
    currentTurn.drawerSessionId === senderSessionId ||
    currentTurn.correctSessionIds.includes(senderSessionId)
  )
}

export function resolvePrivilegedChatVisibility(
  tone: ChatMessage['tone'],
  currentTurn: TurnSummary | null,
  ownSessionId: string,
  senderSessionId?: string,
) {
  if (tone === 'sealed') {
    return true
  }

  return (
    isPrivilegedViewerForTurn(currentTurn, ownSessionId) &&
    isPrivilegedSenderForTurn(currentTurn, senderSessionId)
  )
}

function resolveOwnSessionIdFromSnapshotPayload(
  payload: Record<string, unknown>,
  participants: Participant[],
  state: AppState,
): string {
  const explicitSessionId = readNonEmptyString(payload.sid)

  if (explicitSessionId) {
    return explicitSessionId
  }

  if (participants.some((participant) => participant.sessionId === state.session.sessionId)) {
    return state.session.sessionId
  }

  const sameNicknameParticipants = participants.filter(
    (participant) => participant.nickname === state.session.nickname,
  )
  if (sameNicknameParticipants.length === 1) {
    return sameNicknameParticipants[0].sessionId
  }

  return state.session.sessionId
}

export function normalizeRoomSnapshotPayload(
  payload: unknown,
  state: AppState,
): NormalizedRoomSnapshotResult | null {
  if (!isRecord(payload)) {
    return null
  }

  const hostSessionId = readNonEmptyString(payload.hs) ?? ''
  const snapshotGame = isRecord(payload.g) ? payload.g : null
  const roomState = normalizeSnapshotRoomState(undefined, snapshotGame)
  const participants = normalizeParticipants(payload.ps, hostSessionId, roomState)
  const ownSessionId = resolveOwnSessionIdFromSnapshotPayload(payload, participants, state)
  const rawSettings = readRawSettingsPayload(payload)
  const settings =
    rawSettings === undefined
      ? state.room.settings
      : normalizeGameSettings(rawSettings, state.room.settings)
  const serverNowMs = readFiniteNumber(payload.now)
  const deadlineAtMs = readFiniteNumber(payload.dl)
  const currentCanvasStrokes = normalizeSnapshotCanvasStrokes(payload.cv)
  const inferredCurrentRound = snapshotGame
    ? normalizeCurrentRound(snapshotGame, settings)
    : null
  const currentRound = roomState === 'LOBBY' ? null : inferredCurrentRound
  const inferredCurrentTurn = snapshotGame
    ? normalizeCurrentTurn(snapshotGame, settings, participants, currentRound)
    : null
  const currentTurn = roomState === 'LOBBY' ? null : inferredCurrentTurn
  const preservedTurnCanvasStrokes =
    currentTurn &&
    !currentCanvasStrokes &&
    state.room.currentTurn?.turnId === currentTurn.turnId
      ? state.room.currentTurn.canvasStrokes
      : undefined
  const normalizedCurrentTurn = currentTurn
    ? {
        ...currentTurn,
        ...(serverNowMs !== undefined &&
        deadlineAtMs !== undefined &&
        (currentTurn.phase === 'DRAWING' || currentTurn.phase === 'WORD_CHOICE')
          ? {
              deadlineAtMs: Date.now() + Math.max(0, deadlineAtMs - serverNowMs),
              remainingSec: Math.max(0, Math.ceil((deadlineAtMs - serverNowMs) / 1000)),
            }
          : {}),
        canvasStrokes: currentCanvasStrokes ?? preservedTurnCanvasStrokes ?? currentTurn.canvasStrokes,
      }
    : null
  const lobbyCanvasStrokes = currentCanvasStrokes ?? state.room.lobbyCanvasStrokes ?? []
  const snapshotTotalPoints = snapshotGame
    ? readPointsMap(snapshotGame.pts)
    : {}
  const normalizedParticipants = applyTotalPointsToParticipants(participants, snapshotTotalPoints)
  const chat = state.room.chat

  return {
    ownSessionId,
    roomSnapshot: {
      ...state.room,
      roomId: state.room.roomId,
      roomCode: readNonEmptyString(payload.rc) ?? '',
      roomType: normalizeSnapshotRoomType(
        readSnapshotRoomTypeValue(payload),
        state.room.roomType,
      ),
      hostSessionId,
      participants: normalizedParticipants,
      lobbyCanvasStrokes,
      settings,
      roomState,
      gameId:
        roomState === 'LOBBY'
          ? null
          : snapshotGame
            ? readNonEmptyString(snapshotGame.gid) ?? null
            : null,
      gameStartRemainingSec: undefined,
      gameStartDeadlineAtMs: undefined,
      roundStartRemainingSec: undefined,
      roundStartDeadlineAtMs: undefined,
      resultRemainingSec: undefined,
      resultDeadlineAtMs: undefined,
      currentRound,
      currentTurn: normalizedCurrentTurn,
      chat,
    },
  }
}

export function decodeSnapshotEnvelopePayload(
  payload: unknown,
  state: AppState,
): NormalizedRoomSnapshotResult | null {
  if (!isRecord(payload)) {
    return null
  }

  const explicitSessionId = readNonEmptyString(payload.sid)
  const snapshotPayload = isRecord(payload.s) ? payload.s : null
  const normalized = normalizeRoomSnapshotPayload(snapshotPayload, state)

  if (!normalized) {
    return null
  }

  return {
    roomSnapshot: normalized.roomSnapshot,
    ownSessionId: explicitSessionId ?? normalized.ownSessionId,
  }
}
