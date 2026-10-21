# 45 — Install button and iOS guidance

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §10, §11, §12.

## What to build

An install entry in the Identity tab (not the header, to keep it uncluttered), shown only when it can do something.

- Capture `beforeinstallprompt` (call `preventDefault`, keep the event). Show **Install Tacit** when the event is held; clicking calls `prompt()`, then clears the event. Hide on `appinstalled` and when already running standalone (`matchMedia('(display-mode: standalone)')` or `navigator.standalone`).
- iOS Safari fires no install event. Detect iOS and not standalone, and show a short guide instead: Share, then Add to Home Screen.
- The iOS guide must say what is not obvious: the installed app has its own storage and starts empty, separate from the Safari tab. Tell the user to install before creating data, or to export their key (Identity) and a backup, then import both in the installed app. Backups do not contain the private key (SPEC §11), so both steps are needed. Link or scroll to those controls.
- Use existing classes and empty-state / group patterns from SPEC §10; no new visual language. Text via Alpine `x-text`.
- Put the display-mode and platform detection in a pure helper that takes `{ userAgent, standalone, displayModeStandalone, hasPromptEvent }` and returns `'install' | 'ios-guide' | 'installed' | 'none'`.

## Acceptance criteria

- [ ] Chrome: button appears only before install, installs, and disappears.
- [ ] Standalone window shows no install entry.
- [ ] iOS Safari shows the guide with the storage warning; Android Chrome and desktop do not.
- [ ] Unit tests for the helper over the four outcomes and a few real user-agent strings.
- [ ] `npm test` passes; button passes keyboard-only use (SPEC §10.8).

## Blocked by

- 42-web-app-manifest-and-icons
- 43-service-worker-offline-shell
