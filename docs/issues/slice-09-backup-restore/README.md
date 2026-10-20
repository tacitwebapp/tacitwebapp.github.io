# Slice 09 — Backup and restore

Move a library, tombstones, trust lists and subjects between devices.

## Issues
- 16-backup-export-import

## Depends on slices
- slice-04-edit-and-delete
- slice-07-trust-management

## Standalone test
1. Export from A, import into a fresh profile: library (with visibility), tombstones, trust and subjects restored.
2. File contains no private key and no passwords.
3. Tamper one event in the file: it is rejected, the rest import.
4. Import the same file twice: second run changes nothing.
5. Merge rules unit-tested (hidden / tombstone / newer-version, trust conflict, subject merge).
