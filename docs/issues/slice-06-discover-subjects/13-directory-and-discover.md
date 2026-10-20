# 13 — Directory room and Discover list

Type: AFK

## What to build

When the app loads, it also joins an app-wide directory room, which carries no records. Each peer announces its subscribed public subjects as unsigned hints `{label, slug, sharedCount}`: to each peer that joins, and to everyone when its subscriptions change. Private subjects are never announced. Received entries are kept only if the label is a string of at most 80 characters whose slug matches, at most 100 per peer. They are kept per peer and dropped when that peer leaves. The Subjects tab shows a Discover list: entries grouped by slug, with the most common label, the number of announcing peers and the largest shared count, sorted by peer count, and a Subscribe button. Subjects the user already has are marked.

Reference: SPEC §9.1, §9.4.

## Acceptance criteria

- [ ] B sees A's public subject in Discover, with a peer count of 1, and can subscribe to it in one click.
- [ ] A private subject never appears in anyone's Discover list.
- [ ] Entries disappear when the announcing peer leaves.
- [ ] Malformed entries (mismatched slug, label too long, over 100) are ignored.
- [ ] Unit tests: announcement validation and the Discover grouping.

## Blocked by

- 06-share-to-subject-room
