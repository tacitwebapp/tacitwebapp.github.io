# 51 — Works marks: mark a shared record as worked, and see "Works for N (T)"

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §7.3 step 9, §7.8, §8.1, §9.3, §9.4, §10.3, §10.12, §11.1, §12.

## What to build

The tracer bullet for the slice. Add the new pure comment module and give it its Works part first:
- the Works mark template, with a deterministic `d = tacit-works-<record uuid>` and content `{ schemaVersion: 1, type: 'works', target }`;
- the validity check (the uuid in `target` matches the uuid in `d`);
- `worksCount`, which returns N (distinct authors with a valid mark in the library, leaving out the record's author), T (how many of those are trusted or self) and whether the user has marked it.

The record detail sheet gets a **Works** toggle on shared records. Pressing it signs a mark, stores it as shared and sends it to the subject room. Pressing it again sends a deletion and leaves a tombstone, and marking again later signs a newer mark with the same `d`. Next to the toggle, "Works for N (T)" is shown when N > 0, with the tooltip "N people say this worked for them; T of them you trust", and T is shown even when it is 0. On a local record, the toggle is replaced by "Share this record to discuss it". The author may mark their own record; the toggle shows it as marked, but it is not counted.

Receive side: `decideIncoming` accepts an unknown author's Works mark straight into the library as shared and relays it when its content is valid, and drops it otherwise. Works marks never enter the review queue or count toward the 50 cap.

Feed rows show "Works for N (T)" next to the insight badges when N > 0. Deleting a record also deletes the user's own mark on it. The Feed filter, import duplicate check, directory `sharedCount`, record counts and the Insights record list leave marks out. Backup carries marks with the library.

## Acceptance criteria

- [ ] On a shared record, Works marks it, and pressing it again un-marks it (deletion event and tombstone). Marking again after that is accepted by peers.
- [ ] Only one mark per author per record exists. Marking twice is an edit, not a second mark.
- [ ] "Works for N (T)" counts distinct authors, leaves out the record author's own mark, shows T even when 0, and is hidden when N is 0.
- [ ] A blocked or hidden author's marks are not counted.
- [ ] A local record shows no Works toggle, and says "Share this record to discuss it".
- [ ] An unknown author's valid mark goes straight to the library and is relayed. An invalid one is dropped. Neither touches the review queue or its cap.
- [ ] Feed rows show the count.
- [ ] Deleting a record deletes the user's own mark on it, on every peer.
- [ ] Marks are left out of the Feed, import duplicates, `sharedCount` and the Insights record list, and round-trip through backup.
- [ ] Unit tests for the template, validity, `worksCount` and the `decideIncoming` branch, alongside the insight tests' patterns. `npm test` passes.

## Blocked by

None - can start immediately.
