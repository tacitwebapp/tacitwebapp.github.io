# 33 — Insight import, insight drafts and disagreements

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](../slice-14-manual-insights/00-insights-spec.md). Reference: SPEC §6.4 (Insight JSON, Import, Insight drafts), §8.1.

## What to build

An import panel in the Insights tab (file or paste, JSON) and the row-to-draft logic in the pure insight module. Short IDs are resolved against the whole library. Rows are rejected for: unknown ID, ambiguous ID, same record, different subjects, unknown relation, missing rationale. An overlong rationale is cut to 500 with the warning `rationale shortened`. A `supersedes` from an older record gets `supersedes a newer record`.

Import never changes an existing insight: a row for a pair the user (current key) already linked or drafted is a duplicate (same relation and direction) or a disagreement (otherwise). Disagreements are listed with the existing and proposed relation and an **Accept** button. Accept replaces a draft's values, or signs an edit of a signed insight (same `d` and visibility, sent if shared). Within one import, the first row per pair wins.

Other rows become insight drafts in `pending` (`kind: 'insight-draft'`, `source: 'llm'`), listed in the Insights tab with both records, relation, direction and rationale, all editable. Store, Share, Discard work one at a time and in bulk; Share and Share all respect "shared needs shared" and Share all reports what it skipped.

## Acceptance criteria

- [ ] Summary reads "N drafts, M disagreements, K rejected, J duplicates" with reasons.
- [ ] Importing the same JSON twice creates no new drafts.
- [ ] A different relation for a linked pair is a disagreement; Accept applies it to a draft and to a signed insight (edit keeps `d`; shared edit is sent).
- [ ] Drafts survive a reload and can be edited before signing.
- [ ] Store all, Share all and Discard all work; Share all skips drafts with a local record and says how many.
- [ ] Unit tests: every rejection reason, shortening, supersedes warning, duplicate versus disagreement, first-row-wins, Accept on draft and on signed insight.
- [ ] `npm test` passes.

## Blocked by

- 31-insights-tab-and-insight-list
