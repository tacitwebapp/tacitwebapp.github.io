# 24 — Restyle Extract and Import & Review

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §6, §10.1, §10.8.

## What to build

The Extract and Import & Review tabs move to the grouped-list style using the theme tokens and component classes. Selects, text inputs, the file picker and the paste textarea become styled fields in groups. The prompt preview uses the monospace stack. Drafts and each unknown author's incoming records become rows inside groups, with the same buttons, styled as primary, secondary and destructive. The import summary stays inline. Tailwind's default-palette colour classes are replaced by token colours in these two sections, and the CSS is rebuilt.

## Acceptance criteria

- [ ] Both tabs use token colours and component classes; no default-palette colour class (such as `gray-*`, `blue-*`, `green-*`, `red-*`, `amber-*`) remains in their markup.
- [ ] `npm run build:css` was run and `vendor/tailwind.css` is committed in sync.
- [ ] All existing ids, class hooks and behaviour are unchanged (create subject, copy prompt, import by file and paste, store, share, edit, discard, accept, accept all, discard all, trust, block).
- [ ] The import button stays disabled until a subject is selected, and says so.
- [ ] Touch targets are at least 44 px and focus is visible.
- [ ] No horizontal scrolling at 390 px or 1280 px in either scheme.
- [ ] `npm test` passes.

## Blocked by

- 18-design-foundation-and-shell
