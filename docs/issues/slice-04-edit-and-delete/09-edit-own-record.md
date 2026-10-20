# 09 — Edit your own record

Type: AFK

## What to build

The author (current key) can edit one of their records from the Feed. Saving re-signs it with the same `d` and a newer `created_at`. It replaces the earlier version locally and, if the record is shared, is sent to the room. Peers keep only the newest version per author and `d`, whichever order versions arrive in. Records by previous keys or by other authors can't be edited.

Reference: SPEC §7.4 (Edit), §7.3 step 7.

## Acceptance criteria

- [ ] Editing a shared record updates it on a peer that is connected.
- [ ] A peer that receives the old version after the new one keeps the new one.
- [ ] There is no edit action on records by other authors or previous keys.
- [ ] Unit tests: replacement by newer `created_at`, in either order.

## Blocked by

- 06-share-to-subject-room
