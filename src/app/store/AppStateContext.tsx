import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import {
  type AppState,
  initialAppState,
} from '../../entities/game/model'
import {
  AppActionsContext,
  AppSessionStateContext,
  AppShellStateContext,
  AppStateContext,
  type AppConnectionControls,
  type AppDevTools,
  type AppShellState,
  type AppStateContextValue,
} from './appStateContextValue'
import { createLobbySnapshot } from '@/entities/game/model/gameFlow'
import {
  type AppAction,
  appStateReducer,
} from './lib/appStateReducer'
import { createServerEnvelopeHandler } from './lib/appStateWsAdapter'
import { createAppActions } from './lib/appStateActions'
import { useClientEventSender } from '@/features/game-session/model/useClientEventSender'
import { useInboundStrokeQueue } from '@/features/game-session/model/useInboundStrokeQueue'
import { useWsSessionSubscription } from '@/features/game-session/model/useWsSessionSubscription'

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState)
  const stateRef = useRef<AppState>(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const getState = useCallback(() => stateRef.current, [])

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

  const sendClientEvent = useClientEventSender()
  const {
    clearInboundStrokeQueue,
    enqueueInboundStroke,
  } = useInboundStrokeQueue(dispatch)

  const handleServerEnvelope = useMemo(
    () =>
      createServerEnvelopeHandler({
        clearInboundStrokeQueue,
        dispatch: dispatch as (action: AppAction) => void,
        enqueueInboundStroke,
        getState,
        server,
      }),
    [clearInboundStrokeQueue, enqueueInboundStroke, getState, server],
  )

  const actions = useMemo(
    () =>
      createAppActions({
        clearInboundStrokeQueue,
        dispatch,
        getState,
        sendClientEvent,
        server,
      }),
    [clearInboundStrokeQueue, getState, sendClientEvent, server],
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
      roomType: state.room.roomType,
      joinAction: state.session.joinAction,
      joinRoomCode: state.session.joinRoomCode,
    }),
    [state.room.roomCode, state.room.roomType, state.session.joinAction, state.session.joinRoomCode],
  )

  useWsSessionSubscription({
    clearInboundStrokeQueue,
    dispatch,
    handleServerEnvelope,
  })

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
