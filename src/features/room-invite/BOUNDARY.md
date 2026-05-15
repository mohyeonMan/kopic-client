# room-invite Boundary

## Owns

- Room invite share menu UI.
- Clipboard, native share, and QR modal UI state for a prepared invite URL.
- Browser capability fallback messages for invite sharing.

## Does Not Own

- Route path construction.
- Session or room store mutation.
- WebSocket commands.
- Game topbar frame layout.

## Dependencies

- Receives `roomCode` and `inviteUrl` from an upper composition boundary.
- May use browser clipboard/share APIs and `qrcode` for presentation support.
