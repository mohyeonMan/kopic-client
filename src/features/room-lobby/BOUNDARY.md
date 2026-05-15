# room-lobby feature

## Ownership

- joined room의 lobby 상태 표시
- room code / room type / host / participant list / settings summary presentation

## Uses

- `entities/game`
- `entities/session`

## Must Not Own

- WebSocket transport
- join form flow
- canvas board interaction
- chat submit flow
- raw server payload decoding

## Migration Position

Migrated after `game-session` snapshot projection so the game route has real room state.

