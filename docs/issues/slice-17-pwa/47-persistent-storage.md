# 47 — Persistent storage

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §8, §11, §12.

## What to build

The library, key and drafts live only in the browser, and the browser may evict them under storage pressure unless the origin is persistent. Ask for it and show the result.

- Call `navigator.storage.persist()` (if present) after the first thing worth keeping exists: the first stored or shared record, or key export. Not on load, since some browsers grant it only on engagement and a prompt on an empty profile is noise. Call `persisted()` first and skip the request if already granted. Store nothing extra; the browser remembers.
- Identity tab: a "Storage" row showing Persistent / Not persistent / Unsupported, and `navigator.storage.estimate()` usage and quota in human units.
- When not persistent, a one-line note: your data may be cleared by the browser; export a backup and your key. Link to those controls. No nagging toast.
- Keep the decision in a pure function (`{ persisted, supported, recordCount }` to `'request' | 'skip'`) and the formatting in a pure helper; both tested.

## Acceptance criteria

- [ ] Chrome: after the first stored record the origin becomes persistent (installed apps are usually granted automatically); Identity shows it.
- [ ] A browser that refuses shows the note and backup links; one without the API shows "Unsupported" and does not error.
- [ ] No request on a fresh profile with no data.
- [ ] Unit tests for the decision and formatting helpers.
- [ ] `npm test` passes.

## Blocked by

- 41-pwa-spec-amendment
