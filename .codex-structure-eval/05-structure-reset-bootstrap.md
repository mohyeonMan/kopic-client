# Branch 05: Structure Reset Bootstrap

## Scope

Initial hard reset implementation:

- Move existing `src` to `src_legacy`.
- Create a clean, executable `src` bootstrap.
- Install TanStack Query and Zustand runtime dependencies.
- Declare first feature boundaries without importing legacy code.

## Impact

- `@/*` still points to new `src/*`.
- `tsconfig.app.json` still includes only `src`, so `src_legacy` is excluded from typecheck/build.
- `eslint.config.js` ignores `src_legacy`, so lint applies to the new implementation boundary.
- Legacy code is now reference-only.
- Current app runtime is a bootstrap dashboard, not the legacy game implementation.

## First Migration Target

`features/entry-join`

Reason:

- It owns the first user action.
- It establishes session state and join command shape.
- Game session, room snapshot, and board features depend on this boundary.

## Import Direction

Allowed direction:

`app -> pages -> widgets -> features -> entities -> shared`

Rules:

- `src_legacy` must not be imported by runtime code.
- `shared` must stay domain-independent.
- Zustand stores must not call API/WS directly.
- TanStack Query is for HTTP server state, not realtime WS room state.
- Page components compose; they do not own feature orchestration.

## Validation

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
