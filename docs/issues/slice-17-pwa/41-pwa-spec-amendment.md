# 41 — PWA spec amendment

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §2, §4.1, §8, §12, §14, §15.

## What to build

Edit `docs/SPEC.md` so it describes the PWA before any code lands. No code.

- §2 Non-goals: remove "installable or offline-capable web packaging (manifest, service worker)". Keep "Mobile-native packaging". Add a goal: the app is installable and works offline for everything that does not need peers.
- §4.1: add rows for `manifest.webmanifest`, `sw.js` and `scripts/build-sw.mjs`, plus `icons/`. Note that `sw.js` lives at the repo root, not in `src/`, because a service worker's scope is its own directory and GitHub Pages cannot send `Service-Worker-Allowed`. If a pure helper module is added for the install and storage logic, list it as pure.
- New subsection (suggest §4.3 PWA) stating the decisions: precache of every same-origin app file with a content-hash cache name; cache-first for precached files, `index.html` for navigations, nothing else intercepted (the service worker never touches cross-origin requests, WebSocket or WebRTC); the worker installs but waits, and activates only when the user accepts the update (no automatic `skipWaiting`); all URLs relative so the app also works under a path; `fetch` of precache files uses `cache: 'reload'` to bypass GitHub Pages' 10-minute HTTP cache.
- §8: persistent storage request and what happens when it is denied. IndexedDB version stays 1; an update must never run old and new code against a changed schema without a migration (note for future schema changes).
- §12 risks: stale code cached after a deploy (Mitigated: update flow); an installed iOS app has separate storage from Safari (By design, guided in the UI); evicted storage when not persistent (Partial: persist request, backup reminder); the service worker is a new place for XSS-style persistence, so it must stay free of record data.
- §14: add Phase 5 (PWA).
- §15: add Phase 5 acceptance criteria that mirror the slice 17 standalone test.
- §16: record the open items below if they are not decided: Web Share Target (see backlog), shortcuts in the manifest.

## Acceptance criteria

- [ ] §2 no longer lists installable or offline web packaging as a non-goal.
- [ ] §4.1 and the new PWA subsection state the file layout, scope rule, caching strategy and update rule above.
- [ ] §8, §12, §14 and §15 updated.
- [ ] No contradiction left between the spec and README or glossary (`grep -n -i "service worker\|offline\|install" docs/*.md`).

## Blocked by

None.
