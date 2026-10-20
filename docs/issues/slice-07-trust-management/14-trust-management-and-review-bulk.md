# 14 — Trust list management, bulk review, cap per author

Type: AFK

## What to build

The Identity tab lists trusted and blocked authors, and lets the user add a nickname, change status, or remove an entry. Nicknames replace short npubs on cards. In the review queue, each author group gets "Accept all", "Discard all" and "Block author", plus a count. An unknown author can have at most 50 pending records; extra ones are dropped, with a sync-log entry.

Reference: SPEC §7.3 step 9 (cap), §7.4 (bulk), §7.5, §10.

## Acceptance criteria

- [ ] Nicknames appear on Feed and review cards.
- [ ] Removing a trust entry sends that author's future records back to review.
- [ ] Bulk Accept and Discard act on every record in the group.
- [ ] The 51st pending record from one unknown author is dropped and logged.
- [ ] Unit tests: the cap decision.

## Blocked by

- 07-unknown-author-review-and-trust
