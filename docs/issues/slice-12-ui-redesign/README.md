# Slice 12 — Interface redesign

Give Tacit a modern app look and feel: grouped-list layout, light and dark schemes, bundled font, avatars, toasts, keyboard shortcuts and guided empty states.

## Issues
Parent spec: 00-ui-redesign-spec

- 18-design-foundation-and-shell
- 19-colour-scheme-toggle (needs 18)
- 20-feed-rows-and-record-detail (needs 18)
- 21-author-avatars (needs 20)
- 22-toasts (needs 18)
- 23-keyboard-shortcuts (needs 18)
- 24-restyle-extract-and-import-review (needs 18)
- 25-restyle-subjects-and-identity (needs 18)
- 26-guided-empty-states (needs 20, 24, 25)
- 27-lock-theme-and-sweep (needs 19, 21, 22, 23, 26)
- 28-manual-ui-verification (HITL, needs 27)

## Depends on slices
All of slices 01-10. Slice 11 (manual e2e) is independent, but any of its steps that name a changed control must be re-checked after this slice.

## Standalone test
Fresh profile, then a profile with records, drafts, an unknown author's incoming records and trust entries:
1. Network log shows only same-origin requests, including the font.
2. System set to light, then dark: the app follows. Header control forces each scheme and the choice survives a reload with no flash.
3. All five tabs at 390 px and 1280 px, both schemes: no horizontal scroll, readable, tab bar at the bottom below 900 px and navigation at the top above.
4. Feed row opens the record detail. Share, Edit, Delete, Hide, Trust and Block are reachable there by keyboard alone. Focus returns to the row on close.
5. `/`, `g f`, `g e`, `g r`, `g s`, `g i`, `?` and `Esc` work, and do nothing while typing in a field.
6. Same public key shows the same avatar on Feed, review, trust list and Identity, and after a reload.
7. Each empty state in SPEC §10.7 shows on the fresh profile and its button works.
8. Toasts appear for copy, store, share, accept, delete, hide, trust, block and backup export; the import summary, identity message and backup summary stay inline.
9. `npm test` passes.
