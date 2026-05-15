# Branch 06: Entry Join Migration

## Scope

First actual feature migration after bootstrap:

- `entry-join` form/dialog/error UI.
- session state ownership in `entities/session`.
- game-session WebSocket API boundary.
- route wiring for `/` and `/game`.

## Legacy Reference Used

- `src_legacy/pages/entry/EntryPage.tsx`
- `src_legacy/app/store/lib/appStateSession.ts`
- `src_legacy/app/router/routes.ts`
- `src_legacy/ws/client/wsSessionManager.ts`

## Ownership Decisions

- Form state stays local in `entry-join`.
- Join/session projection is global Zustand state under `entities/session`.
- WebSocket transport is domain-independent under `shared/api/ws`.
- Join URL/protocol decoding belongs to `features/game-session/api`.
- Route navigation belongs to `pages/entry` + `app/router`, not the API layer.

## Migration Result

- Legacy entry god component was not copied.
- `EntryPage` now composes feature boundaries.
- `entry-join` does not import `src_legacy`.
- `game-session` does API/protocol work without mutating stores directly.

