# game-progress feature

## Ownership

- current round/turn progress display
- deadline-based countdown presentation
- drawer order projection for the active round

## Uses

- `entities/game`

## Must Not Own

- server event decoding
- room state mutation
- drawing/chat commands

## Migration Position

This replaces the legacy `GameStatusBar` and timer display responsibility without bringing over page-level orchestration.
