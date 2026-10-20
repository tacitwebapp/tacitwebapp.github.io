# 26 — Guided empty states

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §10.7.

## What to build

One empty-state component (title, one sentence, optional button), used for each case in SPEC §10.7: empty Feed (one-sentence description of Tacit, button to Extract), Feed filters matching nothing (Clear filters), Extract and Subjects with no subjects (Create subject focuses the field), nothing to review, no public subjects in Discover, and no trusted or blocked authors.

## Acceptance criteria

- [x] On a fresh profile every state in the §10.7 table that applies shows its title, sentence and button.
- [x] Each button does what its label says.
- [x] Existing empty-state ids (such as `#feed-empty`) are kept.
- [x] States disappear as soon as the list has content.
- [x] `npm test` passes.

## Blocked by

- 20-feed-rows-and-record-detail
- 24-restyle-extract-and-import-review
- 25-restyle-subjects-and-identity
