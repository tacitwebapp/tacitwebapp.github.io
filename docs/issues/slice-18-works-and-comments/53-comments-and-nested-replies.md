# 53 — Comments and nested replies

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §7.3 step 9, §7.7, §8.1, §9.3, §9.4, §10.3, §10.7, §10.12, §10.13, §11.1, §12.

## What to build

The tracer bullet for comments. The comment module gains:
- the comment template, with `d = tacit-comment-<uuid>` and content `{ schemaVersion: 1, type: 'comment', root, parent, body, postedAt }`;
- validity: fields present, `parent` is the root or a comment with the same root, body 1–2000 characters, no cycle through `parent` links;
- `buildThread`, which turns the comments of one record into a tree. Each node has a depth and children, siblings are ordered by `postedAt`, and invalid comments and cycles are left out. A comment whose parent hasn't arrived is placed under an "Earlier comment not received yet" stub, and a stub with nothing shown below it is not drawn.

The full view (52) shows the thread below the record, with "No comments yet" above a top-level comment field when it is empty. Each comment shows the avatar, author label, `postedAt` and the body, with text bindings only. **Reply** opens a field under that comment, and only one reply field is open at a time. Replies nest by plain indentation at every depth; the indent caps and collapse come in 54. Comments are signed, stored as shared and sent to the record's subject room. Peers joining the room receive them with the rest of the shared library.

On a local record, the comment controls are not shown, and the full view and sheet say "Share this record to discuss it". The record detail sheet and Feed rows show "Comments N" when N > 0, counting shown comments only.

Receive side: `decideIncoming` gains the `fold` action for an unknown author's comment. It is stored in `pending` as `incoming-comment` and not relayed, with its own cap of 200 per author (dropped with `Comment queue full for <npub-short>` in the sync log). Folded comments don't count toward the 50 cap. In this issue they are stored but not drawn; 55 draws them.

Comments on a record not in the library are kept and relayed but not shown. The Feed filter, import duplicate check, directory `sharedCount`, record counts and the Insights record list leave comments out. Backup carries comments with the library, but not folded ones.

## Acceptance criteria

- [ ] On a shared record, a user can comment and reply to any comment at any depth, and peers in the room receive them.
- [ ] Two peers replying to the same comment at the same time both end up with both replies.
- [ ] Siblings are ordered oldest first by `postedAt`.
- [ ] A reply that arrives before its parent sits under "Earlier comment not received yet" and moves under the real parent when it arrives.
- [ ] Comments with a bad root or parent, a parent in another thread, a body outside 1–2000 characters, or a parent cycle are never shown.
- [ ] A local record has no comment controls.
- [ ] An unknown author's comment is stored as folded, not relayed, not in Import & Review, and capped at 200 per author.
- [ ] The sheet and Feed rows show the comment count.
- [ ] Comments are left out of the record readers and round-trip through backup.
- [ ] Unit tests for the template, validity, `buildThread` (nesting, order, the not-received stub, pruning, cycles) and the `decideIncoming` fold branch with its cap. `npm test` passes.

## Blocked by

- 52-full-view-route
