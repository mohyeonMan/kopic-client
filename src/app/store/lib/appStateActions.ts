import type {
  AppState,
  GameSettings,
} from '../../../entities/game/model'
import type {
  AppActions,
  AppStateContextValue,
} from '../appStateContextValue'
import {
  createCanvasClearMarker,
  createCanvasRedoMarker,
  createCanvasUndoMarker,
  createSystemMessage,
  encodeCompactGameSettings,
  encodeCompactStroke,
} from '@/entities/game/api/gameProtocol'
import { createMockGameStartedPayload } from '@/entities/game/model/gameFlow'
import { createUUID } from '@/shared/lib/createUUID'
import type { AppAction } from './appStateReducer'
import type { SendClientEvent } from '@/features/game-session/model/useClientEventSender'

type CreateAppActionsArgs = {
  clearInboundStrokeQueue: () => void
  dispatch: (action: AppAction) => void
  flushInboundStrokeQueue: () => void
  getState: () => AppState
  sendClientEvent: SendClientEvent
  server: AppStateContextValue['server']
}

export function createAppActions({
  clearInboundStrokeQueue,
  dispatch,
  flushInboundStrokeQueue,
  getState,
  sendClientEvent,
  server,
}: CreateAppActionsArgs): AppActions {
  return {
    updateNickname: (nickname) =>
      dispatch({ type: 'local/sessionNicknameUpdated', payload: nickname }),
    requestJoin: (options) => {
      const state = getState()
      if (state.session.joinPending || state.session.joinAccepted) {
        return
      }

      const normalizedRoomCode = options?.roomCode?.trim()
      dispatch({
        type: 'local/joinRequested',
        payload: {
          roomCode: normalizedRoomCode && normalizedRoomCode.length > 0 ? normalizedRoomCode : undefined,
          action: options?.action === 1 ? 1 : 0,
        },
      })
    },
    dismissJoinError: () => {
      dispatch({ type: 'local/joinErrorDismissed' })
    },
    dismissConnectionError: () => {
      dispatch({ type: 'local/connectionErrorDismissed' })
    },
    dismissActionError: () => {
      dispatch({ type: 'local/actionErrorDismissed' })
    },
    clearRoomCache: () => {
      clearInboundStrokeQueue()
      dispatch({ type: 'local/roomCacheCleared' })
    },
    patchLobbySettings: (settings) => {
      const state = getState()
      if (state.room.hostSessionId !== state.session.sessionId) {
        return
      }

      dispatch({ type: 'local/lobbySettingsPatched', payload: settings })

      const nextSettings: GameSettings = {
        ...state.room.settings,
        ...settings,
      }

      sendClientEvent('GAME_SETTINGS_UPDATE_REQUEST', encodeCompactGameSettings(nextSettings))
    },
    requestGameStart: () => {
      sendClientEvent(
        'GAME_START_REQUEST',
        {},
        () => server.applyGameStarted(createMockGameStartedPayload(getState())),
      )
    },
    requestWordChoice: (choiceIndex) => {
      const state = getState()
      const wordChoices = state.room.currentTurn?.wordChoices ?? []
      const normalizedChoiceIndex =
        Number.isFinite(choiceIndex) && choiceIndex >= 0
          ? Math.floor(choiceIndex)
          : 0
      const selectedWord =
        wordChoices[normalizedChoiceIndex] ??
        wordChoices[0] ??
        ''

      sendClientEvent(
        'WORD_CHOICE',
        { ci: normalizedChoiceIndex },
        () =>
          server.applyWordChoice({
            selectedWord,
            remainingSec: getState().room.settings.drawSec,
            chatMessage: createSystemMessage(`404 DRAWING_STARTED (${selectedWord})`),
          }),
      )
    },
    submitGuess: (text) => {
      dispatch({ type: 'local/guessSubmitted', payload: text })
      sendClientEvent('GUESS_SUBMIT', { t: text })
    },
    sendCanvasStroke: (stroke) => {
      sendClientEvent('DRAW_STROKE', encodeCompactStroke(stroke))
    },
    requestCanvasUndo: (cid) => {
      const normalizedCid = cid.trim()
      if (!normalizedCid) {
        return
      }

      dispatch({ type: 'server/canvasStrokeUndone', payload: normalizedCid })
      sendClientEvent('DRAW_STROKE', createCanvasUndoMarker(normalizedCid))
    },
    requestCanvasRedo: (cid) => {
      const normalizedCid = cid.trim()
      if (!normalizedCid) {
        return
      }

      dispatch({ type: 'server/canvasStrokeRedone', payload: normalizedCid })
      sendClientEvent('DRAW_STROKE', createCanvasRedoMarker(normalizedCid))
    },
    requestCanvasClear: () => {
      const cid = `cid_${createUUID().replaceAll('-', '').slice(0, 6)}`

      flushInboundStrokeQueue()
      server.applyCanvasClear(cid)
      sendClientEvent('DRAW_STROKE', createCanvasClearMarker(cid))
    },
  }
}
