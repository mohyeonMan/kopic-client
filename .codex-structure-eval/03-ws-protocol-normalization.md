# Branch 03: WS Protocol Normalization

## Scope

Read only the protocol boundary: event code metadata, outbound encoding, inbound switch, payload decoders, snapshot normalization.

Files touched for this pass:

- `src/ws/protocol/events.ts`
- `src/ws/protocol/outgoingLogger.ts`
- `src/app/store/AppStateContext.tsx`
- `src/app/store/lib/appStateWsAdapter.ts`
- `src/app/store/lib/appStateHelpers.ts`
- `src/app/store/lib/appStatePayloadDecoders.ts`
- `src/app/store/lib/appStateSnapshot.ts`

## Actual Flow

Outbound:

- `clientEventMeta` defines client event name/code pairs.
- `AppStateProvider` builds a local `clientEventCodeByName` map from `clientEventMeta`.
- `sendClientEvent(eventName, payload, fallback)` wraps payload as `{ e, p }` and calls `wsSessionManager.send`.
- Used outbound events are:
  - `GAME_SETTINGS_UPDATE_REQUEST` with compact settings array.
  - `GAME_START_REQUEST`.
  - `WORD_CHOICE`.
  - `GUESS_SUBMIT`.
  - `DRAW_STROKE` with compact stroke arrays.
  - Canvas clear is sent as `DRAW_STROKE` plus `CANVAS_CLEAR_MARKER`, not as `DRAW_CLEAR`.

Inbound:

- `AppStateProvider` subscribes to `wsSessionManager`.
- Raw string messages go through `decodeInboundEnvelope`.
- `decodeInboundEnvelope` accepts JSON envelope strings and also trims trailing garbage after the last `}`.
- `createServerEnvelopeHandler` switches on numeric `envelope.e`.
- Decoded payloads dispatch reducer actions or call `server.*` helpers.

Normalization:

- `appStatePayloadDecoders.ts` handles GE event payloads, room joined/left, join failed, connection error, and canvas-clear detection.
- `appStateHelpers.ts` handles compact stroke/settings encoding helpers, color palette mapping, chat tone resolution, and chat message decoding.
- `appStateSnapshot.ts` is the widest compatibility layer. It accepts current shape plus legacy/alternate keys such as `room`, `game`, `snap`, `sid`, `drawerSid`, `drawerUserId`, `words`, `answerEntry`, compact settings arrays, object participant maps, etc.

## Current Shape

Positive:

- Protocol compatibility is mostly contained under `app/store/lib`.
- Compact payload encoding and decoding are explicit and easy to locate.
- Snapshot normalization is defensive and preserves fallback state for missing optional fields.
- Inbound stroke batching stays outside the decoder and belongs to provider/runtime behavior.

Structural pressure:

- `serverEventMeta` is not used by the inbound switch. The switch is the real inbound protocol registry.
- Some metadata entries have no current handler, including older server-style codes like `303`, `304`, `305`, `306`, `311`, `401`, `403`, `404`, and `406`.
- Some inbound handlers use client-side-looking codes, such as `107`, `201`, and `204`, for compatibility.
- `outgoingLogger.ts` is not referenced in `src`; outbound logging currently does not happen through that helper.
- Payload types for GE events live in `appStateContextValue.ts`, not next to the decoders or protocol metadata.
- Snapshot normalization is large enough that it now acts as its own translation subsystem, but it is named like one helper file.

## Risk Notes

- Event-code drift is hard to audit because metadata and switch coverage can diverge silently.
- `DRAW_CLEAR` exists in client metadata, but current clear flow sends a `DRAW_STROKE` marker. Any future caller using `DRAW_CLEAR` would not match current behavior.
- `normalizeRoomSnapshotPayload` currently keeps `roomId: state.room.roomId` rather than reading a payload room id. Confirm server contract before treating that as a bug.
- `decodeInboundEnvelope` trimming to the last brace is pragmatic, but it can hide malformed transport output. Good for compatibility, risky for diagnostics.
- Snapshot normalization owns both protocol translation and domain inference: room state, turn phase, own session id, hidden chat visibility, total point application, canvas preservation.

## First Refactor Candidates

Keep behavior stable first:

1. Generate an inbound event map from one source of truth.
   - Start by adding a small coverage test or script-level assertion for `serverEventMeta` vs handled cases.
   - Do not remove compatibility cases until server behavior is confirmed.

2. Move GE payload types out of `appStateContextValue.ts`.
   - Candidate: `app/store/lib/appStateProtocolTypes.ts` or `ws/protocol/payloads.ts`.
   - Keeps React context value types focused on context.

3. Split `appStateSnapshot.ts` by normalization stage.
   - Settings normalization.
   - Participant normalization.
   - Round/turn normalization.
   - Chat visibility normalization.
   - Final snapshot assembly.

4. Decide whether canvas clear has one protocol shape.
   - Either keep `DRAW_STROKE` marker and remove/ignore `DRAW_CLEAR` metadata intentionally.
   - Or route clear through `DRAW_CLEAR` and keep marker as legacy inbound support.

## Next Read Branch

Recommended next branch: `canvas-rendering-flow`.

Reason: protocol notes show canvas has a special optimistic path: compact outbound chunks, local full-stroke commit, inbound batching, clear marker compatibility.

