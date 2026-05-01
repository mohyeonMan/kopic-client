import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import {
  type AppState,
  type CanvasStroke,
  initialAppState,
  type GameSettings,
} from '../../entities/game/model'
import { wsSessionManager } from '../../ws/client/wsSessionManager'
import {
  clientEventMeta,
  type ClientEventCode,
  type Envelope,
} from '../../ws/protocol/events'
import {
  AppActionsContext,
  AppSessionStateContext,
  AppShellStateContext,
  AppStateContext,
  type AppActions,
  type AppConnectionControls,
  type AppDevTools,
  type AppShellState,
  type AppStateContextValue,
} from './appStateContextValue'
import {
  CANVAS_CLEAR_MARKER,
  createSystemMessage,
  encodeCompactGameSettings,
  encodeCompactStroke,
} from './lib/appStateHelpers'
import { createLobbySnapshot, createMockGameStartedPayload } from './lib/appStateFlow'
import {
  type AppAction,
  appStateReducer,
} from './lib/appStateReducer'
import { decodeConnectionErrorPayload } from './lib/appStatePayloadDecoders'
import {
  createServerEnvelopeHandler,
  decodeInboundEnvelope,
} from './lib/appStateWsAdapter'

type ClientEventName = (typeof clientEventMeta)[number]['name']

