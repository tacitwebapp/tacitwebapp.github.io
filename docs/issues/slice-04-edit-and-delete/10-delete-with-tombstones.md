# 10 — Delete your own record (tombstones)

Type: AFK

## What to build

The author (current key) can delete one of their records. This signs a NIP-09 deletion event (kind 5) that points at the record's address and carries its `subject` tag. The record is removed locally and a tombstone is kept. If the record was shared, the deletion is sent to the room, and later joiners receive tombstones together with shared records. On receive, a deletion takes effect only if it is signed by the record's author. Records that match a tombstone and are not newer are dropped, so deleted records don't come back.

Reference: SPEC §7.2, §7.3 steps 3 and 6, §8.1 (`tombstones`), §9.3.

## Acceptance criteria

- [ ] A deleted shared record disappears on a connected peer.
- [ ] A peer that was offline during the deletion drops the record when it re-joins and receives the tombstone.
- [ ] A peer that still holds the record and re-joins does not bring it back on the author's device.
- [ ] A deletion signed by a different key is ignored.
- [ ] Unit tests: deletion authorship check; tombstone blocks an older re-insert.

## Blocked by

- 06-share-to-subject-room
