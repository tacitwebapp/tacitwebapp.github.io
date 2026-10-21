# 49 — PWA README

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: README.md.

## What to build

Update `README.md` for users and developers. Keep its tone and length.

- Users: Installing (Chrome, Edge, Android, iOS Add to Home Screen) with the iOS separate-storage caveat; working offline and what still needs peers; updating (the banner); storage persistence and why to keep a backup and the key.
- Remove or amend "Tacit is a static site" claims only if they became untrue; the site is still static and still has no backend.
- Developers: `npm run build:sw` (and `npm run build` if added) and when to run it, why `sw.js` sits at the root, how to test the service worker locally (`localhost` is a secure context; DevTools Application > Service Workers, Update on reload, Offline).
- Keyboard-shortcuts table and tab list unchanged.

## Acceptance criteria

- [ ] A new user can install and update from the README alone.
- [ ] A new developer knows to run `build:sw` after editing any precached file.
- [ ] Links resolve.

## Blocked by

- 43-service-worker-offline-shell
- 44-service-worker-update-flow
- 45-install-button-and-ios-guidance
- 46-standalone-mode-polish
- 47-persistent-storage
- 48-offline-status-and-sync-reconnect
