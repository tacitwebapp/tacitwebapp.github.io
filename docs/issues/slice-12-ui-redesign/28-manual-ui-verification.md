# 28 — Manual verification of the interface redesign

Type: HITL
**Status:** TODO

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: the standalone test in the [slice README](README.md); SPEC §15 Phase 3 criteria.

## What to build

A person runs the slice README's standalone test in Chrome on a fresh profile and on a profile with records, drafts, incoming records from an unknown author and trust entries. Run at 390 px and 1280 px, in light and dark, and once keyboard-only. Record the results here and file an issue for each failure. The human marks this DONE.

## Acceptance criteria

- [ ] Network log shows only same-origin requests, including the font.
- [ ] System light and dark are followed, the header control overrides, and the choice survives a reload with no flash.
- [ ] All five tabs usable at 390 px and 1280 px in both schemes, with no horizontal scrolling.
- [ ] Every action in SPEC §7.4 is reachable from the record detail by keyboard alone, and focus returns to the row.
- [ ] Shortcuts work and stay off while typing.
- [ ] The same key shows the same avatar everywhere and after a reload.
- [ ] Each empty state shows on a fresh profile and its button works.
- [ ] Toasts appear for the listed actions; inline results stay inline.
- [ ] Results recorded in this file, and an issue filed for each failure.

## Blocked by

- 27-lock-theme-and-sweep
