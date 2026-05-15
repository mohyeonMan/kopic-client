# 08 Game Runtime And Status Migration

Purpose: local memory for the migrated runtime/gameplay branch. This is not user-facing architecture prose.

## Migrated

- `entities/game`
  - Added `RoundSummary`, `TurnSummary`, lifecycle payload types.
  - `gameStore` now owns server-state projection for game start, round start, turn start, word choice, drawing, correct guess, turn end, result, return to lobby.
  - Canvas writes route to lobby canvas or current turn canvas by room state.
- `entities/game/api`
  - `roomSnapshotNormalizer` can recover current round/turn for running-game joins.
- `features/game-session`
  - WebSocket API decodes GE lifecycle codes: `200`, `202`, `203`, `205`, `206`, `207`, `208`, `209`, `210`.
  - Runtime applies lifecycle events to `gameStore`.
  - Command gateway exposes `sendWordChoice`.
- `features/game-board`
  - Board draw permission is based on ownership: lobby or current drawer during `DRAWING`.
  - Word-choice buttons are shown only from current turn projection.
- `features/game-progress`
  - Replaces legacy `GameStatusBar`/timer display with deadline-based status strip.
- `features/participants`
  - Replaces participant panel responsibility with score/role presentation.
- `features/game-chat`
  - Guess input is enabled only during drawing for non-drawer/non-correct participants.
- `features/room-lobby`
  - Reduced to room metadata, own session, settings/start controls.

## Ownership Decisions

- Game lifecycle is entity state, not page state.
- WebSocket codes stay inside `features/game-session/api`.
- Timer tick is UI state owned by `game-progress`.
- Participant role display is presentation owned by `participants`; it does not mutate game state.

## Validation

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
