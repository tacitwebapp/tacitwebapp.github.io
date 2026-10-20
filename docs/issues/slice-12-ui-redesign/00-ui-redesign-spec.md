# 00 — Interface redesign: grouped lists, themes, avatars, toasts, shortcuts, empty states

**Status:** PARENT SPEC. Delivered by issues 18-28; not picked up directly.

Reference: SPEC §4, §8.2, §10.1–10.8, §13, §15 (Phase 3). Choices were made from an options sheet; see Further Notes.

## Problem Statement

Tacit works, but it looks like a prototype. Every screen is a white box on grey with blue buttons, filters and actions are cramped, and the Feed card shows everything at once, so a long feed is hard to scan. It has no dark mode, no way to tell authors apart at a glance, status messages appear as small inline text that is easy to miss, and a new user lands on empty screens with no hint of what to do next. On a phone the tab row wraps and the forms feel like a desktop page squeezed down.

## Solution

Tacit becomes a modern app. Each screen opens with a large title and shows its content in rounded, grouped lists. The Feed is a scannable list; tapping a record opens its full detail and actions. Navigation is a tab bar at the bottom on phones and a top bar on wide screens. The app follows the system light or dark setting, with a header control to override it. Authors get a stable coloured avatar. Confirmations appear as short toasts. Keyboard shortcuts move between screens and focus search. Every empty screen explains what goes there and offers the next step. The font is bundled, so nothing is fetched from a third party.

## User Stories

1. As a new user, I want each empty screen to tell me what goes here and offer the next step, so that I know how to get started without reading documentation.
2. As a new user on an empty Feed, I want a one-sentence description of Tacit and a button to Extract, so that I begin with the right first action.
3. As a user, I want each screen to open with a large title, so that I always know where I am.
4. As a phone user, I want a tab bar at the bottom of the screen, so that I can switch screens with my thumb.
5. As a desktop user, I want the same destinations in a top navigation bar, so that the layout uses the screen sensibly.
6. As a user, I want the content in a centred column of comfortable width, so that long lines are easy to read on a wide monitor.
7. As a user, I want touch targets of at least 44 px, so that I do not mis-tap on a phone.
8. As a user, I want the app to match my device's light or dark setting by default, so that it does not glare at night.
9. As a user, I want a header control to choose System, Light or Dark, so that I can override my device for this app only.
10. As a user, I want my colour choice remembered across reloads, so that I set it once.
11. As a user, I want the page to load in the right scheme with no flash of the other, so that the app does not blink at me.
12. As a user, I want the app text in a clean bundled typeface, so that it looks the same on every device.
13. As a privacy-minded user, I want no font or style loaded from a third party, so that opening Tacit reveals nothing to anyone.
14. As a reader, I want Feed rows to show the subject, a two-line preview, the author and the date, so that I can scan many records quickly.
15. As a reader, I want to tap a row to see the full information chunk and actionable workflow, so that I can read one record properly.
16. As an author, I want Share, Edit and Delete in the record detail for my own records, so that the list stays uncluttered.
17. As a reader, I want Hide, Trust author and Block author in the record detail for other people's records, so that I can curate from one place.
18. As a keyboard user, I want to open a record, act on it and close it without a mouse, so that I can use the app efficiently.
19. As a user, I want closing the detail to return me to the row I came from, so that I do not lose my place in a long Feed.
20. As a user, I want Esc or a tap outside to close the detail, so that dismissing is quick.
21. As a user, I want the author filter as a segmented control (All, Mine, Trusted, Others), so that changing it is one tap.
22. As a user, I want subject and visibility filters and the search field in one filter group, so that narrowing the Feed is in one place.
23. As a user whose filters match nothing, I want a clear message and a Clear filters button, so that I can recover in one click.
24. As a user, I want each author to have a round avatar coloured from their public key, so that I can recognise the same person across the app.
25. As a user, I want an author's avatar to look identical on every device and after reload, so that I can rely on it.
26. As a user, I want the avatar to carry an initial taken from the author label I already see, so that nicknames I set show up.
27. As a screen-reader user, I want the author label read as text and the avatar ignored, so that I do not hear decoration.
28. As a user reviewing unknown authors, I want avatars on each author group, so that I can tell groups apart quickly.
29. As a user managing trust, I want avatars in the trust list, so that I can spot an author I know.
30. As a user, I want "Copied" and similar confirmations as toasts, so that I notice them without hunting for small text.
31. As a user, I want toasts for store, share, accept, edit, delete, hide, trust, block and backup export, so that I get feedback on every action.
32. As a user, I want at most three toasts on screen and repeated ones merged, so that a burst of actions does not bury the page.
33. As a user, I want toasts to disappear on their own and be dismissible, so that they stay out of my way.
34. As a user, I want failures to be announced and to stay a little longer, so that I do not miss them.
35. As a user, I want the import summary, identity messages and backup restore summary to stay on screen, so that I can read the details at my own pace.
36. As a screen-reader user, I want toasts announced politely, and failures announced assertively, so that I hear what happened.
37. As a keyboard user, I want `/` to jump to Feed search, so that I can find a record without the mouse.
38. As a keyboard user, I want `g` then a letter to switch screens, so that I can navigate without the mouse.
39. As a keyboard user, I want `?` to list the shortcuts, so that I can learn them.
40. As a user typing in a field, I want shortcuts to stay off, so that I never trigger one by accident.
41. As a user who does not use a keyboard, I want a header button for the shortcut list, so that I can still read it.
42. As a user with a screen reader, I want selected states on the tab bar and segmented controls, so that I know where I am.
43. As a user with low vision, I want contrast that meets AA in both schemes, so that I can read everything.
44. As a keyboard user, I want a clearly visible focus ring everywhere, so that I never lose track of focus.
45. As a user who prefers reduced motion, I want transitions to be off, so that the app does not make me uncomfortable.
46. As an existing user, I want my records, keys, trust list and subjects to be unchanged after the redesign, so that I lose nothing.
47. As an existing user with the NIP-07 extension, I want signing to behave exactly as before, so that the redesign does not affect my identity.
48. As a maintainer, I want design tokens in one place and a one-command CSS rebuild, so that restyling is a small edit.
49. As a maintainer, I want the existing element ids and behaviour hooks kept, so that the current tests and manual checks keep working.
50. As a maintainer, I want pure helpers for avatar, shortcuts, toasts and theme tested by `npm test`, so that the logic has a regression guard.

