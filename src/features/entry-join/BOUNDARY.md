# entry-join feature

## Ownership

- 사용자 입장 시작 flow
- nickname / room code 입력과 validation
- join submit command 생성
- entry form/dialog/error presentation

## Uses

- `entities/session`
- page boundary가 `features/game-session` command hook과 연결

## Must Not Own

- WebSocket transport implementation
- game room rendering
- global route implementation
- shared form abstraction before repetition is proven

## Migration Position

Migrated first. This feature creates the session entry contract that later game features depend on.
