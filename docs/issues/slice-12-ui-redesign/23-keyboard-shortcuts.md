# 23 — Keyboard shortcuts

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §10.6.

## What to build

`/` goes to the Feed and focuses search. `g` followed within 1.5 seconds by `f`, `e`, `r`, `s` or `i` goes to Feed, Extract, Import & Review, Subjects or Identity. `?` opens a dialog listing the shortcuts, and Esc closes it. A header button opens the same list for people without a keyboard. A pure resolver in the interface-helper module takes the pending-sequence state, a key description (key, modifiers, whether the target is editable) and the time, and returns an action and the next state.

## Acceptance criteria

- [ ] Each shortcut in the table works.
- [ ] Nothing triggers while focus is in an input, textarea, select or editable element, or while Ctrl, Meta or Alt is held.
- [ ] After `g`, a second key after 1.5 seconds, or any key outside `f e r s i`, cancels the sequence and does nothing.
- [ ] The shortcut dialog opens from `?` and from the header button, moves focus in, and returns focus on close.
- [ ] Unit tests: each shortcut; `g` sequence success and timeout; cancel by another key; editable target ignored; modifiers ignored.
- [ ] `npm test` passes.

## Blocked by

- 18-design-foundation-and-shell
