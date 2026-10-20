# 18 — Design foundation and app shell

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §4.2, §10.1, §10.2, §10.8.

## What to build

The base the other slices build on. The Tailwind setup becomes part of the repo: a committed config and source stylesheet, `tailwindcss` 3.4.17 as a pinned dev dependency, and an `npm run build:css` script that compiles into the committed `vendor/tailwind.css`. The source stylesheet defines design tokens (colour roles, radii, font stacks) as CSS custom properties with a light and a dark set, and the config maps Tailwind colours, radii and fonts to them, extending (not replacing) the default theme so unmigrated markup keeps working. First component classes (page, group, row, button, field) are built with `@apply`. With no stored preference the app follows the system colour scheme. DM Sans is bundled as a variable WOFF2 in the vendor folder and loaded from the same origin.

The page gets a header with the app name, and its five destinations become a bottom tab bar below 900 px and a top navigation bar from 900 px up. Each tab opens with a large title. Content sits in a centred column of at most 720 px. Feed content is wrapped in the new page layout but is otherwise unchanged.

## Acceptance criteria

- [x] `npm run build:css` regenerates `vendor/tailwind.css` from the committed config and source, and the committed output matches a fresh build.
- [x] `vendor/VERSIONS.md` records the build command and the dev dependency version, replacing the old scratch-directory command.
- [x] Light and dark token sets both exist and the Tailwind theme uses them. Emulating the system light and dark setting switches the app with no stored preference.
- [x] Existing utility classes in unmigrated markup still render as before.
- [x] DM Sans loads from the same origin with a system-font fallback. `vendor/VERSIONS.md` records its version, source and SHA-256, and the licence text is committed next to the file.
- [x] No request on load goes to a third-party host.
- [x] Below 900 px the five destinations show as a bottom tab bar that respects the safe-area inset. From 900 px up they show as a top bar. The selected tab is exposed to assistive technology.
- [x] Tab switching still works, and each tab keeps its `data-tab` attribute and section id.
- [x] Every tab opens with a large title.
- [x] The content column is at most 720 px and centred. No horizontal scrolling at 390 px or 1280 px.
- [x] Interactive elements in the shell have a visible focus ring and are at least 44 × 44 px.
- [x] `npm test` passes and no existing element id was removed.

## Blocked by

None - can start immediately.
