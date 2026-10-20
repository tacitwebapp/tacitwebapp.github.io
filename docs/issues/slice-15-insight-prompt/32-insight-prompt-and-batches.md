# 32 — Record selection, insight prompt, prompt limit and batches

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](../slice-14-manual-insights/00-insights-spec.md). Reference: SPEC §6.4 (Selecting records, Insight prompt), §7.6 (Relation types), §8.2.

## What to build

A record list in the Insights tab: every library record of the selected subject (any author, either visibility), filtered with the Feed's filters, each with its short ID, a preview and a checkbox, plus **Select all** of the filtered records.

The insight prompt builder in the pure insight module, and its controls in the Insights tab. The prompt defines the seven relation types and directions, asks only for clear relations and for `[]` when there are none, and asks for the JSON format of §6.4. Each record is a block with short ID, date, specialty if set, information chunk and workflow if set, and no author. The skip list holds the user's own (current key) insights and insight drafts among the prompt's records, as pairs only.

A **prompt limit** field (default 30, minimum 4, maximum 200, even only) is stored as `settings.insightPromptLimit`. If more than *k* records are selected, they are sorted by specialty then date, split into ⌈2N/k⌉ groups of at most k/2, and one prompt is made per pair of groups. The tab shows "N records → P prompts" and lists prompt cards ("Prompt 2 of 6 · groups 1+3") with Copy and a copied tick. Copy is disabled below 2 selected records.

## Acceptance criteria

- [ ] Record list shows every library record of the subject and follows the Feed filters; Select all selects only the filtered records.
- [ ] With N ≤ k there is one prompt; above, P = m(m−1)/2 with m = ⌈2N/k⌉, and no prompt holds more than k records.
- [ ] Every pair of selected records appears in at least one prompt.
- [ ] Record blocks have no author name or key.
- [ ] Skip list has only own current-key pairs where both records are in that prompt; other authors' insights never appear.
- [ ] Limit is validated, saved and survives a reload.
- [ ] Copy shows a toast and a copied tick on the card.
- [ ] Unit tests: coverage of every pair for several N and k, prompt count, size cap, record block contents, skip list, limit validation.
- [ ] `npm test` passes.

## Blocked by

- 31-insights-tab-and-insight-list
