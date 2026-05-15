# 09 Layout Responsive Flow Migration

Purpose: local memory for the migrated game-layout branch. This is not user-facing architecture prose.

## Migrated

- `app/layout`
  - `AppLayout` is now route-aware: game route topbar exposes room code and leave entrypoint.
  - Shell spacing now splits main route vs game route to prevent one-size-fits-all layout drift.
- `app/router`
  - Leave action ownership is in router composition: disconnect session runtime, reset entity stores, navigate to main route.
- `features/game-session`
  - Command gateway now exposes `disconnect`.
  - Runtime now clears connection/request key when session status is not `joining/joined` so rejoin with same request payload works.
- `pages/game`
  - Rebuilt game page layout orchestration to desktop 3-column composition:
    - left: participants + lobby
    - center: board
    - right: chat
  - Added mobile panel switch (`chat` / `participants`) as page-level UI state.
  - Added viewport inset sync hook for mobile keyboard-safe bottom spacing.

## Legacy Reference Used

- `src_legacy/app/ui/AppLayout.tsx`
- `src_legacy/app/ui/AppLayout.css`
- `src_legacy/pages/game/GamePage.css`
- `src_legacy/pages/game/hooks/useMobileViewport.ts`

## Ownership Decisions

- App shell owns route frame and leave entrypoint; it does not own board/chat/lobby feature policies.
- Page owns responsive panel orchestration and mobile tab state; it does not own feature business logic.
- Session runtime owns WebSocket lifecycle cleanup; router triggers leave intent only.
- Shared layer remains untouched because viewport/leave behavior is game-route specific.

## Migration Result

- Removed single-layout assumption that forced game route into the same frame as entry route.
- Replaced legacy monolithic game page behavior with boundary-safe page orchestration.
- Prevented reconnect deadlock when rejoining with the same nickname/room/action after leaving.

## Validation

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
