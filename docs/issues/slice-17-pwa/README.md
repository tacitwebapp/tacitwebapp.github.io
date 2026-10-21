# Slice 17 — Progressive web app

Make Tacit installable and usable offline: a web app manifest, a service worker that precaches the static files, an update flow, install guidance, standalone-mode polish, persistent storage and an offline indicator. Still a static site on GitHub Pages with no backend and no third-party requests.

## Issues
No parent spec file: issue 41 amends SPEC and is the parent for the rest.

- 41-pwa-spec-amendment
- 42-web-app-manifest-and-icons (needs 41)
- 43-service-worker-offline-shell (needs 42)
- 44-service-worker-update-flow (needs 43)
- 45-install-button-and-ios-guidance (needs 42, 43)
- 46-standalone-mode-polish (needs 42)
- 47-persistent-storage (needs 41)
- 48-offline-status-and-sync-reconnect (needs 43)
- 49-pwa-readme (needs 43-48)
- 50-manual-pwa-verification (HITL, needs 42-49)

## Depends on slices
- slice-09-backup-restore (install guidance points to backup and key export)
- slice-12-ui-redesign (toasts, colour scheme, safe-area classes)

## Standalone test
On a deployed copy (HTTPS, or `localhost`), with a profile that has records, a subject and an identity:
1. Chrome (desktop and Android) offers Install; DevTools Application > Manifest shows no errors and installable.
2. Install, open from the app icon: standalone window, no browser bar, Tacit icon, status bar matching the colour scheme.
3. Go offline (DevTools or aeroplane mode), reload, close and reopen: the app loads, the library, drafts, Map and Extract work. The header shows an offline indicator; it clears when back online and rooms rejoin.
4. Push a change and redeploy: an open install shows "Update available"; Reload applies it and nothing is lost. A second open tab or window is not reloaded without asking.
5. Identity shows that storage is persistent (or why not) and `npm test` fails if the precache list is stale.
6. On iOS Safari, Add to Home Screen follows the in-app guidance; the guidance says the installed app starts with an empty profile and how to move the key and backup across.
7. Network log shows only same-origin requests, including through the service worker.
