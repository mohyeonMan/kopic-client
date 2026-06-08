import type { AppState, CanvasStroke } from '../../../entities/game/model'
import { createSystemMessage } from '@/entities/game/api/gameProtocol'
import { appendGameSoundEvent } from '@/entities/game/model'
import { createUUID } from '@/shared/lib/createUUID'

export function reduceCanvasStrokeReceived(
  state: AppState,
  stroke: CanvasStroke,
): AppState {
  if (!state.room.currentTurn) {
    return {
      ...state,
      room: {
        ...state.room,
        lobbyCanvasStrokes: [...(state.room.lobbyCanvasStrokes ?? []), stroke],
      },
    }
  }

  return {
    ...state,
    room: {
      ...state.room,
      currentTurn: {
        ...state.room.currentTurn,
        canvasStrokes: [...state.room.currentTurn.canvasStrokes, stroke],
      },
    },
  }
}

export function reduceCanvasStrokesReceived(
  state: AppState,
  strokes: CanvasStroke[],
): AppState {
  if (strokes.length === 0) {
    return state
  }

  if (!state.room.currentTurn) {
    return {
      ...state,
      room: {
        ...state.room,
        lobbyCanvasStrokes: [...(state.room.lobbyCanvasStrokes ?? []), ...strokes],
      },
    }
  }

  return {
    ...state,
    room: {
      ...state.room,
      currentTurn: {
        ...state.room.currentTurn,
        canvasStrokes: [...state.room.currentTurn.canvasStrokes, ...strokes],
      },
    },
  }
}

export function reduceCanvasStrokeUndone(state: AppState, cid: string): AppState {
  if (!state.room.currentTurn) {
    return {
      ...state,
      room: {
        ...state.room,
        lobbyCanvasStrokes: (state.room.lobbyCanvasStrokes ?? []).filter((stroke) => stroke.cid !== cid),
      },
    }
  }

  return {
    ...state,
    room: {
      ...state.room,
      currentTurn: {
        ...state.room.currentTurn,
        canvasStrokes: state.room.currentTurn.canvasStrokes.filter((stroke) => stroke.cid !== cid),
      },
    },
  }
}

export function reduceCanvasCleared(state: AppState): AppState {
  if (!state.room.currentTurn) {
    return {
      ...state,
      room: {
        ...state.room,
        lobbyCanvasStrokes: [],
      },
      soundEvents: appendGameSoundEvent(state.soundEvents, {
        id: `canvas:lobby:clear:${createUUID()}`,
        sound: 'clearAll',
      }),
    }
  }

  return {
    ...state,
    room: {
      ...state.room,
      currentTurn: {
        ...state.room.currentTurn,
        canvasStrokes: [],
      },
      chat: [...state.room.chat, createSystemMessage('406 CANVAS_CLEAR')],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `canvas:${state.room.currentTurn.turnId}:clear:${createUUID()}`,
      sound: 'clearAll',
    }),
  }
}
