# 22 — Toasts

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §10.5.

## What to build

Short confirmations appear as toasts above the tab bar. The queue logic is a pure function set in the interface-helper module: add, dismiss and expire by time (time is passed in), with at most three visible, a same-text toast resetting the existing one, a 4 second lifetime, and an 8 second lifetime for failures that are flagged for assertive announcement. The inline "Copied" text for the prompt and the secret key is replaced by a toast, and toasts are added for store, share, accept, edit, delete, hide, trust author, block author and backup export. Results that need to stay on screen remain inline: `#import-summary`, `#identity-message`, `#backup-summary` and field validation errors.

## Acceptance criteria

- [x] Each action listed above shows a toast.
- [x] At most three toasts are visible. Repeating the same message does not stack.
- [x] Toasts disappear after 4 seconds (8 for failures) and can be dismissed earlier.
- [x] Success toasts use `role="status"`; failure toasts use `role="alert"`.
- [x] Toasts never cover the tab bar.
- [x] The four inline results above still show inline with their ids.
- [x] Unit tests: cap, merge, expiry, failure lifetime and flag, dismiss.
- [x] `npm test` passes.

## Blocked by

- 18-design-foundation-and-shell
