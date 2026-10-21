# 43 — Service worker with an offline app shell

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §4.3, §12.

## What to build

Add `sw.js` at the repo root and register it from `src/tacit-main.js` (relative URL, only when `'serviceWorker' in navigator`, after `Alpine.start()`, failure logged and ignored).

- **Precache.** A generated block in `sw.js` between `// BEGIN GENERATED` and `// END GENERATED` lists every file needed to run: `index.html`, `manifest.webmanifest`, `icons/*`, `src/*.js`, `vendor/*` (including the font and `tailwind.css`), and a `VERSION` that is a SHA-256 over the listed files' names and contents. The cache is named `tacit-<VERSION>`.
- **Build script.** `scripts/build-sw.mjs` regenerates the block; add `npm run build:sw`. Like `vendor/tailwind.css`, the output is committed and there is no build on deploy.
- **Install.** Fetch each file with `cache: 'reload'` so GitHub Pages' HTTP cache cannot supply an old copy, and fail the install if any fetch is not `ok`. Do not call `skipWaiting` (issue 44 owns that).
- **Activate.** Delete caches named `tacit-*` other than the current one. Do not claim clients on first install unless 44 says so.
- **Fetch.** Same-origin `GET` only. Navigations get cached `index.html`. Precached paths are cache-first. Anything else, and everything cross-origin, goes to the network untouched; no runtime caching.
- Moving the SW or changing the file layout later must not need hand edits: the script derives the list from the tree with an explicit ignore list (`node_modules`, `docs`, `tests`, `scripts`, `.git`, `package*.json`, `tailwind.config.js`, `README.md`, `sw.js`).
- Update README Development section with `npm run build:sw` and the rule "run it after any change to a precached file, including `npm run build:css`". Consider an `npm run build` that runs both.

## Acceptance criteria

- [ ] After one online load, going offline and reloading, closing and reopening the tab all work; Feed, Extract, Import, Insights, Map, Subjects and Identity render.
- [ ] Offline, a hard reload of the site URL returns the app, not the browser error page.
- [ ] No cross-origin request is handled by the worker; WebSocket relay connections are unaffected.
- [ ] Old caches are removed after an update.
- [ ] Unit test: the committed generated block matches a fresh run of the script, so editing any precached file without rebuilding makes `npm test` fail.
- [ ] Unit tests (SW loaded with a fake `self`, `caches` and `fetch`): navigation maps to `index.html`, a precached path is served from cache, a cross-origin or non-GET request is not intercepted, install rejects on a failed fetch, activate keeps only the current cache.
- [ ] `npm test` passes.

## Blocked by

- 42-web-app-manifest-and-icons
