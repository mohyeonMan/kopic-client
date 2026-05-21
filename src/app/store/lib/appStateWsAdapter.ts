import type { AppState, CanvasStroke } from '../../../entities/game/model'
import type {
  AppStateContextValue,
} from '../appStateContextValue'
import type { AppAction } from './appStateReducer'
import {
  decodeCompactStroke,
  decodeGuessSubmittedMessage,
} from '@/entities/game/api/gameProtocol'
import {
  decodeGeDrawingStartedPayload,
  decodeGeGameResultPayload,
  decodeGeGameStartedPayload,
  decodeGeHintRevealedPayload,
  decodeGeGuessCorrectPayload,
  decodeGeReturnToLobbyPayload,
  decodeGeRoundStartedPayload,
  decodeGeTurnEndedPayload,
  decodeGeTurnStartedPayload,
  decodeGeWordChoiceOpenedPayload,
  decodeRoomJoinedPayload,
  decodeRoomLeftPayload,
  decodeServerErrorPayload,
  isCanvasClearPayload,
} from '@/entities/game/api/gamePayloadDecoders'
import {
  decodeSettingsUpdatePayload,
  decodeSnapshotEnvelopePayload,
} from '@/entities/game/api/roomSnapshotPayload'
import type { Envelope } from '@/features/game-session/api/gameSessionEvents'

type EnvelopeHandlerOptions = {
  clearInboundStrokeQueue: () => void
  dispatch: (action: AppAction) => void
  enqueueInboundStroke: (stroke: CanvasStroke) => void
  getState: () => AppState
  server: AppStateContextValue['server']
}

const SERVER_ERROR_EVENT_CODES = new Set([1901, 1902, 1903, 1910, 1911, 1920, 1930, 1940, 1941, 1999])

function isFatalRoomErrorCode(eventCode: number) {
  return eventCode === 1910 || eventCode === 1941
}

export function createServerEnvelopeHandler({
  clearInboundStrokeQueue,
  dispatch,
  enqueueInboundStroke,
  getState,
  server,
}: EnvelopeHandlerOptions) {
  return (envelope: Envelope<unknown, number>) => {
    const payload = envelope.p
    if (SERVER_ERROR_EVENT_CODES.has(envelope.e)) {
      const errorPayload = decodeServerErrorPayload(payload, envelope.e)
      const state = getState()
      if (state.session.joinPending && !state.session.joinAccepted) {
        clearInboundStrokeQueue()
        dispatch({ type: 'local/joinFailed', payload: errorPayload })
        return
      }

      if (isFatalRoomErrorCode(envelope.e)) {
        clearInboundStrokeQueue()
        dispatch({ type: 'local/connectionErrorReported', payload: errorPayload })
        return
      }

      dispatch({ type: 'local/actionErrorReported', payload: errorPayload })
      return
    }

    switch (envelope.e) {
      case 400: {
        const gameStartedPayload = decodeGeGameStartedPayload(payload)
        if (gameStartedPayload) {
          dispatch({ type: 'server/geGameStartedApplied', payload: gameStartedPayload })
        }
        return
      }
      case 401: {
        const roundStartedPayload = decodeGeRoundStartedPayload(payload)
        if (roundStartedPayload) {
          dispatch({ type: 'server/geRoundStartedApplied', payload: roundStartedPayload })
        }
        return
      }
      case 402: {
        const turnStartedPayload = decodeGeTurnStartedPayload(payload)
        if (turnStartedPayload) {
          dispatch({ type: 'server/geTurnStartedApplied', payload: turnStartedPayload })
        }
        return
      }
      case 408: {
        const guessCorrectPayload = decodeGeGuessCorrectPayload(payload)
        if (guessCorrectPayload) {
          dispatch({ type: 'server/geGuessCorrectApplied', payload: guessCorrectPayload })
        }
        return
      }
      case 403: {
        const wordChoiceOpenedPayload = decodeGeWordChoiceOpenedPayload(payload)
        if (wordChoiceOpenedPayload) {
          dispatch({ type: 'server/geWordChoiceOpenedApplied', payload: wordChoiceOpenedPayload })
        }
        return
      }
      case 404: {
        const drawingStartedPayload = decodeGeDrawingStartedPayload(payload)
        if (drawingStartedPayload) {
          dispatch({ type: 'server/geDrawingStartedApplied', payload: drawingStartedPayload })
        }
        return
      }
      case 409: {
        const hintRevealedPayload = decodeGeHintRevealedPayload(payload)
        if (hintRevealedPayload) {
          dispatch({ type: 'server/geHintRevealedApplied', payload: hintRevealedPayload })
        }
        return
      }
      case 410: {
        const turnEndedPayload = decodeGeTurnEndedPayload(payload)
        if (turnEndedPayload) {
          dispatch({ type: 'server/geTurnEndedApplied', payload: turnEndedPayload })
        }
        return
      }
      case 411: {
        const gameResultPayload = decodeGeGameResultPayload(payload)
        if (gameResultPayload) {
          dispatch({ type: 'server/geGameResultApplied', payload: gameResultPayload })
        }
        return
      }
      case 412: {
        clearInboundStrokeQueue()
        const returnToLobbyPayload = decodeGeReturnToLobbyPayload(payload)
        if (returnToLobbyPayload) {
          dispatch({ type: 'server/geReturnToLobbyApplied', payload: returnToLobbyPayload })
        }
        return
      }
      case 300:
      case 304:
        if (payload && typeof payload === 'object') {
          const state = getState()
          const normalizedRoomSnapshot = decodeSnapshotEnvelopePayload(payload, state)
          if (normalizedRoomSnapshot) {
            if (normalizedRoomSnapshot.ownSessionId !== state.session.sessionId) {
              dispatch({
                type: 'local/sessionIdSynced',
                payload: normalizedRoomSnapshot.ownSessionId,
              })
            }
            dispatch({ type: 'local/joinAccepted' })
            server.applyRoomSnapshot(normalizedRoomSnapshot.roomSnapshot)
          }
        }
        return
      case 301: {
        const roomJoinedPayload = decodeRoomJoinedPayload(payload)
        if (roomJoinedPayload) {
          dispatch({ type: 'server/roomJoinedApplied', payload: roomJoinedPayload })
        }
        return
      }
      case 302: {
        const roomLeftPayload = decodeRoomLeftPayload(payload)
        if (roomLeftPayload) {
          dispatch({ type: 'server/roomLeftApplied', payload: roomLeftPayload })
        }
        return
      }
      case 303: {
        const nextSettings = decodeSettingsUpdatePayload(payload, getState().room.settings)
        if (nextSettings) {
          dispatch({ type: 'local/lobbySettingsPatched', payload: nextSettings })
        }
        return
      }
      case 407: {
        const guessMessage = decodeGuessSubmittedMessage(payload)
        if (guessMessage) {
          dispatch({ type: 'server/chatReceived', payload: guessMessage })
        }
        return
      }
      case 405:
        if (isCanvasClearPayload(payload)) {
          clearInboundStrokeQueue()
          server.applyCanvasClear()
          return
        }

        {
          const stroke = decodeCompactStroke(payload)
          if (stroke) {
            enqueueInboundStroke(stroke)
          }
        }
        return
      case 406:
        clearInboundStrokeQueue()
        server.applyCanvasClear()
        return
      case 413:
        server.applyGameEnded()
        return
      default:
        return
    }
  }
}
