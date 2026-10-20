# 31 — Insights tab: link form and insight list

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-insights-spec](00-insights-spec.md). Reference: SPEC §6.4 (Manual linking, Insight list), §10, §10.2, §10.6, §10.7.

## What to build

A new **Insights** tab after Import & Review, with an icon, the `g n` shortcut and its empty states. It has a subject selector, a manual link form (record A, relation, record B, optional rationale, Store or Share); and the subject's insight list. The list is grouped by pair and relation type with a count ("conflicts ×2"), expands to each insight with its author and rationale, filters by relation type and author group, and has the §7.6 actions. Grouping lives in the pure insight module.

## Acceptance criteria

- [ ] Tab order is Feed, Extract, Import & Review, Insights, …; `g n` opens it and does nothing while typing.
- [ ] Link form creates the same insight as Link… in the record detail, with the same rules.
- [ ] Insight list groups by pair and relation with counts, expands to authors and rationales, and filters work.
- [ ] Empty states: fewer than 2 records (Go to Extract); records but no visible insights.
- [x] Unit tests: grouping by pair and relation with counts; shortcut resolver handles `g n`.
- [x] `npm test` passes.

## Blocked by

- 30-insight-model-and-manual-linking
