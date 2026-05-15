# Branch 02: Entry Join Flow

## Scope

Read only the entry/session path that leads to the game route and first room snapshot.

Files touched for this pass:

- `src/pages/entry/EntryPage.tsx`
- `src/app/router/useAppRouter.ts`
- `src/app/router/routes.ts`
- `src/app/store/useAppActions.ts`
- `src/app/store/useAppSessionState.ts`
- `src/app/store/useAppShellState.ts`
- `src/app/store/lib/appStateSession.ts`
- `src/app/store/lib/appStateRoom.ts`
- `src/app/store/lib/appStatePayloadDecoders.ts`
- `src/app/store/lib/appStateWsAdapter.ts`
- `src/ws/client/wsSessionManager.ts`
- `src/app/ui/AppLayout.tsx`
- `vite.config.ts`

## Actual Flow

Join request:

- `EntryPage` reads session state and actions.
- Main nickname input writes directly to global session state through `actions.updateNickname`.
- Quick entry and create-room buttons call `actions.requestJoin({ action })`.
- Room-code join modal stores local nickname/room code, then calls `actions.updateNickname` and `actions.requestJoin({ roomCode, action: 0 })`.
- `reduceJoinRequested` sets `session.joinPending = true`, clears join/connection errors, stores optional `joinRoomCode` and `joinAction`, and clears room state.

Connection start:

- `useAppRouter` computes `shouldKeepGameSession = session.joinPending || session.joinAccepted`.
- When true, it calls `wsSessionManager.acquire(wsSessionOwner.game, session.nickname, joinRoomCode, joinAction)`.
- `wsSessionManager` keeps module-level socket state, owner set, reconnect timers, heartbeat, and current join query params.
- In dev it always connects to `ws://localhost:8080/ws`.
- In production it builds a URL from current host, configured path, token, roomCode, action, geId, and nickname.

Join success:

- WS messages are subscribed in `AppStateProvider`.
- `appStateWsAdapter` handles event `300` and `408` as snapshot-like join/sync events.
- Snapshot decode may sync `ownSessionId`, dispatch `local/joinAccepted`, then apply room snapshot.
- `EntryPage` observes `session.joinAccepted` and navigates to `routes.game`.
- `useAppRouter` later clears join connect params once accepted.

Join failure/disconnect:

- Server event `1999` dispatches `local/joinFailed`.
- WS connection errors can publish a structured error, decoded in provider, then `local/connectionErrorReported`.
- `wsSessionManager` also pushes browser history back to main route on reconnect failure or session disconnect.
- `useAppRouter` prevents direct `/game` access unless `joinAccepted` is true.

Exit/cleanup:

- Leaving game route through topbar calls `actions.clearRoomCache()` and navigates main.
- `useAppRouter` also clears room cache after route changes away from game.
- When no pending/accepted session remains, `useAppRouter` clears join params and releases the WS owner.
- `wsSessionManager.release` closes after a short grace period if no owner remains.

## Current Shape

Positive:

- Join/session state transitions are explicit and small in `appStateSession.ts`.
- Route guard for `/game` is centralized in `useAppRouter`.
- `wsSessionManager` owner model makes delayed release and reconnect behavior easy to keep outside React state.
- Invite paths are isolated in `routes.ts`, including base path handling for production builds.

Structural pressure:

- `useAppRouter` is both router state and WS session lifecycle owner.
- `wsSessionManager` also mutates browser history on disconnect/reconnect failure, so navigation authority is split between router and WS module.
- `EntryPage` owns invite parsing, modal state, nickname validation, global nickname mutation, join request creation, join error modal, and connection error modal.
- `AppLayout` owns share/QR behavior, exit behavior, and game-route global document touch behavior.
- Join success is not a dedicated domain event in UI terms; it is inferred from snapshot event handling plus `joinAccepted`.

## Risk Notes

- If `session.nickname` changes while `joinPending` or `joinAccepted`, `useAppRouter` may call `wsSessionManager.acquire` again with changed query params. The manager closes and reconnects if query params changed.
- `wsSessionManager` calling `history.pushState` and dispatching `popstate` can surprise code that assumes routing only changes through `useAppRouter.navigate`.
- `clearRoomCache` is triggered both by topbar exit and by router route-change effect. It appears idempotent, but this duplicate ownership should be kept in mind before changing exit behavior.
- Direct dev WS URL is hardcoded to `ws://localhost:8080/ws`; production path honors env/base path.

## First Refactor Candidates

Keep behavior stable first:

1. Extract entry form/model logic from `EntryPage`.
   - Candidate: `useEntryJoinModel`.
   - Owns invite room code, validation, modal state, submit handlers, error modal state.

2. Move navigation side effects out of `wsSessionManager`.
   - Prefer publishing session errors only.
   - Let router decide route changes from app/session state.
   - Do this only after WS protocol branch confirms all disconnect cases.

3. Split `AppLayout` by role.
   - `RoomShareMenu` for invite/copy/QR/native share.
   - `useGameDocumentGuards` for game-route touch/gesture prevention.

4. Make join acceptance semantics more explicit.
   - Current: event `300`/`408` -> snapshot decode -> `joinAccepted`.
   - Candidate later: a named join-sync function at adapter boundary.

## Next Read Branch

Recommended next branch: `ws-protocol-normalization`.

Reason: both `game-page-flow` and `entry-join-flow` depend on event-code decoding, compact payload compatibility, and snapshot normalization.

