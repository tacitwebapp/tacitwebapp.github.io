# 55 — Folded comments in the thread

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

[00-works-and-comments-spec](00-works-and-comments-spec.md). Reference: SPEC §7.5, §7.7 (Folded comments), §10.13.

## What to build

Draw the folded comments that 53 stores. `buildThread` places each folded comment in its place in the tree, flagged as folded. The thread shows it collapsed: "Comment from <author label>, unknown author", with:
- **Show**, which expands the body in place;
- **Accept**, which moves it to the library as shared and relays it to the subject room;
- **Trust author**, which trusts the author and moves all of their folded comments, as for pending records;
- **Block author**, which removes their library and folded comments and refuses new ones;
- **Hide**, which removes it and adds its key to the hidden set.

Replies to a folded comment are drawn under it, whether it is expanded or not. **Reply** on a folded comment accepts it first, then opens the reply field, so a reply never reaches peers without its parent.

## Acceptance criteria

- [ ] An unknown author's comment appears in its place, collapsed, with the five actions. Its replies sit under it.
- [ ] Show expands it without accepting it. It is still not relayed.
- [ ] Accept relays it: with the commenter offline, a third peer gets it from this user only after Accept.
- [ ] Trust author accepts all of that author's folded comments. Block author removes them.
- [ ] Hide removes it and it doesn't come back on re-sync.
- [ ] Replying to a folded comment accepts it first.
- [ ] Folded comments never appear in Import & Review.
- [x] Unit tests for folded placement in `buildThread`. `npm test` passes.

## Blocked by

- 53-comments-and-nested-replies
