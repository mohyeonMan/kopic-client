# game-session feature

## Ownership

- WebSocket session lifecycle orchestration
- inbound event subscription and dispatch into entity stores
- outbound command adapter for game/session actions
- join accepted/rejected envelope normalization

## Uses

- `shared/api/ws` transport
- `entities/session`
- later: `entities/game`

## Must Not Own

- visual game board rendering
- entry form UI
- canvas pointer rendering
- store-internal API calls

## Migration Position

Partially migrated with `entry-join`: join connection and join-result handling are active.
