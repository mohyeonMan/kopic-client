export const clientEventMeta = [
  { code: 110, name: 'GAME_SETTINGS_UPDATE_REQUEST' },
  { code: 200, name: 'GAME_START_REQUEST' },
  { code: 104, name: 'GAME_SNAPSHOT_REQUEST' },
  { code: 201, name: 'DRAW_STROKE' },
  { code: 202, name: 'DRAW_CLEAR' },
  { code: 204, name: 'GUESS_SUBMIT' },
  { code: 203, name: 'WORD_CHOICE' },
] as const

export const serverEventMeta = [
  { code: 400, name: 'GE_GAME_STARTED' },
  { code: 401, name: 'GE_ROUND_STARTED' },
  { code: 402, name: 'GE_TURN_STARTED' },
  { code: 403, name: 'GE_WORD_CHOICE_OPEN' },
  { code: 404, name: 'GE_DRAWING_STARTED' },
  { code: 405, name: 'CANVAS_STROKE' },
  { code: 406, name: 'CANVAS_CLEAR' },
  { code: 407, name: 'GUESS_MESSAGE' },
  { code: 408, name: 'GE_GUESS_CORRECT' },
  { code: 409, name: 'GE_HINT_REVEALED' },
  { code: 410, name: 'GE_TURN_ENDED' },
  { code: 411, name: 'GE_GAME_RESULT' },
  { code: 412, name: 'GE_RETURN_TO_LOBBY' },
  { code: 413, name: 'GAME_ENDED' },
  { code: 301, name: 'ROOM_JOINED' },
  { code: 302, name: 'ROOM_LEFT' },
  { code: 303, name: 'GAME_SETTINGS_UPDATED' },
  { code: 304, name: 'GAME_SNAPSHOT' },
  { code: 1901, name: 'MISSING_ENVELOPE' },
  { code: 1902, name: 'UNSUPPORTED_EVENT' },
  { code: 1903, name: 'INVALID_REQUEST' },
  { code: 1910, name: 'ROOM_NOT_FOUND' },
  { code: 1911, name: 'ROOM_FULL' },
  { code: 1920, name: 'FORBIDDEN' },
  { code: 1930, name: 'CONFLICT' },
  { code: 1940, name: 'MAILBOX_FULL' },
  { code: 1941, name: 'ACTOR_INACTIVE' },
  { code: 1999, name: 'UNKNOWN_ERROR' },
] as const

export type ClientEventCode = (typeof clientEventMeta)[number]['code']
export type ServerEventCode = (typeof serverEventMeta)[number]['code']

export type Envelope<TPayload, TCode extends number> = {
  e: TCode
  p: TPayload
}
