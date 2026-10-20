# 04 — Import JSON/CSV by file or paste into drafts

Type: AFK
**Status:** DONE

## What to build

On the Import & Review tab, the user imports LLM output, either by picking a `.json`/`.csv` file or by pasting text. Pasted text that starts with `[` or `{` (after whitespace) is read as JSON, anything else as CSV. Import is disabled until a subject is selected. Each object becomes a draft that stays in IndexedDB until reviewed, with these rules:

- an object without a non-empty `information_chunks` is rejected;
- `subject` is overwritten with the selected subject, and a warning is added if it was different;
- a missing `actionable_workflows` adds a warning;
- other fields are kept, and `schemaVersion: 1` is added;
- duplicates (same subject slug and same trimmed `information_chunks`) are skipped.

A summary reports how many drafts were created, rejected and skipped, with reasons. The review queue lists drafts with their warnings, and lets the user edit or discard them.

Reference: SPEC §6.2, §6.3, §8.1 (`pending` store).

## Acceptance criteria

- [x] File upload and paste give the same drafts for the same content.
- [x] Import is impossible with no subject selected.
- [x] Rows without `information_chunks` are rejected and listed; the rest are imported.
- [x] A different file subject is replaced, and the draft shows the "subject overwritten" warning.
- [x] A missing actionable workflow shows the "no actionable workflow" warning.
- [x] Re-importing the same file creates no new drafts.
- [x] Drafts survive a reload.
- [x] Unit tests: format detection, validation, warnings, duplicate rule.

## Blocked by

- 03-subject-model-and-tabs
