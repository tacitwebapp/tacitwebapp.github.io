# 46 — Standalone mode polish

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

Slice 17 README. Reference: SPEC §10.1, §10.2.

## What to build

Make the installed window look native and keep it correct on notched phones.

- Add `viewport-fit=cover` to the viewport meta. The CSS already uses `env(safe-area-inset-*)` in `.app-header`, `.tabbar` and `.toasts`, but those are 0 until the viewport covers the screen. Check left and right insets in landscape and sheets/dialogs near the edges.
- Keep `<meta name="theme-color">` in step with the app's resolved scheme. Today the scheme can come from the system or from the `tacit.theme` override (SPEC §10.1). Static media-query meta tags (issue 42) are right for "follow system"; when the user forces light or dark, replace them with one tag whose `content` is the matching `--c-page` colour, and restore the pair on "System". Extend `resolveTheme` in `tacit-ui.js` (pure) or add a sibling to return the colour, with tests.
- Standalone-only CSS (`@media (display-mode: standalone)`): `overscroll-behavior-y: none` on the page so pull-to-refresh does not reload and lose form state; `-webkit-tap-highlight-color: transparent`; `user-select` unchanged for text.
- Check that the `/` and `g` shortcuts and Esc still work with no browser chrome.
- Rebuild `vendor/tailwind.css` and `sw.js`'s block if CSS or classes change.

## Acceptance criteria

- [ ] On an iPhone with a notch, header, tab bar and toasts clear the notch and home indicator in portrait and landscape.
- [ ] Forcing the other scheme in the app changes the status/title bar colour with no flash after reload.
- [ ] Pull-to-refresh does not trigger in the installed app.
- [ ] Unit tests for the theme-colour function.
- [ ] `npm test` passes.

## Blocked by

- 42-web-app-manifest-and-icons
