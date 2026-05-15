# participants feature

## Ownership

- participant list presentation
- participant status and role display
- participant bubble UI behavior

## Uses

- `entities/game`

## Must Not Own

- game turn state transitions
- chat submit flow
- WebSocket event handling

## Migration Position

Migrate with or after `game-chat`, because bubble behavior depends on chat visibility.

