# 03 — Subject model, Subjects tab, Extract tab

Type: AFK
**Status:** DONE

## What to build

Combine the separate "subject category" list and "channel" list into one list of subjects. Each subject has a label (the user's casing) and a slug (lowercase; every run of non-alphanumeric characters becomes `-`; leading and trailing `-` removed). A label whose slug is empty is rejected. Creating a subject whose slug already exists reuses the existing subject. Add the new tab layout: Feed, Extract, Import & Review, Subjects, Identity. The Subjects tab lists subjects with a subscribe toggle (persisted) and lets the user create one. The Extract tab keeps the prompt built from input type and subject, and adds a Copy button. The selected subject becomes the default subject for import.

Reference: SPEC §6.1, §9.2, §10.

## Acceptance criteria

- [x] "Pest Control", "pest control" and "Pest  Control " all end up as one subject with slug `pest-control`.
- [x] A label made only of symbols is rejected.
- [x] The subscribe toggle state survives a reload.
- [x] Copy places the full built prompt on the clipboard.
- [x] The five tabs are present, and no old "channel" list is left.
- [x] Unit tests: `slugify`, and creating a subject that already exists.

## Blocked by

- 01-vendor-deps-and-module-bootstrap
