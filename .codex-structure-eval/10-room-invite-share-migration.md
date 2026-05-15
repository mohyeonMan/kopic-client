# 10 Room Invite Share Migration

Purpose: local memory for the migrated invite-share branch. This is not user-facing architecture prose.

## Migrated

- `features/room-invite`
  - Added a dedicated feature boundary for room invite sharing.
  - Owns share menu UI state, clipboard copy, native share fallback, QR modal state, and QR generation.
  - Receives `roomCode` and `inviteUrl`; it does not construct app routes.
- `app/layout`
  - Builds the invite URL from `buildInvitePath(roomCode)` and current `window.location.origin`.
  - Composes `RoomInviteShareMenu` in the game route topbar next to room code and leave action.

## Legacy Reference Used

- `src_legacy/app/ui/AppLayout.tsx`
- `src_legacy/app/ui/AppLayout.css`

## Ownership Decisions

- Route path construction remains in `app/router` and app composition, not in a feature.
- Invite share behavior is room-specific, so it is not placed in `shared`.
- `AppLayout` stays a frame/composition component and does not own menu open state, QR state, clipboard fallback, or native share fallback.

## Migration Result

- Restored copy link, copy room code, QR code, and native share behavior for game rooms.
- Avoided reintroducing the legacy `AppLayout` god component.
- Kept browser API side effects scoped to `features/room-invite`.

## Validation

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
