# Slice 04 — Edit and delete own records

Author lifecycle: change or withdraw a shared record across peers.

## Issues
- 09-edit-own-record
- 10-delete-with-tombstones

## Depends on slices
- slice-02-secure-sharing

## Standalone test
Profiles A and B (same identity is enough for edit; different identities needed for the foreign-deletion check):
1. Edit on A: connected B updates; B receiving old version after new keeps new.
2. Records by other authors or previous keys offer no Edit.
3. Delete on A: connected B drops it.
4. B offline during delete: on re-join B receives the tombstone and drops the record.
5. B still holding the record re-joins: record does not return on A.
6. Deletion signed by a different key is ignored.