const clientEventCodeByName = new Map<ClientEventName, ClientEventCode>(
  clientEventMeta.map((event) => [event.name, event.code]),
)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState)
  const stateRef = useRef<AppState>(state)
  const inboundStrokeQueueRef = useRef<CanvasStroke[]>([])
  const inboundStrokeFlushRafRef = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const server = useMemo<AppStateContextValue['server']>(
    () => ({
      applyRoomSnapshot: (snapshot) => dispatch({ type: 'server/roomSnapshotApplied', payload: snapshot }),
      applyGameStarted: (payload) => dispatch({ type: 'server/gameStartedApplied', payload }),
      applyWordChoice: (payload) => dispatch({ type: 'server/wordChoiceApplied', payload }),
      applyCanvasStroke: (stroke) => dispatch({ type: 'server/canvasStrokeReceived', payload: stroke }),
      applyCanvasClear: () => dispatch({ type: 'server/canvasCleared' }),
      applyGameEnded: () => dispatch({ type: 'server/gameEndedApplied' }),
    }),
    [],
  )

  const flushInboundStrokeQueue = useCallback(() => {
    inboundStrokeFlushRafRef.current = null
    const pending = inboundStrokeQueueRef.current
    if (pending.length === 0) {
      return
    }

    inboundStrokeQueueRef.current = []
    dispatch({ type: 'server/canvasStrokesReceived', payload: pending })
  }, [])

  const clearInboundStrokeQueue = useCallback(() => {
    inboundStrokeQueueRef.current = []
    if (inboundStrokeFlushRafRef.current !== null) {
      window.cancelAnimationFrame(inboundStrokeFlushRafRef.current)
      inboundStrokeFlushRafRef.current = null
    }
  }, [])

  const enqueueInboundStroke = useCallback(
    (stroke: CanvasStroke) => {
      inboundStrokeQueueRef.current.push(stroke)

      if (inboundStrokeFlushRafRef.current !== null) {
        return
      }

      inboundStrokeFlushRafRef.current = window.requestAnimationFrame(flushInboundStrokeQueue)
    },
    [flushInboundStrokeQueue],
  )

  const handleServerEnvelope = useMemo(
    () =>
      createServerEnvelopeHandler({
        clearInboundStrokeQueue,
        dispatch: dispatch as (action: AppAction) => void,
        enqueueInboundStroke,
        server,
        stateRef,
      }),
    [clearInboundStrokeQueue, enqueueInboundStroke, server],
  )

  useEffect(() => {
    return () => {
      clearInboundStrokeQueue()
    }
  }, [clearInboundStrokeQueue])

  const sendClientEvent = useCallback(
    <TPayload,>(eventName: ClientEventName, payload: TPayload, fallback?: () => void) => {
      const code = clientEventCodeByName.get(eventName)

      if (!code) {
        fallback?.()
        return
      }

      const envelope: Envelope<TPayload, ClientEventCode> = {
        e: code,
        p: payload,
      }

      const sent = wsSessionManager.send(JSON.stringify(envelope))
      if (!sent) {
        console.warn('[ws:out] dropped (socket not open)', { eventName, payload })
        fallback?.()
      }
    },
    [],
  )

  const actions = useMemo<AppActions>(
    () => ({
      updateNickname: (nickname) =>
        dispatch({ type: 'local/sessionNicknameUpdated', payload: nickname }),
      requestJoin: (options) => {
        if (stateRef.current.session.joinPending || stateRef.current.session.joinAccepted) {
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
      clearRoomCache: () => {
        clearInboundStrokeQueue()
        dispatch({ type: 'local/roomCacheCleared' })
      },
      patchLobbySettings: (settings) => {
        if (stateRef.current.room.hostSessionId !== stateRef.current.session.sessionId) {
          return
        }

        dispatch({ type: 'local/lobbySettingsPatched', payload: settings })

        const nextSettings: GameSettings = {
          ...stateRef.current.room.settings,
          ...settings,
        }

        sendClientEvent('GAME_SETTINGS_UPDATE_REQUEST', encodeCompactGameSettings(nextSettings))
      },
      requestGameStart: () => {
        sendClientEvent(
          'GAME_START_REQUEST',
          {},
          () => server.applyGameStarted(createMockGameStartedPayload(stateRef.current)),
        )
      },
      requestWordChoice: (word) => {
        const wordChoices = stateRef.current.room.currentTurn?.wordChoices ?? []
        const choiceIndex = wordChoices.findIndex((candidate) => candidate === word)

        sendClientEvent(
          'WORD_CHOICE',
          { choiceIndex: choiceIndex >= 0 ? choiceIndex : 0 },
          () =>
            server.applyWordChoice({
              selectedWord: word,
              remainingSec: stateRef.current.room.settings.drawSec,
              chatMessage: createSystemMessage(`310 DRAWING_STARTED (${word})`),
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
      requestCanvasClear: () => {
        clearInboundStrokeQueue()
        server.applyCanvasClear()
        sendClientEvent('DRAW_STROKE', CANVAS_CLEAR_MARKER)
      },
    }),
    [clearInboundStrokeQueue, sendClientEvent, server],
  )

  const connection = useMemo<AppConnectionControls>(
    () => ({
      setStatus: (status) => dispatch({ type: 'connection/statusChanged', payload: status }),
    }),
    [],
  )

  const devTools = useMemo<AppDevTools>(
    () => ({
      forceTurnPhase: (phase) => dispatch({ type: 'dev/turnPhaseForced', payload: phase }),
      advanceMockFlow: () => dispatch({ type: 'dev/mockFlowAdvanced' }),
      finishGame: () => {
        server.applyGameEnded()
      },
      resetToLobby: () => {
        server.applyRoomSnapshot(createLobbySnapshot(stateRef.current))
      },
    }),
    [server],
  )

  const shellState = useMemo<AppShellState>(
    () => ({
      roomCode: state.room.roomCode,
      joinAction: state.session.joinAction,
      joinRoomCode: state.session.joinRoomCode,
    }),
    [state.room.roomCode, state.session.joinAction, state.session.joinRoomCode],
  )

  useEffect(() => {
    const unsubscribe = wsSessionManager.subscribe((event) => {
      if (event.type === 'status') {
        dispatch({ type: 'connection/statusChanged', payload: event.status })
        return
      }

      if (event.type === 'error') {
        const connectionError = decodeConnectionErrorPayload(event.error)
        if (connectionError) {
          clearInboundStrokeQueue()
          dispatch({ type: 'local/connectionErrorReported', payload: connectionError })
        }
        return
      }

      try {
        const parsed = decodeInboundEnvelope(event.data)
        if (!parsed) {
          return
        }

        handleServerEnvelope(parsed)
      } catch (error) {
        console.error('[ws:in] invalid payload', error)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [clearInboundStrokeQueue, handleServerEnvelope])

  const value = useMemo<AppStateContextValue>(() => {
    return {
      state,
      actions,
      connection,
      server,
      devTools,
    }
  }, [actions, connection, devTools, server, state])

  return (
    <AppActionsContext.Provider value={actions}>
      <AppSessionStateContext.Provider value={state.session}>
        <AppShellStateContext.Provider value={shellState}>
          <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
        </AppShellStateContext.Provider>
      </AppSessionStateContext.Provider>
    </AppActionsContext.Provider>
  )
}
