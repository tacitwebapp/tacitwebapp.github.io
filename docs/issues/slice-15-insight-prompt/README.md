# Slice 15 — Insight prompt generator

Let users select records in a subject, copy insight prompts that an outside LLM answers with relations, and import that JSON as insight drafts to review.

## Issues
Parent spec: [00-insights-spec](../slice-14-manual-insights/00-insights-spec.md)

- 32-insight-prompt-and-batches (needs 31)
- 33-insight-import-drafts-and-disagreements (needs 31)
- 40-manual-insight-prompt-verification (HITL, needs 32, 33)

## Depends on slices
- slice-14-manual-insights

## Standalone test
A profile with a subject of 40+ records from several authors, some already linked:
1. Search narrows the record list; Select all selects only the filtered records.
2. Set the prompt limit below the selection: the counter shows P = m(m−1)/2 prompts; each card copies; no record block names an author; already-linked pairs appear in the skip list.
3. Paste LLM JSON: summary counts are right; rejected rows give reasons; drafts show both records and are editable; Store all and Share all work, and Share all skips drafts with a local record.
4. Paste the same JSON again: no new drafts. A row with a different relation for a linked pair shows as a disagreement; Accept applies it.
5. Reload: drafts are still there.
6. `npm test` passes.
