# Slice 07 — Trust management and bulk review

Manage trust/block lists and handle review queues at scale.

## Issues
- 14-trust-management-and-review-bulk

## Depends on slices
- slice-03-block-and-hide

## Standalone test
1. Add a nickname to a trusted author: it replaces the short npub on Feed and review cards.
2. Remove a trust entry: that author's next record goes to review.
3. Change status trusted -> blocked and back.
4. Review queue: Accept all / Discard all / Block author act on the whole author group; count shown.
5. 51st pending record from one unknown author is dropped and logged (also unit-tested).
