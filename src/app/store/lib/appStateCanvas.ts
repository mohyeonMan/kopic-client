import type { AppState, CanvasStroke } from '../../../entities/game/model'
import { createSystemMessage } from '@/entities/game/api/gameProtocol'
import { DEFAULT_CANVAS_COLOR, appendGameSoundEvent } from '@/entities/game/model'
import { createUUID } from '@/shared/lib/createUUID'

function createCanvasClearStroke(cid?: string): CanvasStroke {
  return {
    id: createUUID(),
    ...(cid ? { cid } : {}),
    clear: true,
    tool: 'PEN',
    color: DEFAULT_CANVAS_COLOR,
    points: [],
  }
}

function removeLatestCanvasCid(strokes: CanvasStroke[], cid: string): CanvasStroke[] {
  let startIndex = -1
  let endIndex = -1

  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    if (strokes[index].cid === cid) {
      if (endIndex === -1) {
        endIndex = index
      }
      startIndex = index
      continue
    }

    if (endIndex !== -1) {
      break
    }
  }

  if (startIndex === -1) {
    return strokes
  }

  const nextStrokes = strokes.slice()
  nextStrokes.splice(startIndex, endIndex - startIndex + 1)
  return nextStrokes
}

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
    const currentStrokes = state.room.lobbyCanvasStrokes ?? []
    const nextStrokes = removeLatestCanvasCid(currentStrokes, cid)
    if (nextStrokes === currentStrokes) {
      return state
    }

    return {
      ...state,
      room: {
        ...state.room,
        lobbyCanvasStrokes: nextStrokes,
      },
    }
  }

  const currentStrokes = state.room.currentTurn.canvasStrokes
  const nextStrokes = removeLatestCanvasCid(currentStrokes, cid)
  if (nextStrokes === currentStrokes) {
    return state
  }

  return {
    ...state,
    room: {
      ...state.room,
      currentTurn: {
        ...state.room.currentTurn,
        canvasStrokes: nextStrokes,
      },
    },
  }
}

export function reduceCanvasCleared(state: AppState, cid?: string): AppState {
  const clearStroke = createCanvasClearStroke(cid)

  if (!state.room.currentTurn) {
    return {
      ...state,
      room: {
        ...state.room,
        lobbyCanvasStrokes: [...(state.room.lobbyCanvasStrokes ?? []), clearStroke],
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
        canvasStrokes: [...state.room.currentTurn.canvasStrokes, clearStroke],
      },
      chat: [...state.room.chat, createSystemMessage('406 CANVAS_CLEAR')],
    },
    soundEvents: appendGameSoundEvent(state.soundEvents, {
      id: `canvas:${state.room.currentTurn.turnId}:clear:${createUUID()}`,
      sound: 'clearAll',
    }),
  }
}
