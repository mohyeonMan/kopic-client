export function isCanvasClearPayload(payload: unknown) {
  if (Array.isArray(payload) && payload.length > 0 && payload[0] === 3) {
    return true
  }

  return false
}

export function decodeCanvasClearCid(payload: unknown) {
  if (
    Array.isArray(payload) &&
    payload[0] === 3 &&
    typeof payload[3] === 'string' &&
    payload[3].trim().length > 0
  ) {
    return payload[3].trim()
  }

  return undefined
}

export function decodeCanvasUndoPayload(payload: unknown) {
  if (
    Array.isArray(payload) &&
    payload[0] === 4 &&
    typeof payload[3] === 'string' &&
    payload[3].trim().length > 0
  ) {
    return payload[3].trim()
  }

  return null
}
