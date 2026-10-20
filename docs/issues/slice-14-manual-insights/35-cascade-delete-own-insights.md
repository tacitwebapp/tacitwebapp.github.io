# 35 — Delete a record's own insights with it

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](00-insights-spec.md). Reference: SPEC §7.6 (Cascade on delete).

## What to build

Deleting one of the user's records also deletes the user's own insights (current key) that point at it, one deletion event each (sent if the insight was shared), and removes the user's insight drafts that point at it. The delete confirmation says "This also deletes N of your insights" when N > 0. Other authors' insights and previous-key insights are not touched; they become invisible under the visibility rule. Editing a record changes nothing. The cascade target list is a pure function in the insight module.

## Acceptance criteria

- [ ] Confirmation shows the count; cancelling deletes nothing.
- [ ] Own shared insights on the record are deleted on every peer and do not come back after re-join.
- [ ] Own insight drafts on the record are removed.
- [ ] Others' and previous-key insights are not deleted.
- [ ] Unit tests: cascade targets include only own current-key insights and drafts on that record.
- [ ] `npm test` passes.

## Blocked by

- 30-insight-model-and-manual-linking
