# 27 — Lock the theme and final sweep

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §4.2, §10.1, §10.8, §15 (Phase 3).

## What to build

With every tab on token colours, change the Tailwind config from extending the default palette to replacing it, so only token colours exist. Rebuild, then fix anything that stops rendering: leftover default-palette classes in the HTML and in class bindings in the JavaScript. Then a sweep: check AA contrast for text and controls in both schemes, make sure any transition respects `prefers-reduced-motion`, and update the slice 11 manual steps that name `#feed-author` or rely on the old card layout.

## Acceptance criteria

- [ ] The Tailwind config defines colours only through the tokens, and the default palette is gone.
- [ ] `npm run build:css` succeeds, `vendor/tailwind.css` is committed in sync, and a search of the HTML and JavaScript finds no default-palette colour class.
- [ ] `vendor/VERSIONS.md` still lists the build command and the font.
- [ ] Text, icons and controls meet WCAG AA contrast in light and dark.
- [ ] Transitions, if any, are disabled under `prefers-reduced-motion`.
- [ ] Ticket 17's steps no longer reference removed ids or the card layout.
- [ ] `npm test` passes, with no test edited other than selector updates.

## Blocked by

- 19-colour-scheme-toggle
- 21-author-avatars
- 22-toasts
- 23-keyboard-shortcuts
- 26-guided-empty-states
