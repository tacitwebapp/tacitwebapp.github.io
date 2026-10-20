# 11 — Hide another author's record

Type: AFK
**Status:** PARTIAL — Delete (ticket 09/10) does not exist yet, so own records offer neither Hide nor Delete

## What to build

On a Feed card for another author's record, "Hide" removes it from the user's library, remembers its address, stops relaying it, and drops it if it arrives again. This has no effect on other peers.

Reference: SPEC §7.3 step 5, §7.4 (Hide), §8.1 (`hidden`).

## Acceptance criteria

- [x] A hidden record does not come back after re-joining the room.
- [x] A hidden record is not sent to peers who join later.
- [ ] Your own records offer Delete, not Hide.

## Blocked by

- 07-unknown-author-review-and-trust
