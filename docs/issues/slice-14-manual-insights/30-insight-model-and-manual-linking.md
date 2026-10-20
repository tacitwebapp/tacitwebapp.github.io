# 30 — Insight model and linking from the record detail

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](00-insights-spec.md). Reference: SPEC §6.4 (Manual linking), §7.6, §8.1, §9.3, §9.4, §10.3.

## What to build

The tracer bullet for insights. Add a new pure insight module with the seven relation types, short IDs (`t:` + the first 8 hex characters of the `d` uuid) and their resolution, the insight template with deterministic `d = tacit-link-<uuidA>-<uuidB>` (sorted, with symmetric pairs stored sorted), the edit template, the "shared needs shared" check and the visible-insight filter.

The record detail shows the record's short ID, a **Link…** action (pick a relation, then pick record B from the same subject by search, then an optional rationale, then Store or Share) and a **Relations** section that lists visible insights grouped by relation type, with Edit and Delete for the user's own (current key), Hide for others, and Share for the user's own local insights. Linking a pair the user already linked opens that insight for editing.

Insights are stored in `library` and sync as kind-30078 events with no pipeline change. The Feed, the record import duplicate check and the directory `sharedCount` leave insights out.

## Acceptance criteria

- [ ] Link… from the record detail creates an insight with `source: 'manual'`, stored local or shared.
- [ ] Share is refused with "Share record t:xxxx first" when either record is local.
- [ ] A second link by the same author on the same pair edits the first; `d` is the same.
- [ ] The Relations section shows only visible insights. An insight whose other record is missing, hidden or tombstoned is not shown.
- [ ] Edit (relation, direction, rationale), Delete and Hide work as §7.6, and Delete and Edit are offered only for the current key.
- [ ] A shared insight reaches a peer in the subject room and a peer who joins later.
- [ ] Insights do not appear in the Feed, are not counted in `sharedCount`, and do not affect the record import duplicate check.
- [ ] Unit tests: short ID and resolution (no match, ambiguous), template and `d`, sorted symmetric pairs, edit keeps `d`, shared-needs-shared, visible filter, `decideIncoming` on insight events, `filterFeed`, `buildDrafts` and `announcementFor` leave insights out.
- [ ] `npm test` passes.

## Blocked by

None - can start immediately.
