# 48 — Offline status and sync reconnect

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §9, §10.

## What to build

Offline now works, so say so, and make sure peer sync recovers when the network returns.

- **Indicator.** A small "Offline" badge in the header tools area, shown while `navigator.onLine` is false (listen to `online` / `offline`). A toast on return: "Back online". Use existing tokens and the toast queue; no layout shift.
- **Sync honesty.** Offline, share actions already write to IndexedDB. Check what Share, Edit and Delete show when no peer is reachable and make sure nothing claims "sent". Records go to peers when a room connects later (SPEC §7.3), so confirm that is what happens after offline use, and fix only if it does not.
- **Reconnect.** Find out how Trystero 0.26's nostr strategy behaves when relay sockets drop while the device is offline. If rooms do not recover on their own, rejoin the subject rooms and the directory room on the `online` event (debounced), without duplicating handlers or peers. If they do recover, record that in the issue and add only the indicator.
- Feature-detect `navigator.onLine`; it can report true behind a captive portal, so the badge says "Offline", never "No relays".

## Acceptance criteria

- [ ] Toggling offline shows and clears the badge; a toast announces return.
- [ ] Two browser profiles in one room: A goes offline, stores and shares a record, comes back online; B receives it without a reload.
- [ ] No duplicate rooms or duplicate peer handlers after several offline/online cycles (check the sync log and peer counts).
- [ ] Unit tests for any extracted pure logic (debounce / decision to rejoin).
- [ ] `npm test` passes.

## Blocked by

- 43-service-worker-offline-shell
