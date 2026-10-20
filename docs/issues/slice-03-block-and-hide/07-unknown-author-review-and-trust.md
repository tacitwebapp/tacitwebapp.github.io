# 07 — Incoming records from unknown authors: review, trust, block

Type: AFK
**Status:** DONE

## What to build

Verified records from authors who are neither trusted nor blocked go to the review queue, grouped by author. "Accept" adds the record to the library as `shared` (so the user passes it on to later peers) and sends it to the room's current peers. "Discard" removes it from the queue. Review and Feed cards have "Trust author" and "Block author". Trusting moves that author's pending records into the library, and future records from them skip review. Blocking removes all of the author's library and pending records, and drops their future events. Trust and block entries are stored, and an author can't be both.

Reference: SPEC §7.3 (steps 2, 8, 9 without the cap), §7.4 (Accept/Discard incoming), §7.5, §8.1 (`trust`).

## Acceptance criteria

- [x] A record from an unknown author arrives in review, not in the Feed.
- [x] After Accept, the record is shared and is sent on to a third peer that joins later.
- [x] After Trust, the author's next record goes straight into the Feed.
- [x] After Block, the author's records disappear and new ones are dropped.
- [x] Unit tests: merge decisions for trusted, blocked and unknown authors.

## Blocked by

- 06-share-to-subject-room
