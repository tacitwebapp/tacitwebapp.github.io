# Slice 02 — Secure sharing

Share a signed record to its subject room. Receivers verify it; local records never leak.

## Issues
- 06-share-to-subject-room

## Depends on slices
- slice-01-basic-posting

## Standalone test
Two browser profiles with the same identity (via key import), both subscribed to subject S:
1. Share on A: record appears on B, byte-identical, verified.
2. Store-only (local) record on A never reaches B, in any join/share order.
3. B joining late receives only S's shared records.
4. Share to an unsubscribed subject subscribes first, then sends.
5. Dev hook alters one byte in transit: B drops it, sync log and console show the rejection.

Same key on both profiles keeps this slice independent of review/trust (slice 03).
