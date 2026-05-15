# Branch 07: Game Session + Room Lobby Migration

## Scope

Second actual feature migration:

- Persistent game-session runtime mounted under `AppShell`.
- `entities/game` room projection store.
- Room snapshot normalization API boundary.
- Room presence event handling.
- `room-lobby` feature rendering `/game` route with real room state.

## Legacy Reference Used

- `src_legacy/app/store/lib/appStateSnapshot.ts`
- `src_legacy/entities/game/model/types.ts`
- `src_legacy/app/store/lib/appStateRoom.ts`
- `src_legacy/app/store/lib/appStatePayloadDecoders.ts`

## Ownership Decisions

- WebSocket connection lifecycle is owned by `features/game-session`, not pages.
- `EntryPage` only starts join by writing a session command to `entities/session`.
- `gameSessionApi` converts raw envelopes into feature events and does not mutate stores.
- `useGameSessionRuntime` applies feature events into `entities/session` and `entities/game`.
- `RoomLobbyView` is read-only presentation and does not own commands.

## Migration Result

- Join success no longer closes WS because runtime is mounted outside route pages.
- `/game` now displays normalized room code, room state, participants, host, and settings.
- `src_legacy` remains reference-only with no runtime import.

## Validation

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

