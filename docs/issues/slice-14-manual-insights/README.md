# Slice 14 — Manual insights

Let users relate records in a subject (conflicts, supersedes, reinforces, refines, duplicates, alternative to, prerequisite of) by hand, share those insights like records, review other authors' insights, and see superseded and disputed records in the Feed.

## Issues
Parent spec: 00-insights-spec (also parent of slices 15 and 16)

- 30-insight-model-and-manual-linking
- 31-insights-tab-and-insight-list (needs 30)
- 34-incoming-insights-review (needs 30)
- 35-cascade-delete-own-insights (needs 30)
- 36-feed-badges (needs 30)
- 39-manual-insights-verification (HITL, needs 31, 34, 35, 36)

## Depends on slices
- slice-04-edit-and-delete, slice-07-trust-management, slice-08-feed-filters, slice-12-ui-redesign, slice-13-specialty

## Standalone test
Two profiles A and B, both subscribed to subject S with a few shared records each, B not trusting A:
1. A opens a record, Link… → supersedes another record, Share. B sees the insight in review with both records; Accept; the older record is faded with a Superseded badge in B's Feed.
2. A links the same pair again with a different relation: the existing insight opens for editing; B ends up with the edited one only.
3. A tries to share an insight that involves a local record: refused with "Share record t:xxxx first".
4. `g n` opens Insights; the link form creates an insight; the insight list groups by pair and relation with counts and filters.
5. B hides A's insight: the badge disappears for B only.
6. A deletes a record with insights: the confirmation shows the count; B loses those insights.
7. `npm test` passes.
