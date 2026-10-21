# 42 — Web app manifest and icons

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §4.3 (after 41).

## What to build

Add `manifest.webmanifest` at the repo root and link it from `index.html`:

- `name` "Tacit Knowledge", `short_name` "Tacit", `description`, `lang`, `start_url` "./", `scope` "./", `id` "./", `display` "standalone", `orientation` "any".
- `theme_color` and `background_color` taken from the light tokens in `src/tacit.src.css` (`--c-accent` / `--c-page`). Dark values go into the `<meta name="theme-color" media="(prefers-color-scheme: dark)">` pair in `index.html`; a manifest cannot hold both. Issue 46 keeps the meta tags in step with the in-app toggle.
- Icons: 192 and 512 PNG (`purpose: any`), 512 maskable PNG with the glyph inside the safe zone, 180 `apple-touch-icon`, and an SVG source. Replace `<link rel="icon" href="data:,">` with a real favicon. A simple mark on the accent colour is enough; no new font or runtime asset.
- Icons live in `icons/`. Produce the PNGs once with any tool (browser, ImageMagick, `rsvg-convert`), commit SVG and PNGs, and record the command in `icons/README.md`. Do not add a dev dependency.
- Add `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-title` and `apple-mobile-web-app-status-bar-style`.
- Confirm GitHub Pages serves `.webmanifest` as `application/manifest+json` on the deployed site; if not, record it and use `manifest.json`.

## Acceptance criteria

- [ ] DevTools Application > Manifest shows no warnings; icons render, including maskable preview.
- [ ] Chrome offers Install on `localhost` (with 43, on the deployed site).
- [ ] Every path in the manifest and `index.html` is relative and resolves.
- [ ] Network log on load shows only same-origin requests.
- [ ] Unit test: manifest is valid JSON, has the required members, every icon file exists and has the declared size.
- [ ] `npm test` passes.

## Blocked by

- 41-pwa-spec-amendment
