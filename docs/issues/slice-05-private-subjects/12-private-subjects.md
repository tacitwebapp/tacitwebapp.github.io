# 12 — Private subjects (room password)

Type: AFK
**Status:** DONE

## What to build

A subject can have an optional password, set in the Subjects tab. Subscribed subjects with a password join their room with Trystero's room password, so only peers who know the password can connect. Peers using the same subject slug with a different password, or none, are in separate groups. Private subjects are marked in the UI. Their password is stored locally and left out of backups.

Reference: SPEC §8.2, §9.1, §12.

## Acceptance criteria

- [x] Two profiles with the same subject and password exchange records.
- [x] A third profile with no password, or a different one, does not connect and receives nothing.
- [x] Changing the password re-joins the room with the new password.

## Blocked by

- 06-share-to-subject-room
