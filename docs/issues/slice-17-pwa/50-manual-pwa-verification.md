# 50 — Manual verification of the PWA

Type: HITL
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §15 (Phase 5).

## What to build

Nothing. A human runs the slice 17 standalone test on the deployed GitHub Pages site and records the results here.

Devices: desktop Chrome, Android Chrome, iOS Safari (iPhone with a notch). Also run Lighthouse's PWA / installability checks on the deployed URL.

## Acceptance criteria

- [ ] Slice 17 standalone test passes on each device.
- [ ] Update flow checked with a real second deploy, with the app open on a phone.
- [ ] iOS: install guidance accurate; empty profile confirmed; key export plus backup import restores the library in the installed app.
- [ ] SPEC §15 Phase 5 items checked; third-party request check still clean with the worker active.
- [ ] Any failure is filed as an issue or backlog item.

## Blocked by

- 42-web-app-manifest-and-icons
- 43-service-worker-offline-shell
- 44-service-worker-update-flow
- 45-install-button-and-ios-guidance
- 46-standalone-mode-polish
- 47-persistent-storage
- 48-offline-status-and-sync-reconnect
- 49-pwa-readme
