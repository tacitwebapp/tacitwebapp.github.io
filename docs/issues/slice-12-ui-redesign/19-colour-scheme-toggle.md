# 19 — Colour-scheme toggle

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §8.2, §10.1.

## What to build

A header control that cycles System, Light and Dark. The choice is stored in `localStorage` as `tacit.theme` (`light` or `dark`; absent means System) and applied before first paint, so a reload shows no flash of the other scheme. The logic that maps a stored value and the system preference to the effective scheme, and gives the next value in the cycle, is a pure function in the new interface-helper module, with unit tests.

## Acceptance criteria

- [x] The header control cycles System, Light, Dark, and its accessible name states the current choice.
- [x] A stored `light` or `dark` overrides the system setting. Choosing System removes the key.
- [x] A reload with a stored choice paints in that scheme with no visible flash.
- [x] Unit tests: stored value beats system; absent follows system; cycle order is System, Light, Dark, System.
- [x] `npm test` passes.

## Blocked by

- 18-design-foundation-and-shell
