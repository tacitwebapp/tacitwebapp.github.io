# 25 — Restyle Subjects and Identity

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §5, §9.2, §9.4, §10.1, §10.8.

## What to build

The Subjects and Identity tabs move to the grouped-list style. Subjects: create-subject field, subject rows (private badge, password field, subscribe toggle), Discover rows and the sync log in monospace. Identity: signer, export private key, import identity, switch signer, backup, trust and block list, previous keys, each as its own group, with acknowledgements as styled checkboxes, destructive actions styled as such, and keys and hex in monospace. Tailwind's default-palette colour classes are replaced by token colours in these two sections, and the CSS is rebuilt.

## Acceptance criteria

- [x] Both tabs use token colours and component classes; no default-palette colour class (such as `gray-*`, `blue-*`, `green-*`, `red-*`, `amber-*`, `purple-*`) remains in their markup.
- [x] `npm run build:css` was run and `vendor/tailwind.css` is committed in sync.
- [x] All existing ids, class hooks and behaviour are unchanged, including subject password and subscribe, Discover subscribe, key reveal and import, signer switch, backup export and import, and trust nickname, status and remove.
- [x] Long keys wrap or scroll inside their group and never widen the page.
- [x] Touch targets are at least 44 px and focus is visible.
- [x] No horizontal scrolling at 390 px or 1280 px in either scheme.
- [x] `npm test` passes.

## Blocked by

- 18-design-foundation-and-shell
