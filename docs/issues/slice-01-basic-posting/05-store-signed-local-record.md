# 05 — Store a draft as a signed local record and show it in the Feed

Type: AFK
**Status:** DONE

## What to build

"Store" on a draft signs it with the user's identity as an addressable app event (kind 30078, a `d` tag `tacit-entry-<uuid>`, a `subject` tag, and the record content as JSON). The signed record goes into the library in IndexedDB with visibility `local`, and the draft is removed. The Feed tab reads the library and shows cards with the subject label, information chunk, actionable workflow, author (short npub or "you"), verified badge, created date, visibility and warnings. A record's identity is author public key plus `d`.

Reference: SPEC §7.1, §7.4 (Store), §8.1 (`library`), §10 (Feed).

## Acceptance criteria

- [x] Storing a draft produces an event that passes `verifyEvent`, and its content matches the draft.
- [x] The record shows in the Feed as local, authored by "you", with a verified badge.
- [x] The library survives a reload.
- [x] Record data is rendered as text only; no HTML from records is interpreted.
- [x] Unit tests: building the record template; a sign → verify round trip; changing `content` makes verification fail.

## Blocked by

- 02-local-identity
- 04-import-to-drafts
