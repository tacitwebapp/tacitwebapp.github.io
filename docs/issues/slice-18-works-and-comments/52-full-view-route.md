# 52 — Full view: a routed page for one record

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §10.3, §10.8, §10.13.

## What to build

A page of its own for one record at `#/tacit/<8 hex of the short ID>`. The router parses it as `{ tab: 'tacit', id }` and builds it back. It is not a navigation destination; the Feed stays selected in the navigation.

The record detail sheet gets an **Open** button that goes to the full view. The full view shows the record as the sheet does, with its actions, its Relations section, and the Works toggle and count from 51. The short ID is resolved against the library:
- no match shows "Not in your library yet";
- more than one match shows a list of the matches (author and preview) to pick from.

A **Back** control returns to the previous route, or to the Feed when the page was opened directly. On open, focus moves to the page heading. Visiting the URL after a reload opens the same view. This issue adds no comments; it is the surface 53 builds on.

## Acceptance criteria

- [ ] **Open** in the record detail goes to `#/tacit/<id>` and shows the record, its actions, Relations and Works.
- [ ] Reloading on that URL shows the same view.
- [ ] Back returns to where the view was opened from. When the page was opened directly, Back goes to the Feed.
- [ ] An unknown id shows "Not in your library yet". An ambiguous id shows a pick list.
- [ ] Focus moves to the heading on open, and every control is keyboard-operable.
- [ ] Usable at 390 px and 1280 px in both schemes, with no horizontal scrolling.
- [ ] Route tests cover parsing, building and a malformed id. `npm test` passes.

## Blocked by

- 51-works-marks
