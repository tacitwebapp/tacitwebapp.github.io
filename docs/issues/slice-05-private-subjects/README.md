# Slice 05 — Private subjects

Restrict a subject room to peers who know a password.

## Issues
- 12-private-subjects

## Depends on slices
- slice-02-secure-sharing

## Standalone test
Three profiles A, B, C, subject S:
1. A and B set the same password: records exchange.
2. C with no password, or a different one: no connection, receives nothing.
3. Changing the password re-joins the room with the new one.
4. Private subjects are marked in the UI.
