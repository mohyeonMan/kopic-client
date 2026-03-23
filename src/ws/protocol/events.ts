export const clientEventMeta = [
  { code: 105, name: 'GAME_START_REQUEST' },
  { code: 106, name: 'GAME_SNAPSHOT_REQUEST' },
  { code: 107, name: 'GAME_SETTINGS_UPDATE_REQUEST' },
  { code: 201, name: 'DRAW_STROKE' },
  { code: 202, name: 'DRAW_CLEAR' },
  { code: 204, name: 'GUESS_SUBMIT' },
  { code: 205, name: 'WORD_CHOICE' },
] as const

export const serverEventMeta = [
  { code: 301, name: 'ROOM_JOINED' },
  { code: 302, name: 'GAME_STARTED' },
  { code: 303, name: 'ROUND_STARTED' },
  { code: 304, name: 'TURN_STARTED' },
  { code: 305, name: 'TURN_ENDED' },
  { code: 306, name: 'ROUND_ENDED' },
  { code: 307, name: 'GAME_ENDED' },
  { code: 308, name: 'GAME_SETTINGS_UPDATED' },
  { code: 310, name: 'DRAWING_STARTED' },
  { code: 311, name: 'TURN_STATE' },
  { code: 401, name: 'CANVAS_STROKE' },
  { code: 402, name: 'CANVAS_CLEAR' },
  { code: 403, name: 'GUESS_MESSAGE' },
  { code: 404, name: 'GUESS_CORRECT' },
  { code: 406, name: 'WORD_CHOICES' },
  { code: 408, name: 'GAME_SNAPSHOT' },
] as const

export type ClientEventCode = (typeof clientEventMeta)[number]['code']
export type ServerEventCode = (typeof serverEventMeta)[number]['code']

export type Envelope<TPayload, TCode extends number> = {
  e: TCode
  p: TPayload
  rid?: string
}