## Implementation Decisions

- **Direction.** Grouped lists: large title per screen, inset rounded groups on a tinted background, hairline-separated rows with chevrons, segmented controls for small fixed choices. Chosen from six options; the others (workbench sidebar, index cards, timeline, ledger, reader) are not used.
- **Styling.** Tailwind stays, themed. Design tokens are CSS custom properties (colour roles, radii, font stacks), one set per scheme, in a committed source stylesheet. The Tailwind config maps its colours, radii and fonts to the tokens, so utilities follow the active scheme without `dark:` variants. Repeated patterns become component classes built with `@apply`. A dev-time `npm run build:css` compiles the source into the committed `vendor/tailwind.css`; nothing builds on deploy or at runtime. Tailwind's default palette stays available during migration and is dropped in the final issue.
- **Schemes.** Light and dark token sets are both designed and checked for AA contrast. Default follows `prefers-color-scheme`. A header control cycles System, Light, Dark. A stored `light` or `dark` value overrides; no stored value means System. The effective scheme is applied before first paint.
- **Fonts.** DM Sans as one variable WOFF2 (Latin subset) committed in the vendor folder with its licence and an entry (version, source, SHA-256) in `VERSIONS.md`. Loaded from the same origin with a swap strategy and a system-font fallback. No third-party font host.
- **Navigation.** Five destinations (Feed, Extract, Import & Review, Subjects, Identity). Below 900 px a bottom tab bar honouring the safe-area inset; from 900 px a top navigation bar. Content column at most 720 px, centred. Header holds the app name, colour-scheme control and shortcut-list button.
- **Feed.** Rows replace cards: subject label, two-line information-chunk preview, avatar and author label, verified badge, date, visibility. Author filter becomes a segmented control; subject and visibility stay native selects; search stays a search field. Library-empty and no-match states are distinct.
- **Record detail.** Opening a row shows a native dialog sheet with the full record and every applicable action from the existing action table. Focus moves in on open and back to the row on close. Delete and Hide close it. Record text uses text bindings only, never HTML.
- **Pure helper module** (new, no DOM, storage or network):
  - *Avatar*: from a public key and a label, returns a hue (0 to 359) and an initial. Same key gives the same hue. Saturation and lightness come from tokens per scheme. Missing or malformed key returns a neutral result.
  - *Shortcut resolver*: from the current sequence state, a key event description (key, modifiers, whether the target is editable) and the time, returns an action and the next state. Handles `/`, `?`, `Esc`, and `g` followed by `f`, `e`, `r`, `s`, `i` within 1.5 seconds; ignores editable targets and modifier combinations; any other key cancels a pending `g`.
  - *Toast queue*: add, dismiss and expire by time. Maximum three visible; same-text toast resets the existing one; 4 s lifetime, 8 s for failures; failures flagged for assertive announcement.
  - *Theme resolver*: from a stored value and the system preference returns the effective scheme, and returns the next value in the System, Light, Dark cycle.
