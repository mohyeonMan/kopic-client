export function isCanvasClearPayload(payload: unknown) {
  if (Array.isArray(payload) && payload.length > 0 && payload[0] === 3) {
    return true
  }

  return false
}
