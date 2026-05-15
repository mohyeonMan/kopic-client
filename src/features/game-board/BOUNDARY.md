# game-board feature

## Ownership

- board interaction surface
- drawing toolbar orchestration
- lobby canvas drawing command boundary
- later: word/turn board overlays

## Uses

- `entities/game`
- `features/drawing-canvas`
- `features/game-session` command gateway

## Must Not Own

- WebSocket transport
- room join/session lifecycle
- participant panel layout
- chat message flow

## Migration Position

Lobby canvas drawing migrated after session/protocol boundary became stable.