- **Toasts replace** the inline "Copied" text and add confirmations for store, share, accept, edit, delete, hide, trust, block and backup export. The import summary, identity message, backup summary and field validation errors stay inline and keep their element ids.
- **Empty states.** One component with title, sentence and optional button, used for the cases in SPEC §10.7.
- **Storage.** One new `localStorage` key for the colour choice. No IndexedDB, event, sync or backup format changes.
- **Preserved hooks.** All element ids, `data-tab` attributes and behavioural class names used by tests and manual checks remain. The author-filter id moves to the segmented control container; manual steps that name it are updated.
- **Edit remains as is.** Editing a record still asks for the information chunk using the browser prompt; replacing it with a form is tracked separately (backlog B6).
- **Not in this change.** No data model, signing, sync, import parsing or review logic changes.

## Testing Decisions

- A good test checks external behaviour of a pure function with plain inputs and outputs, with no DOM and no timers (time is passed in). It does not assert on internal structure.
- **Seam.** One new seam: the pure interface-helper module, tested with `node --test`. Everything visual is verified by the manual browser steps in the slice README. No DOM test harness is added.
- **Modules tested:** avatar derivation (deterministic, range, different keys give different hues for a sample set, malformed input), shortcut resolver (each shortcut, `g` sequence success and timeout, cancel by other key, editable target ignored, modifiers ignored), toast queue (cap, merge, expiry, failure lifetime and flag, dismiss), theme resolver (stored beats system, absent follows system, cycle order).
- **Prior art:** `tests/feed.test.js` and `tests/subject-import.test.js` (pure-function tests with small in-file fixtures and `node:assert/strict`).
- **Regression:** the existing test files pass unchanged. Slice 12's standalone test is run in Chrome by the implementer and results recorded in the issue.

## Out of Scope

- Motion polish (page and tab transitions, card animations).
- Installable app: web manifest, service worker, offline use.
- The other five visual directions.
- Replacing the `prompt()` edit with a form (backlog B6) and other backlog items.
- Any change to records, signing, sync, storage schema, backup format or trust logic.
- Image avatars, profile pictures or any network-fetched imagery.
- Right-to-left layouts and translations.

## Further Notes

- Choices came from the options sheet `https://claude.ai/code/artifact/a73d4256-744e-4d6d-9da0-bc0c5b3501b4`: grouped lists, system colour scheme with toggle, bundled fonts, and the extras avatars, toasts, shortcuts and empty states. The sheet also offered plain CSS with custom properties and it was chosen first; it was changed to keeping Tailwind because the app already uses it and its rebuild workflow is already documented.
- The grouped-list direction hides the actionable workflow behind a tap. The record detail is therefore required, not optional.
- Every template's class lists are rewritten. Keep the diff reviewable: land the theme and one tab first, then the rest. After every markup change, run the CSS build, or new classes will be missing from the committed file.
- Slice 11 (ticket 17) steps that name `#feed-author` or rely on card layout need updating after this lands.
- Backlog B3 (extracting app logic to pure functions for testing) is the same direction as the helper module here and can share its conventions.

## Issues

- 18-design-foundation-and-shell
- 19-colour-scheme-toggle
- 20-feed-rows-and-record-detail
- 21-author-avatars
- 22-toasts
- 23-keyboard-shortcuts
- 24-restyle-extract-and-import-review
- 25-restyle-subjects-and-identity
- 26-guided-empty-states
- 27-lock-theme-and-sweep
- 28-manual-ui-verification

## Blocked by

- None. Slices 01-10 are done.
