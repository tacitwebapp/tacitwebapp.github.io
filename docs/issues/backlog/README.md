# Backlog

Unscheduled work found during slices 01-10 and the whole-spec review. Not part of the slice graph. Items already tracked elsewhere are listed at the end.

Statuses: `TODO` unless noted. Types: AFK (agent can do), HITL (needs a human decision or manual run).

## B1 — Backup import trusts every author

Type: HITL (decision)

`restoreBackup` treats all authors as trusted, so a hand-built backup can add validly signed records and trusted pubkeys without review, and bypass the pending cap (`tacit-backup.js` ~l.44-67). Spec says restore into a fresh key, so own-key-only trust would break that. Decide: accept as-is, or send records by non-self/non-previous keys through review.

- [ ] Decision recorded in SPEC §11.1.
- [ ] If tightened: unit tests and live check that restoring own backup in a fresh profile still works.

## B2 — Old tombstones for deleted local records still sent

Type: AFK

Versions before `5cfd483` stored tombstones for deleted local-only records. `sendShared` still sends them to new peers, leaking the `d` and subject label (SPEC §2).

- [ ] `sendShared` only sends tombstones for records that were shared (or purge such tombstones on load).
- [ ] Unit test.

## B3 — Unit tests for app-level fixes

Type: AFK

No tests for the `reload()` unparseable-row guard, the local-delete path, or the `needsPassword` join guard in `tacit-app.js`. They depend on Alpine and IndexedDB, so extract the logic into pure functions or add a harness.

- [ ] Each of the three has a test.

## B4 — Relay accepted records to current peers

Type: AFK

SPEC §7.3 step 8: "upsert into the library as `shared`, and relay it to the current peers in R". The `accept` branch in `receiveFromPeer` only stores (`tacit-app.js` ~l.215).

- [ ] Accepted record is relayed to the other peers in the room, with loop protection.
- [ ] Live check with three Chrome contexts.

## B5 — Identity tab: relay URLs and room status

Type: AFK

SPEC §10 Identity tab lists relay URLs; §9.5 lists each room's status (joined, peer count). Neither is in `index.html`.

- [ ] Both shown.

## B6 — Edit `actionable_workflows`

Type: AFK

SPEC §7.4: re-sign with the same `d`. `editRecord` edits only `information_chunks` and uses `prompt()` (`tacit-app.js` ~l.169).

- [ ] Both fields editable, with a proper form instead of `prompt()`.
- [ ] Unit test for the edit template.

## B7 — Discover: repeated slug per peer inflates counts

Type: AFK

SPEC §9.4 caps 100 announcements per peer, but one peer can repeat the same slug 100 times and inflate that subject's peer count (`tacit-sync.js` ~l.30-35, `groupDiscover`). Low severity.

- [ ] Dedupe by slug per peer before counting.
- [ ] Unit test.

## B8 — Verification gaps (not live-tested)

Type: HITL

- [ ] Nickname shown on review cards.
- [ ] "Trusted" author filter returning a match, live.
- [ ] Malformed Discover announcements beyond `__proto__`, live.
- [ ] Real NIP-07 extension (nos2x / Alby); tests used a fake `window.nostr`.
- [ ] Real browser save-to-disk of the backup file (tests read the Blob).

## B9 — Smell cleanups (low priority)

Type: AFK

From the review, judgement calls only:

- [ ] `tagValue(event, name)` helper for the repeated subject-tag lookup (`tacit-events.js`, `tacit-backup.js`, `tacit-app.js`) and a shared pubkey regex.
- [ ] Remove `isValidRecord` in `tacit-events.js` if unused outside tests.
- [ ] Rename `known` / `held` / `retireKey` in `tacit-backup.js` for clarity.
- [ ] Replace the faked `{ has: () => true }` context in `restoreBackup` with an explicit option to `decideIncoming`.

## B10 — In-browser candidate-pair suggestions

Type: HITL (decision)

From the insights grilling: run a small sentence-embedding model (about 25 MB, self-hosted and vendored with its WASM runtime) to rank pairs by similarity, suggest `duplicates` as insight drafts above a threshold, and feed only the top pairs into insight prompts. Needs a SPEC §2 amendment (currently no model in the browser). Becomes worth it when subjects routinely hold more than about 100 records.

- [ ] Decision recorded in SPEC §2.
- [ ] If accepted: suggestions land as insight drafts, never signed automatically.

## B11 — Insights across subjects

Type: HITL (decision)

Insights are same-subject only (SPEC §7.6). Cross-subject links need a routing rule (two rooms or two events), a "foreign record" node on the map, and must not reveal private subjects.

- [ ] Decision and routing rule recorded.

## B12 — Drag-to-link on the Tacit Map

Type: AFK

Create an insight by dragging from one record node to another, opening the link form with both records filled in. Pointer only; the form stays the keyboard path.

- [ ] Works with mouse and touch.

## B13 — "Hide superseded" Feed filter

Type: AFK

A Feed filter that leaves out superseded records (SPEC §10.9), if faded rows prove not enough.

- [ ] Filter in `filterFeed` with unit test.

## B14 — Keyboard navigation inside the Tacit Map

Type: AFK

SPEC §10.8 exempts the map canvas. Arrow keys through nodes in layout order, `[`/`]` to follow relations, Enter to open, `aria-live` announcements.

- [ ] Map usable by keyboard; §10.8 exemption removed.

## B15 — In-house SVG map renderer

Type: HITL (decision)

Replace Cytoscape with inline SVG if it proves too limiting. Only the drawing layer changes; positions already come from `tacit-map.js`.

- [ ] Decision with the limitation that triggered it.

## Tracked elsewhere

- Ticket 06 (slice 02): PARTIAL — no dev hook to tamper an event in transit; unsubscribed-subject share not run by hand.
- Ticket 17 (slice 11): HITL manual e2e run of SPEC §13 and §15; the human marks it DONE.
