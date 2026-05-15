# 11 Game Stage Overlay Migration

Purpose: local memory for the migrated game-stage overlay branch. This is not user-facing architecture prose.

## Migrated

- `features/game-board`
  - Added `useGameStageOverlay` for game/round/turn start overlays based on normalized room projection.
  - Added `GameStageOverlay` for word choice, turn end answer/score summary, result ranking, and transient start states.
  - Moved word-choice affordance from a separate panel above the board into the board surface overlay.
  - Updated boundary docs: board overlays are now owned by `game-board`.

## Legacy Reference Used

- `src_legacy/pages/game/hooks/useGameStageOverlay.ts`
- `src_legacy/pages/game/components/board/TurnOverlay.tsx`
- `src_legacy/pages/game/components/board/TurnOverlay.css`

## Ownership Decisions

- `GamePage` remains a layout composition boundary and does not own turn overlay state.
- `game-board` owns overlays because they are visual affordances attached to the drawing surface.
- WebSocket command execution still goes through `gameSessionCommandGateway`; overlay UI only receives an `onChooseWord` command.
- No new shared utilities were added because the masking/ranking/earned-score projection is currently board-specific presentation logic.

## Migration Result

- Running game phases now show surface-level overlays instead of relying only on small status text above the board.
- Drawer can choose words from the board overlay; guessers see a waiting state.
- Turn end shows answer and per-participant earned score projection.
- Result state shows top ranking over the board surface.

## Validation

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
