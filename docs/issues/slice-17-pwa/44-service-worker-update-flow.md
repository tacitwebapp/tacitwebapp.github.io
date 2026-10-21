# 44 — Service worker update flow

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §4.3, §10.5, §12.

## What to build

A new deploy must reach installed users without breaking an open session or losing data.

- The new worker installs and waits. The page detects it (`registration.waiting`, or `updatefound` then `installed` while a controller exists) and shows a persistent toast or banner "A new version of Tacit is ready" with **Reload**. It reuses the toast component (SPEC §10.5) or a variant that does not auto-expire.
- **Reload** posts `{ type: 'SKIP_WAITING' }` to the waiting worker; the page reloads once on `controllerchange`, guarded against reload loops and against a first install (no previous controller).
- Check for updates on load, when the tab becomes visible after more than an hour, and then hourly while open, so a long-lived installed window still updates.
- Do not reload automatically. Unsaved Link forms, draft edits and pasted import text would be lost.
- With several tabs or windows open, only the one where the user pressed Reload reloads on its own; the others show the same banner.
- Put the decision logic (is an update waiting, should the reload fire) in a small pure helper so it is testable without a browser.

## Acceptance criteria

- [ ] Build and deploy a trivial change: an open install shows the banner within an hour or on next focus; Reload applies it.
- [ ] Declining keeps the old version running with no data loss; reload by hand later picks up the new one.
- [ ] No reload loop on first install, on repeated Reload clicks, or with two tabs.
- [ ] Unit tests for the helper: first install, update waiting, controllerchange once.
- [ ] `npm test` passes.

## Blocked by

- 43-service-worker-offline-shell
