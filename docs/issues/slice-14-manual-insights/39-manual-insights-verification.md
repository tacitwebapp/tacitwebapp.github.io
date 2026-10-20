# 39 — Manual verification of manual insights

Type: HITL
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](00-insights-spec.md). Reference: SPEC §6.4 (Manual linking, Insight list), §7.6, §10.3, §10.9, §15 (Phase 4).

## What to build

Nothing. A human runs the slice 14 standalone test in two browser profiles, on a phone width and a desktop width, in both schemes, with a real NIP-07 extension for the cascade delete, and records the results here.

## Acceptance criteria

- [ ] Slice 14 standalone test passes.
- [ ] SPEC §15 Phase 4 items for sharing, review, local records, cascade delete and Feed badges are checked.
- [ ] A backup exported with insights and restored into a fresh profile brings them back.
- [ ] Any failure is filed as an issue or backlog item.

## Blocked by

- 31-insights-tab-and-insight-list
- 34-incoming-insights-review
- 35-cascade-delete-own-insights
- 36-feed-badges
