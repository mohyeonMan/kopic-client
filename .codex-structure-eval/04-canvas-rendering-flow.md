# Branch 04: Canvas Rendering Flow

## Scope

Read only the canvas drawing path and how strokes move between UI, local state, WS outbound, WS inbound, and reducer state.

Files touched for this pass:

- `src/pages/game/GamePage.tsx`
- `src/pages/game/hooks/useGameControls.ts`
- `src/pages/game/components/GameBoardPanel.tsx`
- `src/pages/game/components/board/BoardCanvas.tsx`
- `src/pages/game/components/board/BoardCanvas.css`
- `src/features/game-canvas/CanvasBoard.tsx`
- `src/features/game-canvas/CanvasBoard.css`
- `src/app/store/AppStateContext.tsx`
- `src/app/store/lib/appStateCanvas.ts`
- `src/app/store/lib/appStateReducer.ts`
- `src/app/store/lib/appStateWsAdapter.ts`
- `src/app/store/lib/appStateHelpers.ts`

## Actual Flow

Stroke source:

- `GamePage` chooses `boardStrokes`.
- In lobby: `state.room.lobbyCanvasStrokes`.
- In game: `currentTurn?.canvasStrokes`, falling back to lobby strokes.
- `GameBoardPanel` forwards strokes and callbacks into `BoardCanvas`.
- `BoardCanvas` adds board-level UI such as grid, start/settings actions, secret word banner, then renders `CanvasBoard`.

Pointer/render pipeline:

- `CanvasBoard` uses a fixed logical drawing size: `960 x 640`.
- It keeps two visible canvases:
  - committed/static canvas for accepted strokes.
  - draft/active canvas for pointer input in progress.
- Points are normalized from client coordinates to logical 0..1 coordinates.
- `PEN` and `ERASER` draw line strokes; `FILL` runs flood fill against committed canvas pixels.
- Long pointer strokes are split into outbound chunks at `MAX_POINTS_PER_STROKE = 5`.

Optimistic local flow:

- On pointer down with `FILL`, `CanvasBoard` immediately sends the stroke chunk, appends it to the committed canvas, and commits it to app state.
- On pointer move with pen/eraser, chunks are sent while the draft canvas keeps showing the full in-progress stroke.
- On pointer up, remaining chunk is sent, the full draft stroke is appended to the committed canvas, and the full stroke is committed to app state.
- `useGameControls.handleCommitStroke` calls `server.applyCanvasStroke`, which dispatches a normal server-style canvas stroke reducer path.

Outbound:

- `useGameControls.handleSendStrokeChunk` calls `actions.sendCanvasStroke`.
- `AppStateProvider` encodes strokes through `encodeCompactStroke`.
- Compact stroke payload does not include the local stroke id.

Inbound:

- `appStateWsAdapter` handles event `201`.
- Canvas clear payloads clear the inbound queue and state.
- Stroke payloads are decoded with `decodeCompactStroke`, which creates a new local id.
- Decoded inbound strokes are queued in `AppStateProvider`.
- The queue flushes once per animation frame through `server/canvasStrokesReceived`.

Reducer:

- If no `currentTurn` exists, canvas strokes are stored in `room.lobbyCanvasStrokes`.
- If a `currentTurn` exists, strokes append to `currentTurn.canvasStrokes`.
- Canvas clear clears lobby strokes or current turn strokes depending on the same rule.

## Current Shape

Positive:

- Canvas drawing is isolated in `features/game-canvas`, outside page layout.
- The rendering engine avoids full React re-render drawing for every pointer move.
- Inbound stroke batching is in the provider, reducing reducer churn.
- Canvas state storage rule is simple: no turn means lobby, turn means game.

Structural pressure:

- Local optimistic paint and reducer state use the same reducer path name: `server.applyCanvasStroke`.
- Outbound chunks and local committed full stroke are not the same shape. Chunks are compact and id-less; local full stroke has a generated id.
- `CanvasBoard` owns low-level drawing, chunking, local render cache, touch prevention, resizing, flood fill, and optimistic state synchronization in one component.
- `BoardCanvas` mixes canvas rendering with secret word display and lobby actions.
- Canvas clear is protocol-special but still travels through the `DRAW_STROKE` marker outbound path.

## Risk Notes

- Correct local rendering assumes server does not echo the client's own compact chunks back as new strokes, or that duplicate drawing is acceptable. There is no stroke id in the compact outbound payload to reconcile an echo with the local full stroke.
- Remote clients receive chunk strokes, while the local committing client stores a full stroke. This can make local and remote stroke history shapes differ even if pixels look similar.
- `renderedStrokeIdsRef` prevents duplicate local redraw only when state strokes share the same ids as already appended strokes.
- Flood fill is synchronous on the main thread against full canvas image data. Large fill areas can still be expensive.
- Clear behavior depends on whether `currentTurn` exists, not directly on `roomState`. This is simple but can surprise transitional phases where room state and current turn are briefly out of sync.

## First Refactor Candidates

Keep behavior stable first:

1. Document the stroke echo contract.
   - Does server echo sender strokes?
   - Does server store chunks or full strokes?
   - Are chunk ids intentionally absent?

2. Extract canvas engine helpers from `CanvasBoard`.
   - Candidate files: `canvasGeometry.ts`, `canvasPaint.ts`, `canvasStrokeChunking.ts`.
   - Keep React component responsible for refs/events/effects only.

3. Separate board chrome from drawing surface.
   - `BoardCanvas` can split into `DrawingSurfaceLayer`, `SecretWordBanner`, and `LobbyBoardActions`.

4. Consider one authoritative clear command.
   - The protocol branch already marks this. Canvas clear should have one explicit outbound shape.

## Next Read Branch

Recommended next branch: `layout-responsive-flow`.

Reason: `GamePage`, `AppLayout`, side panel sync, mobile panel switching, chat autoscroll, and document gesture guards all interact around mobile gameplay.

