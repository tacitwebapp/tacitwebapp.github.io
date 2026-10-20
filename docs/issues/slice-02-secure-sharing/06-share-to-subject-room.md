# 06 — Share to a subject room and receive verified records

Type: AFK
**Status:** PARTIAL — no dev hook to tamper an event in transit (merge-decision unit test covers rejection); unsubscribed-subject share not run by hand

## What to build

This is the first end-to-end network path. When the app loads, it joins the room of every subscribed subject (new app id, room id `subject:<slug>`). "Share" on a draft or on one of your own local records signs it if needed, marks it `shared`, keeps it in the user's library, and sends it to that subject's room. If the subject is not subscribed, sharing subscribes to it first. When a peer joins a room, it receives only the shared records for that subject. Incoming events are checked with `verifyEvent`. Failures are dropped, with a visible sync-log entry and a console warning. Kinds other than 30078 are dropped. A version that is the same as or older than one already held (same author and `d`) is ignored. Events signed by the user's own current or previous keys merge into the library as `shared`. The Subjects tab shows each room's status, peer count, and a sync log of the latest 50 lines.

Reference: SPEC §7.3 (steps 1, 4, 7, 8 for self), §7.4 (Share), §9.1–§9.3, §9.5.

## Acceptance criteria

- [x] Two profiles with the same key (via identity import): a record shared on A appears on B.
- [x] A local record never reaches another peer, through any order of joins and shares.
- [x] A peer joining subject S receives only S's shared records.
- [ ] Sharing to an unsubscribed subject subscribes to it, then sends.
- [ ] A changed event (dev hook) is rejected and logged.
- [x] The shared record stays in the sharer's Feed as shared.
- [x] Unit tests: the merge decision for self, duplicate and older-version cases.

## Blocked by

- 05-store-signed-local-record
