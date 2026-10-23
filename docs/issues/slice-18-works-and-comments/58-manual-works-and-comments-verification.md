# 58 — Manual verification of Works and comments

Type: HITL
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §13 (manual checks 8–11), §15 (Phase 5).

## What to build

Nothing. A human runs the slice 18 standalone test in three browser profiles, at a phone width and a desktop width, in both schemes, and records the results here.

## Acceptance criteria

- [ ] Slice 18 standalone test passes.
- [ ] SPEC §13 manual checks 8–11 pass.
- [ ] SPEC §15 Phase 5 items are checked.
- [ ] A backup exported with comments and Works marks and restored into a fresh profile brings them back. Folded comments are not in it.
- [ ] Any failure is filed as an issue or backlog item.

## Blocked by

- 51-works-marks
- 52-full-view-route
- 53-comments-and-nested-replies
- 54-thread-display
- 55-folded-comments
- 56-edit-delete-hide-comments
- 57-comment-notifications
