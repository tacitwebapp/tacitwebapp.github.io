# 54 — Thread display: indent caps, "replying to" and collapse

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §10.8, §10.13 (Nesting, collapse).

## What to build

Make deep threads readable at any width. Each level of replies is indented one step, up to 4 levels below 900 px and 8 from 900 px up. Deeper replies stay at the last level and start with "↳ replying to <author label>". The author label is the parent's, as shown elsewhere: nickname, shared name, "You" or short npub.

Any comment with replies has a control that collapses its subtree to "▸ N replies", where N counts every shown comment below it, and expands it again. Collapsed state lasts for the session only. The control is keyboard-operable and exposes its expanded state.

## Acceptance criteria

- [ ] At 390 px, replies 6 levels deep stop indenting at level 4, and levels 5 and 6 show "↳ replying to <name>".
- [ ] At 1280 px, the indent stops at level 8.
- [ ] No horizontal scrolling at either width, in both schemes.
- [ ] Collapsing a comment hides its whole subtree behind "▸ N replies" with the right N, and expanding restores it.
- [ ] The collapse control works by keyboard and announces expanded or collapsed.
- [ ] If the depth and "replying to" data come from `buildThread`, unit tests cover them. `npm test` passes.

## Blocked by

- 53-comments-and-nested-replies
