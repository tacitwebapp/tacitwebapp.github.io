# 16 — Backup export and import

Type: AFK

## What to build

From the Identity tab, the user exports a backup file containing their library (each signed record with its visibility), tombstones, trust list and subjects. It does not include the private key or subject passwords. Importing a backup verifies every event, merges records using the same hidden / tombstone / newer-version rules as network receive (keeping the file's visibility), merges tombstones and trust entries (existing trust entries win), merges subjects by slug, and reports how many items were imported, skipped and rejected.

Reference: SPEC §11.1.

## Acceptance criteria

- [ ] Exporting from A and importing into a fresh profile restores the library with the same visibility, plus trust lists and subjects.
- [ ] A backup with a changed event rejects that event and imports the rest.
- [ ] The file contains no private key and no passwords.
- [ ] Importing the same backup twice changes nothing the second time.
- [ ] Unit tests: building and parsing the backup, and the merge rules.

## Blocked by

- 10-delete-with-tombstones
- 14-trust-management-and-review-bulk
