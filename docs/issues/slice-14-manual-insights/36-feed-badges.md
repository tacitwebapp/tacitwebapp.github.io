# 36 — Superseded and Conflicts badges in the Feed

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](00-insights-spec.md). Reference: SPEC §10.9.

## What to build

From visible insights in the library, compute per record: superseded (some visible insight says another record supersedes it) and the number of distinct records it has a visible `conflicts` insight with. Feed rows show a **Superseded** badge and are faded, and a **Conflicts (n)** badge. Selecting a badge opens the record detail at its Relations section. The badge computation is a pure function in the insight module.

## Acceptance criteria

- [ ] A superseded record is badged and faded; it stops being so when the insight is hidden, deleted or loses a record.
- [ ] Conflicts (n) counts distinct records, so two authors flagging the same pair count once.
- [ ] Insights in review do not count.
- [ ] Badges are readable in both schemes and announced as text.
- [ ] Unit tests: superseded, conflict count over distinct records, invisible insights ignored.
- [ ] `npm test` passes.

## Blocked by

- 30-insight-model-and-manual-linking
