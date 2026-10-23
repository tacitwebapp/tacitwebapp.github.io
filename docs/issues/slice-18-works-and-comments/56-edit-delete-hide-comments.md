# 56 — Edit, delete and hide comments, with stubs

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §7.2, §7.4, §7.7 (Stubs, Order, Cascade on delete, Local actions on comments).

## What to build

The comment lifecycle, plus stubs that keep replies in place.

- **Edit** (own comment, current key): change the body and re-sign with the same `d` and `postedAt` and a newer `created_at`, then send. The comment keeps its place and shows "edited".
- **Delete** (own comment, current key): sign a deletion, remove the comment, keep a tombstone and send. Peers holding replies show a "Comment deleted" stub with the replies under it.
- **Hide** (another author's comment): remove it and add its key to the hidden set. Its replies stay under a "Comment hidden" stub.
- **Block**: a blocked author's comments also become "Comment hidden" stubs.
- **Pruning**: a stub with nothing shown below it is not drawn.
- **Previous keys**: comments signed by a previous key are read-only.

`buildThread` takes tombstones, hidden keys and blocked keys to give each stub its reason.

**Cascade on record delete**: deleting one of the user's records also deletes the user's own comments on it (current key), one deletion event each, sent. The confirmation reads "This also deletes N of your insights and M of your comments". Other authors' comments on it are kept but no longer shown.

## Acceptance criteria

- [ ] Editing a comment updates it on every peer, keeps its position, and shows "edited".
- [ ] Deleting a comment that has replies leaves "Comment deleted" with the replies in place on every peer, and the comment doesn't come back on re-join.
- [ ] Hiding or blocking leaves "Comment hidden" with the replies in place, for this user only.
- [x] A deleted or hidden comment with no shown replies leaves no stub.
- [ ] Comments by a previous key show no Edit or Delete.
- [ ] Deleting a record deletes the user's own comments on it on every peer, and the confirmation counts them.
- [x] Unit tests: edit template keeps `d` and `postedAt`; `buildThread` stub reasons and pruning; cascade targets (own comments and mark only, current key only). `npm test` passes.

## Blocked by

- 53-comments-and-nested-replies
