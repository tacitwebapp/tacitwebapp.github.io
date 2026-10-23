# Slice 18 — Works and comments

Let readers mark a shared record as **Works** ("Works for N (T)"), discuss it in a thread of nested comments and replies, and open it in a full view of its own. Comments from unknown authors are folded and not relayed until accepted; missing parents become stubs so replies stay in place; the bell tells users about replies and new comments.

## Issues
Parent spec: 00-works-and-comments-spec

- 51-works-marks
- 52-full-view-route (needs 51)
- 53-comments-and-nested-replies (needs 52)
- 54-thread-display (needs 53)
- 55-folded-comments (needs 53)
- 56-edit-delete-hide-comments (needs 53)
- 57-comment-notifications (needs 55)
- 58-manual-works-and-comments-verification (HITL, needs 51-57)

## Depends on slices
- slice-04-edit-and-delete, slice-07-trust-management, slice-08-feed-filters, slice-12-ui-redesign, slice-14-manual-insights

## Standalone test
Three profiles A, B and C, all subscribed to subject S. D's shared record is in everyone's library, and B trusts only A. Peers in a room connect directly, so relay checks take a peer offline:
1. A, B and C mark D's record Works. B sees "Works for 3 (2)" in the Feed row and the record detail. A un-marks; B sees "Works for 2 (1)".
2. B opens the record, Open → full view. Reload keeps it; Back returns to the Feed.
3. A comments. B sees it in place, because A is trusted.
4. With A offline, C (unknown to B) comments, then C goes offline. B sees it folded. A comes back with only B online and doesn't get C's comment until B accepts it.
5. A and B reply to each other 6 levels deep. At 390 px the indent stops at level 4 with "↳ replying to"; collapsing the top comment shows "▸ N replies".
6. A edits a comment: "edited", same place. A deletes a comment with replies: B sees "Comment deleted" with the replies in place.
7. B's bell shows "Replies to you" for A's reply. Opening the full view clears it.
8. A local record shows no Works or comment controls and says "Share this record to discuss it".
9. `npm test` passes.
