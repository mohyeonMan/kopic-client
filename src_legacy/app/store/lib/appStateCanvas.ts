import type { AppState, CanvasStroke } from '../../../entities/game/model'
import { createSystemMessage } from './appStateHelpers'

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

export function reduceCanvasCleared(state: AppState): AppState {
  if (!state.room.currentTurn) {
    return {
      ...state,
      room: {
        ...state.room,
        lobbyCanvasStrokes: [],
      },
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
      chat: [...state.room.chat, createSystemMessage('402 CANVAS_CLEAR')],
    },
  }
}
