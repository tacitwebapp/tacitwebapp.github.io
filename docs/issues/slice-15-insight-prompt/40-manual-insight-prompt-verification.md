# 40 — Manual verification of the insight prompt

Type: HITL
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](../slice-14-manual-insights/00-insights-spec.md). Reference: SPEC §6.4, §15 (Phase 4).

## What to build

Nothing. A human runs the slice 15 standalone test, pasting real output from at least one outside LLM, and records the results here.

## Acceptance criteria

- [ ] Slice 15 standalone test passes.
- [ ] SPEC §15 Phase 4 items for prompt batches and re-import are checked.
- [ ] Notes on how well the LLM followed the format and the skip list, for tuning the prompt.
- [ ] Any failure is filed as an issue or backlog item.

## Blocked by

- 32-insight-prompt-and-batches
- 33-insight-import-drafts-and-disagreements
