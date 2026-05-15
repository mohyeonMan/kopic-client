# drawing-canvas feature

## Ownership

- pointer input to normalized canvas strokes
- direct canvas rendering engine for committed/draft strokes

## Uses

- `entities/game` canvas stroke types

## Must Not Own

- WebSocket send/receive
- room/game state storage
- board toolbar state
- game turn rules

## Migration Position

Migrated as a child feature of `game-board`.

