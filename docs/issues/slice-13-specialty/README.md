# Slice 13 — Specialty

Let a user narrow an extraction to a specialty inside a subject, without changing how records are routed.

## Issues
- 29-optional-specialty

## Depends on slices
- slice-01-basic-posting

## Standalone test
1. On Extract, select a subject and type a specialty: the prompt shows it in the header, the extraction rule and the output schema.
2. Clear the specialty: the prompt has no mention of it.
3. Import a record that has a `specialty` key: it shows next to the subject in the Feed row and the detail.
4. Share it: it goes to the subject room only.
