# Branch 01: Game Page Flow

## Scope

Read only the game page path and its immediate state/WS dependencies.

Files touched for this pass:

- `src/main.tsx`
- `src/App.tsx`
- `src/app/AppShell.tsx`
- `src/app/router/AppRouter.tsx`
- `src/pages/game/GamePage.tsx`
- `src/pages/game/gamePageShared.ts`
- `src/pages/game/hooks/useGameControls.ts`
- `src/pages/game/components/GameBoardPanel.tsx`
- `src/pages/game/components/board/BoardCanvas.tsx`
- `src/features/game-canvas/CanvasBoard.tsx`
- `src/entities/game/model/types.ts`
- `src/entities/game/model/state.ts`
- `src/app/store/AppStateContext.tsx`
- `src/app/store/appStateContextValue.ts`
- `src/app/store/lib/appStateReducer.ts`
- `src/app/store/lib/appStateGame.ts`
- `src/app/store/lib/appStateCanvas.ts`
- `src/app/store/lib/appStateChat.ts`
- `src/app/store/lib/appStateWsAdapter.ts`
- `src/ws/protocol/events.ts`

## Actual Flow

Entry path:

`main.tsx` -> `App` -> `AppShell` -> `AppStateProvider` + `AppRouter` -> `GamePage`.

State source:

`GamePage` calls `useAppState()` and reads `{ state, actions, server }`. The app state model lives under `entities/game/model`, but most mutations are implemented in `app/store/lib/*`.

User control flow:

- `GamePage` derives page state from `state.room` and `state.session`.
- `useGameControls` owns local game UI controls: tool, size, color, guess input, settings overlay.
- `useGameControls` calls `actions.*` for settings, start game, word choice, guess submit, canvas clear/send.
- `useGameControls` also calls `server.applyCanvasStroke` for local canvas commit.
- `AppStateProvider` maps actions to reducer dispatch and compact WS envelopes through `wsSessionManager.send`.
- `appStateWsAdapter` receives server envelopes, decodes by numeric event code, dispatches reducer actions or calls `server.*`.

Canvas flow:

- `GameBoardPanel` passes board state and callbacks into `BoardCanvas`.
- `BoardCanvas` wraps domain display decisions such as secret word/masked word.
- `CanvasBoard` is the actual drawing engine.
- Stroke chunks are sent via `onSendStrokeChunk` while the full local stroke is committed via `onCommitStroke`.
- Inbound strokes are batched in `AppStateProvider` with `requestAnimationFrame` before reducer dispatch.

## Current Shape

Positive:

- The outer route tree is simple and easy to trace.
- Domain shape is centralized in `entities/game/model/types.ts`.
- Reducer implementation is already split by broad concern: game, room, session, chat, canvas.
- Canvas rendering is separated from page layout in `features/game-canvas`.

Structural pressure:

- `GamePage` is acting as a page, view model, layout coordinator, mobile behavior owner, overlay coordinator, and state selector at once.
- `GameBoardPanel` receives a very large prop surface, mostly forwarded from `GamePage` to board subcomponents.
- `gamePageShared.ts` mixes visual constants, UI option labels, overlay types, participant helpers, score helpers, masked-word logic, and keyboard helper code.
- `AppStateProvider` owns reducer wiring, WS outbound encoding, inbound subscription, mock fallbacks, stroke batching, and dev tools in one provider.
- WS event compatibility is split across `events.ts`, `appStateWsAdapter.ts`, `appStatePayloadDecoders.ts`, and reducer payload types in `appStateContextValue.ts`.

## Risk Notes

- The game page has many derived values that are not named as a domain/view-model layer. This makes it hard to know which calculations are UI-only and which are game rules.
- `server.applyCanvasStroke` being exposed to UI hooks means local optimistic state and server-applied state share the same public surface.
- Numeric WS event codes are handled directly inside `appStateWsAdapter`; protocol drift can be hard to audit because not all server event metadata names are used in the switch.
- Console output showed mojibake for Korean UI strings in several files. Need separate verification before treating this as a source encoding bug.

## First Refactor Candidates

Keep behavior stable first:

1. Extract a `useGamePageModel` or equivalent selector hook from `GamePage`.
   - Owns participants, current turn/round, role, rankings, visible chat, countdown inputs, board strokes, hint count.
   - Leaves `GamePage` mostly as layout composition.

2. Split `gamePageShared.ts` by responsibility.
   - `gamePageTypes.ts`: overlay/view types.
   - `gamePageOptions.ts`: color/settings options.
   - `gamePageViewHelpers.ts`: participant tone, earned scores, masking, bubble text.

3. Collapse board prop forwarding.
   - Either pass grouped objects like `boardState`, `boardControls`, `overlayState`, `settingsState`.
   - Or move more board-specific derivation into `GameBoardPanel`.

4. Narrow provider responsibilities later.
   - Keep reducer and context provider separate from WS protocol adapter.
   - Avoid doing this before entry/join and WS branches are read.

## Next Read Branch

Recommended next branch: `entry-join-flow`.

Reason: it explains how session identity, join state, room snapshot, and first WS sync enter the same app state that `GamePage` consumes.

