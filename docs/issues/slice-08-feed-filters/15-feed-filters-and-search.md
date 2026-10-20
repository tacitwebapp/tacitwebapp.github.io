# 15 — Feed filters and text search

Type: AFK

## What to build

The Feed can be filtered by subject, by author group (mine / trusted / others), and by visibility (local / shared). A text box searches `information_chunks` and `actionable_workflows` (case-insensitive substring match). Filters combine, and an empty result shows a clear message.

Reference: SPEC §10 (Feed).

## Acceptance criteria

- [ ] Each filter alone and in combination narrows the Feed correctly.
- [ ] Search matches text in either field, ignoring case.
- [ ] Unit tests: the filter and search predicate.

## Blocked by

- 07-unknown-author-review-and-trust
