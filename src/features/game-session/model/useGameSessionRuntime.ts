/**
 * useGameSessionRuntime
 *
 * 책임:
 * - session store의 active join request를 감지해 WebSocket session lifecycle 소유
 * - game-session API event를 session/game entity store에 적용
 *
 * 하지 않는 것:
 * - entry form 상태 관리
 * - route navigation
 * - game board/chat UI 상태 소유
 *
 * side effect:
 * - active join request 발생 시 WebSocket 연결 생성
 * - runtime unmount 시 WebSocket 연결 해제
 */
import { useEffect, useRef } from 'react'
import { useGameStore } from '@/entities/game/model/gameStore'
import { useSessionStore } from '@/entities/session/model/sessionStore'
import { openGameSession } from '@/features/game-session/api/gameSessionApi'
import { bindGameSessionConnection } from '@/features/game-session/model/gameSessionCommandGateway'
import type { GameSessionConnection } from '@/features/game-session/model/gameSessionTypes'

function createJoinRequestKey(request: NonNullable<ReturnType<typeof useSessionStore.getState>['activeJoinRequest']>) {
  return `${request.nickname}\n${request.roomCode ?? ''}\n${request.action}`
}

export function useGameSessionRuntime() {
  const activeJoinRequest = useSessionStore((state) => state.activeJoinRequest)
  const acceptJoin = useSessionStore((state) => state.acceptJoin)
  const failJoin = useSessionStore((state) => state.failJoin)
  const reportConnectionError = useSessionStore((state) => state.reportConnectionError)
  const setConnectionStatus = useSessionStore((state) => state.setConnectionStatus)
  const applyRoomSnapshot = useGameStore((state) => state.applyRoomSnapshot)
  const applyParticipantJoined = useGameStore((state) => state.applyParticipantJoined)
  const applyParticipantLeft = useGameStore((state) => state.applyParticipantLeft)
  const applyCanvasStroke = useGameStore((state) => state.applyCanvasStroke)
  const appendChatMessage = useGameStore((state) => state.appendChatMessage)
  const clearCanvas = useGameStore((state) => state.clearCanvas)
  const applyGameStarted = useGameStore((state) => state.applyGameStarted)
  const applyRoundStarted = useGameStore((state) => state.applyRoundStarted)
  const applyTurnStarted = useGameStore((state) => state.applyTurnStarted)
  const applyWordChoiceOpened = useGameStore((state) => state.applyWordChoiceOpened)
  const applyDrawingStarted = useGameStore((state) => state.applyDrawingStarted)
  const applyGuessCorrect = useGameStore((state) => state.applyGuessCorrect)
  const applyTurnEnded = useGameStore((state) => state.applyTurnEnded)
  const applyGameResult = useGameStore((state) => state.applyGameResult)
  const applyReturnToLobby = useGameStore((state) => state.applyReturnToLobby)
  const resetRoom = useGameStore((state) => state.resetRoom)
  const connectionRef = useRef<GameSessionConnection | null>(null)
  const requestKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeJoinRequest) {
      return
    }

    const requestKey = createJoinRequestKey(activeJoinRequest)
    if (requestKeyRef.current === requestKey) {
      return
    }

    connectionRef.current?.close()
    bindGameSessionConnection(null)
    requestKeyRef.current = requestKey
    connectionRef.current = openGameSession({
      request: activeJoinRequest,
      onEvent: (event) => {
        if (event.type === 'connected') {
          setConnectionStatus('connected')
          return
        }

        if (event.type === 'session-synced') {
          applyRoomSnapshot(event.payload.roomSnapshot)
          acceptJoin({
            sessionId: event.payload.sessionId,
            roomCode: event.payload.roomCode,
          })
          return
        }

        if (event.type === 'canvas-stroke') {
          applyCanvasStroke(event.payload)
          return
        }

        if (event.type === 'canvas-cleared') {
          clearCanvas()
          return
        }

        if (event.type === 'chat-message') {
          appendChatMessage(event.payload)
          return
        }

        if (event.type === 'game-started') {
          applyGameStarted(event.payload)
          return
        }

        if (event.type === 'round-started') {
          applyRoundStarted(event.payload)
          return
        }

        if (event.type === 'turn-started') {
          applyTurnStarted(event.payload)
          return
        }

        if (event.type === 'word-choice-opened') {
          applyWordChoiceOpened(event.payload)
          return
        }

        if (event.type === 'drawing-started') {
          applyDrawingStarted(event.payload)
          return
        }

        if (event.type === 'guess-correct') {
          applyGuessCorrect(event.payload)
          return
        }

        if (event.type === 'turn-ended') {
          applyTurnEnded(event.payload)
          return
        }

        if (event.type === 'game-result') {
          applyGameResult(event.payload)
          return
        }

        if (event.type === 'return-to-lobby') {
          applyReturnToLobby(event.payload)
          return
        }

        if (event.type === 'participant-joined') {
          applyParticipantJoined(event.payload)
          return
        }

        if (event.type === 'participant-left') {
          applyParticipantLeft(event.payload)
          return
        }

        if (event.type === 'join-rejected') {
          connectionRef.current?.close()
          connectionRef.current = null
          requestKeyRef.current = null
          resetRoom()
          failJoin(event.error)
          return
        }

        resetRoom()
        reportConnectionError(event.error)
      },
    })
    bindGameSessionConnection(connectionRef.current)
  }, [
    acceptJoin,
    activeJoinRequest,
    applyCanvasStroke,
    applyDrawingStarted,
    applyGameResult,
    applyGameStarted,
    applyGuessCorrect,
    appendChatMessage,
    applyParticipantJoined,
    applyParticipantLeft,
    applyReturnToLobby,
    applyRoomSnapshot,
    applyRoundStarted,
    applyTurnEnded,
    applyTurnStarted,
    applyWordChoiceOpened,
    clearCanvas,
    failJoin,
    reportConnectionError,
    resetRoom,
    setConnectionStatus,
  ])

  useEffect(() => {
    return () => {
      connectionRef.current?.close()
      bindGameSessionConnection(null)
      connectionRef.current = null
      requestKeyRef.current = null
    }
  }, [])
}
