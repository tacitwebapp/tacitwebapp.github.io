# 57 — Comment notifications

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §8.2 (`tacit.threadSeen`), §10.11.

## What to build

Tell users when a discussion needs them. Add `tacit.threadSeen = { since, seen: { [recordKey]: seconds } }` to localStorage. `since` is set the first time the app runs with this feature, and opening a record's full view sets that record's `seen` time to now.

The comment module gains `commentNotifications`, which returns three counts and, for each, the record holding the newest matching comment:
- **Comments to review (N)**: folded comments on the user's records (current or previous key).
- **Replies to you (N)**: comments in the library whose parent is one of the user's comments, received after that record's `seen` time.
- **New comments on your records (N)**: other authors' comments in the library on the user's records, received after `seen` and not already counted as replies.

"Received after" compares `receivedAt`, never `created_at`, and nothing received before `since` counts. The bell's badge adds the three counts. Each item is shown when N > 0 and opens the full view of its record. Works marks never notify.

## Acceptance criteria

- [x] On first run with existing comments, the bell shows no comment items.
- [ ] A reply to the user's comment raises "Replies to you". Opening that record's full view clears it.
- [x] Another author's comment on the user's record raises "New comments on your records", unless it is a reply to the user, which is counted once, as a reply.
- [ ] A folded comment on the user's record raises "Comments to review" until it is accepted, hidden or its author is blocked.
- [x] A comment with a past or future `created_at` is judged by when it was received.
- [x] Each item opens the full view of the record with the newest matching comment.
- [x] Works marks never change the bell.
- [x] Unit tests for `commentNotifications` (`since`, `seen` per record, `receivedAt`, no double counting). `npm test` passes.

## Blocked by

- 55-folded-comments
