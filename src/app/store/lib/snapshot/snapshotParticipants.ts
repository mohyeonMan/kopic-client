import type {
  Participant,
  RoomState,
} from '../../../../entities/game/model'
import {
  isRecord,
  normalizeParticipantColorIndex,
  readNonEmptyString,
} from '../appStateHelpers'

export function sortParticipantsByJoinOrder(participants: Participant[]): Participant[] {
  return participants
    .slice()
    .sort((left, right) => {
      if (left.joinOrder !== right.joinOrder) {
        return left.joinOrder - right.joinOrder
      }

      return left.sessionId.localeCompare(right.sessionId)
    })
}

export function normalizeParticipants(
  raw: unknown,
  hostSessionId: string,
  roomState: RoomState,
): Participant[] {
  const rawParticipants: Record<string, unknown>[] = isRecord(raw)
    ? Object.entries(raw).map(([sessionId, participant]) =>
        isRecord(participant) ? { ...participant, sid: sessionId } : { sid: sessionId },
      )
    : []

  const nextParticipants: Participant[] = []
  const knownSessionIds = new Set<string>()

  for (let index = 0; index < rawParticipants.length; index += 1) {
    const participant = rawParticipants[index]
    if (!isRecord(participant)) {
      continue
    }

    const sessionId = readNonEmptyString(participant.sid)
    if (!sessionId || knownSessionIds.has(sessionId)) {
      continue
    }

    knownSessionIds.add(sessionId)

    nextParticipants.push({
      sessionId,
      nickname: readNonEmptyString(participant.n) ?? `Guest${index + 1}`,
      colorIndex:
        normalizeParticipantColorIndex(participant.ci),
      isHost: sessionId === hostSessionId,
      score: 0,
      isOnline: true,
      joinOrder: index + 1,
      joinedMidRound: roomState === 'RUNNING',
    })
  }

  return sortParticipantsByJoinOrder(nextParticipants)
}

export function applyTotalPointsToParticipants(
  participants: Participant[],
  totalPoints: Record<string, number>,
): Participant[] {
  if (Object.keys(totalPoints).length === 0) {
    return participants
  }

  return participants.map((participant) => ({
    ...participant,
    score: totalPoints[participant.sessionId] ?? participant.score,
  }))
}
