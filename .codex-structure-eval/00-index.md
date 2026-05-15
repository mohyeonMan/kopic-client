# Client Structure Eval Index

Working rule: keep each note scoped to one domain/flow branch. Use these notes as local memory, not as user-facing docs.

## Branches

1. `01-game-page-flow.md`
   - Scope: app entry -> router -> `GamePage` -> board/chat/canvas controls -> app state/provider -> WS adapter/reducer.
   - Status: first pass complete.
2. `02-entry-join-flow.md`
   - Scope: entry page -> session join state -> router-owned WS acquire/release -> join success/failure -> game route.
   - Status: first pass complete.
3. `03-ws-protocol-normalization.md`
   - Scope: client/server event metadata, inbound switch, compact payload helpers, snapshot/settings normalization.
   - Status: first pass complete.
4. `04-canvas-rendering-flow.md`
   - Scope: board stroke source selection, canvas pointer pipeline, optimistic local paint, outbound chunks, inbound batching, reducer storage.
   - Status: first pass complete.
5. `05-structure-reset-bootstrap.md`
   - Scope: hard reset from `src` to `src_legacy`, new executable `src` bootstrap, first feature boundaries.
   - Status: implemented.
6. `06-entry-join-migration.md`
   - Scope: first actual feature migration: entry-join UI/model, session Zustand ownership, game-session WS API boundary, route wiring.
   - Status: implemented.
7. `07-game-session-room-lobby-migration.md`
   - Scope: persistent game-session runtime, game room store, snapshot normalization, room-lobby feature.
   - Status: implemented.
8. `08-game-runtime-and-status-migration.md`
   - Scope: GE lifecycle events, current round/turn state, word choice/drawing/result projection, status strip, participant score panel.
   - Status: implemented.
9. `09-layout-responsive-flow-migration.md`
   - Scope: game route responsive layout orchestration, mobile panel switch, route-aware game topbar/leave action, runtime disconnect cleanup.
   - Status: implemented.
10. `10-room-invite-share-migration.md`
    - Scope: room invite share menu, clipboard/native share fallback, QR modal, AppLayout composition boundary.
    - Status: implemented.
11. `11-game-stage-overlay-migration.md`
    - Scope: board stage overlays for game/round/turn start, word choice, turn end score, and result ranking.
    - Status: implemented.

## Next Candidate Branches

- `secret-word-and-hint-flow`: migrate drawer secret-word banner and guesser hint projection without moving turn policy into `GamePage`.

## Validation Notes

- `npm run typecheck` passed after sandbox escalation on 2026-05-15.
- Source files are UTF-8. If PowerShell output shows mojibake, read with explicit UTF-8 console/output settings; do not treat it as a source encoding bug.
- `src` was moved to `src_legacy`; new `src` is now clean bootstrap code.
- After reset, `npm run lint`, `npm run typecheck`, and `npm run build` passed.
- `entry-join` first feature migration implemented after bootstrap.
- `game-session` runtime and `room-lobby` migration implemented; validation passed.
- `game-board`, `game-chat`, `game-progress`, and `participants` migrated through running-game lifecycle; validation passed.
- `layout-responsive-flow` migrated: desktop 3-column game layout, mobile panel switch, game-route leave action, runtime cleanup for rejoin with same request key.
- `room-invite-share` migrated: AppLayout builds the invite URL, `features/room-invite` owns clipboard/native share/QR UI state.
- `game-stage-overlay` migrated: `features/game-board` owns board overlays and drawer/guesser word choice affordance.
