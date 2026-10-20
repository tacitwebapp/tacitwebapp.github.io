# 14 — Trust list management, bulk review, cap per author

Type: AFK
**Status:** DONE

## What to build

The Identity tab lists trusted and blocked authors, and lets the user add a nickname, change status, or remove an entry. Nicknames replace short npubs on cards. In the review queue, each author group gets "Accept all", "Discard all" and "Block author", plus a count. An unknown author can have at most 50 pending records; extra ones are dropped, with a sync-log entry.

Reference: SPEC §7.3 step 9 (cap), §7.4 (bulk), §7.5, §10.

## Acceptance criteria

- [x] Nicknames appear on Feed and review cards.
- [x] Removing a trust entry sends that author's future records back to review.
- [x] Bulk Accept and Discard act on every record in the group.
- [x] The 51st pending record from one unknown author is dropped and logged.
- [x] Unit tests: the cap decision.

## Blocked by

- 07-unknown-author-review-and-trust
