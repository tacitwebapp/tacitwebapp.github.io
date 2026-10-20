# Slice 06 — Discover public subjects

Find subjects other peers subscribe to via the directory room.

## Issues
- 13-directory-and-discover

## Depends on slices
- slice-02-secure-sharing

## Standalone test
Profiles A and B:
1. A subscribes to public subject S: B's Discover list shows S with peer count 1; one click subscribes.
2. A private subject never appears in anyone's Discover list.
3. A leaves: its entries disappear from B.
4. Malformed announcements (slug mismatch, label over 80 chars, over 100 entries) are ignored (unit tests).

Does not depend on private subjects being built; the "never announced" check only needs a subject flagged private. If slice 05 is not done yet, test that case with the unit test.
