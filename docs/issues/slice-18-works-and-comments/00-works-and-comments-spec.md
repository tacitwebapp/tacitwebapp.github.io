# 00 — Works and comments: "this worked for me" marks, nested comment threads, and a full view of a record

**Status:** PARENT SPEC. Delivered by the issues in slice 18; not picked up directly.
**Label:** ready-for-agent

Reference: SPEC §1, §4.1, §7.3, §7.7, §7.8, §8, §9.3, §9.4, §10, §10.3, §10.7, §10.11, §10.12, §10.13, §11.1, §12, §13, §14 (Phase 5), §15. Vocabulary: [GLOSSARY.md](../../GLOSSARY.md), section Discussion.

## Problem Statement

A reader in the Feed sees a record of tacit knowledge but has no way to tell whether anyone has actually tried it. Insights relate records to each other, but nothing records the far more common signal: "I did this and it worked." There is also no way to talk about a record. A reader who has a question, a caveat ("only on clay soil"), or a report that it failed for them has nowhere to put it except a new record, which loses the connection to the original and can't be answered. When several people do want to discuss one record, the record detail sheet is too small to hold a conversation, and it has no address that someone could come back to.

## Solution

On any shared record, a reader can mark **Works** to say the knowledge worked for them. Each author has at most one mark per record, the mark is signed and shared in the subject room like any record, and every reader sees "Works for N (T)": N authors say it worked, and T of them are authors the reader trusts. Readers can also **comment** on a shared record and **reply** to any comment, to any depth. Each comment is its own signed event naming its parent, so anyone can reply, threads merge cleanly between peers, and the existing edit, delete, hide, trust and block rules apply unchanged. Comments from unknown authors are **folded**: shown collapsed in their place and not passed on until the reader accepts them. A missing parent becomes a **stub**, so replies never disappear. Each record gets a **full view**, a page of its own with an address, that holds the record, its relations, its Works count and the whole thread. The notification bell tells the user about replies to them and new comments on their records.

## User Stories

1. As a reader, I want to mark a shared record as Works, so that others know it worked for me.
2. As a reader, I want to remove my Works mark, so that I can correct a mistaken mark.
3. As a reader, I want to mark a record again after removing my mark, so that the change of mind is not permanent.
4. As a reader, I want at most one Works mark per record from me, so that I can't inflate the count by tapping twice.
5. As a reader, I want to see "Works for N (T)" on a record, so that I know how many people say it worked.
6. As a reader, I want to see how many of those people I trust, so that throwaway identities can't fool me.
7. As a reader, I want the trusted number shown even when it is 0, so that an inflated count is visible as such.
8. As a reader, I want a tooltip explaining the two numbers, so that "(T)" is not a mystery.
9. As a reader, I want the Works count hidden when nobody has marked a record, so that rows stay uncluttered.
10. As an author, I want to be able to mark my own record, so that the button behaves the same everywhere.
11. As a reader, I want an author's mark on their own record left out of the count, so that every record does not start at 1.
12. As a reader, I want Works marks from unknown authors to count without my review, so that I don't have to approve every mark one by one.
13. As a reader, I want Works marks never to fill my review queue, so that an active unknown author's real records are not dropped by the 50-per-author cap.
14. As a reader, I want a blocked author's marks removed from counts, so that blocking someone actually silences them.
15. As a reader, I want the Works count shown in the Feed row, so that I can spot proven knowledge while scanning.
16. As a reader, I want the Works button and count in the record detail, so that I can mark a record while reading it.
17. As a reader, I want to comment on a shared record, so that I can add a caveat, a question or my experience.
18. As a reader, I want to explain in a comment why a record failed for me, so that others learn the conditions where it doesn't hold.
19. As a reader, I want to reply to any comment, so that a question can be answered where it was asked.
20. As a reader, I want replies to nest to any depth, so that a long back-and-forth stays a conversation.
21. As a reader, I want two peers replying to the same comment at the same time both to keep their replies, so that no one's reply is lost.
22. As a reader, I want comments to be plain text of at most 2000 characters, so that threads stay readable and safe.
23. As a commenter, I want to edit my comment, so that I can fix a mistake.
24. As a reader, I want an edited comment to say "edited" and keep its place, so that the thread doesn't reshuffle and I know it changed.
25. As a commenter, I want to delete my comment from every peer, so that I can withdraw it.
26. As a reader, I want replies to a deleted comment to stay in place under a "Comment deleted" stub, so that one person's deletion doesn't erase others' replies.
27. As a reader, I want to hide another author's comment, so that I don't see it again.
28. As a reader, I want replies to a hidden comment to stay under a "Comment hidden" stub, so that hiding one comment doesn't hide the replies.
29. As a reader, I want a reply whose parent hasn't arrived yet to show under "Earlier comment not received yet", so that peer-to-peer delivery order doesn't scramble the thread.
30. As a reader, I want a stub with nothing visible below it not drawn, so that threads don't fill with empty placeholders.
31. As a reader, I want comments from unknown authors shown collapsed in their place, so that spam doesn't take over a thread but the thread's shape stays intact.
32. As a reader, I want to expand a folded comment, so that I can read it before deciding.
33. As a reader, I want to accept a folded comment, so that it becomes a normal comment and reaches other peers through me.
34. As a reader, I want to trust a folded comment's author from the thread, so that their other folded comments are accepted too.
35. As a reader, I want to block a folded comment's author from the thread, so that their comments go away and stay away.
36. As a reader, I want folded comments not passed on to other peers until I accept them, so that I don't spread spam.
37. As a reader, I want replying to a folded comment to accept it first, so that my reply never reaches peers without its parent.
38. As a reader, I want folded comments capped at 200 per author, so that one unknown author can't fill my storage.
39. As a reader, I want folded comments kept out of the Import & Review queue, so that the queue stays about records.
40. As a user, I want comments and Works marks only on shared records, so that nothing about my local records leaves my device.
41. As a user with a local record, I want to be told "Share this record to discuss it", so that I know why there is no Works or comment control.
42. As an author, I want deleting my record to also delete my own comments and mark on it, so that I don't leave dangling activity behind.
43. As an author, I want the delete confirmation to count the comments it will delete, so that I am not surprised.
44. As a reader, I want comments on a record I don't hold to be kept and passed on but not shown, so that the thread appears complete once the record arrives.
45. As a user with a previous key, I want comments signed by it to be read-only, so that the rules match those for records.
46. As a reader, I want to open a record in a full view, so that a long thread has the whole screen.
47. As a reader, I want the full view to have its own address, so that I can come back to it and the Back button works.
48. As a reader, I want Back to return me to where I opened the full view from, so that reading a thread doesn't lose my place.
49. As a reader, I want a full view link to a record I don't have to say "Not in your library yet", so that a dead link is explained.
50. As a reader, I want to pick from a list when a short ID matches more than one record, so that a rare collision doesn't block me.
51. As a reader, I want the full view to show the record, its relations and its Works count above the thread, so that I have the context while reading comments.
52. As a reader, I want "No comments yet" above an empty comment field, so that an empty thread invites the first comment.
53. As a reader, I want only one reply field open at a time, so that I don't lose track of what I'm answering.
54. As a phone user, I want indentation to stop at 4 levels, so that deep replies stay readable on a narrow screen.
55. As a desktop user, I want indentation to stop at 8 levels, so that I see more structure where there is room.
56. As a reader, I want replies beyond the last indent level to say "↳ replying to <name>", so that I can still follow who answers whom.
57. As a reader, I want to collapse a comment's replies to "▸ N replies", so that I can skip a side discussion.
58. As a reader, I want siblings ordered oldest first, so that a thread reads as a conversation.
59. As a reader, I want the comment count in the Feed row and the record detail, so that I know which records are being discussed.
60. As a reader, I want the comment count to leave out folded comments, so that spam doesn't make a record look busy.
61. As an author, I want a notification when someone replies to my comment, so that I can answer.
62. As an author, I want a notification for new comments on my records, so that I know when my knowledge is being discussed.
63. As an author, I want a notification for folded comments on my records, so that comments from unknown authors don't sit unseen forever.
64. As a user, I want opening a record's full view to clear its comment notifications, so that the bell reflects what I haven't seen.
65. As a user, I want old comments received before this feature started not to count as new, so that the first sync doesn't flood the bell.
66. As a user, I want notification times based on when I received a comment, not the time it claims, so that a backdated comment can't hide and a future-dated one can't stick.
67. As a user, I want Works marks never to notify me, so that the bell stays meaningful.
68. As a keyboard user, I want every control in the full view and the thread reachable and operable by keyboard, so that the feature works without a pointer.
69. As a user, I want focus to move to the full view's heading on open, so that screen readers announce where I am.
70. As a user, I want my backup to include comments and Works marks, so that a restore brings back my discussions.
71. As a user, I want comments and Works marks sent only to the record's subject room, so that they reach the same people as the record.
72. As a peer joining a room, I want to receive its comments, Works marks and their tombstones, so that I catch up on discussions I missed.
73. As a reader, I want comments that don't parse, point to the wrong thread, or form a cycle of parents never shown, so that malformed or crafted events can't break a thread.
74. As a reader, I want an unknown author's malformed Works mark dropped on arrival, so that skipping review is not a way to slip arbitrary data past me.
75. As a reader, I want the Discover counts and record counts to ignore comments and marks, so that a subject doesn't look bigger than it is.

## Implementation Decisions

**Model**
- A **comment** is a signed addressable event of the same kind as records (NIP-78 app data), with `d = tacit-comment-<uuid>` and the record's subject label in the `subject` tag. Its JSON content is `{ schemaVersion: 1, type: 'comment', root, parent, body, postedAt }`. `root` is the record's full key, and `parent` is either `root` or the key of a comment with the same `root`. `postedAt` is set when first signed and kept across edits; it drives ordering and the "edited" label (`created_at > postedAt`).
- The thread is **never stored or sent as one JSON object**. It is built on each device from individual comments. A single blob was rejected because only one author can sign it, concurrent replies would overwrite each other under newest-wins, and trust, block, hide and delete act on whole events.
- A **Works mark** is the same kind of event with `d = tacit-works-<record uuid>` and content `{ schemaVersion: 1, type: 'works', target }`. The deterministic `d` gives one mark per author per record. A mark is valid when the uuid in `target` matches the uuid in its `d`. There is no negative mark.
- Un-marking is a deletion event with a tombstone. Marking again signs the same `d` with a newer `created_at`, which the older tombstone doesn't stop.
- Comment validity: the fields are present, `parent` is the root or a comment with the same root, the body is 1–2000 characters, and there is no cycle through `parent` links. Invalid comments are kept but never shown. Invalid marks are kept but not counted.

**Receive pipeline**
- Steps 1–8 are unchanged: signature, block, deletion, kind, hidden, tombstone, newer-held, trusted or self accept.
- Step 9 (unknown author) branches on the `d` prefix, so routing never parses content:
  - a Works mark → its content is checked; a valid one is accepted into the library as shared and relayed, an invalid one is dropped;
  - a comment → a new outcome, **fold**: stored in `pending` with kind `incoming-comment` and not relayed, with a separate cap of 200 per author (log `Comment queue full for <npub-short>`);
  - everything else → review queue as today. Folded comments don't count toward the 50 cap.
- `decideIncoming` gains the `fold` action and a per-author folded-comment count in its state argument. An unknown author's Works mark is the one exception to the rule that content is not checked on receive.

**Rules**
- Comments and marks are allowed only on records that are **shared** in the user's library, and they are always shared themselves. There are no local comments. On a local record, the controls are replaced by "Share this record to discuss it".
- **Visible thread**: shown only when the root record is in the library. Otherwise the comments are kept and relayed, as with the visible-insight rule.
- **Stubs**: a parent that isn't shown is drawn as a stub. The reason comes from a tombstone (deleted), the hidden set or a blocked author (hidden), or neither (not received yet). A stub with no shown descendant isn't drawn.
- **Works count**: N is the number of distinct authors with a valid mark in the library, excluding the record's author. T is how many of those N are trusted or self. It is shown as "Works for N (T)" when N > 0, and T is always shown.
- **Cascade on delete**: deleting a record also deletes the user's own comments (current key) and own mark on it, with one deletion event each. The confirmation reads "This also deletes N of your insights and M of your comments". Deleting a comment never deletes its replies.
- Accepting a folded comment moves it to the library as shared and relays it. Trusting its author moves all of that author's folded comments. Blocking the author removes them. Replying to a folded comment accepts it first.

**Modules**
- **New pure module `tacit-comment.js`.** It mirrors the insight module in shape: comment and mark templates and edit templates, validity checks, thread building, Works counts, comment notification counts, and cascade targets. Its interface:
  - `buildThread(rootKey, { library, folded, tombstones, hiddenKeys, blockedKeys })` returns a tree ready to draw. Each node is a comment or a stub, with depth, a stub reason, a folded flag, an edited flag and its children, with siblings ordered by `postedAt`. Invalid comments and cycles are left out.
  - `worksCount(recordKey, library, { selfKeys, trustedKeys })` returns `{ n, t, mine }`.
  - `commentNotifications({ library, folded, selfKeys, threadSeen })` returns the three counts and, for each, the record to open.
  - `cascadeTargets(recordKey, library, currentKey)` returns the user's own comments and mark to delete.
- **Sync module**: the `fold` action in `decideIncoming`. Subject-room sync already sends every shared library event of the subject plus tombstones, so comments and marks travel with no change. Folded comments are never sent.
- **Route module**: a parameterised route `#/tacit/<8 hex>` that parses to `{ tab: 'tacit', id }`. It is not a navigation destination; the Feed stays selected.
- **Record readers**: the Feed filter, the import duplicate check, the directory `sharedCount`, record counts and the Insights record list leave comments and marks out, as they do insights.
- **Backup**: the `records` array carries comments and marks with the rest of the library. Folded comments, like all pending items, are not included.

**Storage**
- `library` holds comments and marks (content `type` is `'comment'` or `'works'`).
- `pending` gains the kind `incoming-comment`: `{ id: key, kind, event, pubkey, receivedFrom, receivedAt }`.
- A new localStorage key `tacit.threadSeen` holds `{ since, seen: { [recordKey]: seconds } }`. `since` is set on first run of this feature. Opening a full view sets that record's `seen` time.

**Interface**
- **Record detail sheet**: on a shared record it shows the Works button (pressed when marked) with the count, the comment count, and **Open** to the full view.
- **Full view**: the record (as in the detail sheet, with its actions and Relations), the Works control, then the thread with a top-level comment field.
  - Each comment shows the avatar, author label, `postedAt`, "edited", the body (text bindings only) and its actions: Reply, Edit, Delete, Hide.
  - One reply field is open at a time.
  - Indentation is one step per level, up to 4 levels below 900 px and 8 from 900 px up. Deeper replies stay at the last level and start with "↳ replying to <author label>".
  - Any comment with replies collapses to "▸ N replies" for the session.
  - Unknown short ID → "Not in your library yet". Ambiguous → a pick list. **Back** returns to the previous route, or to the Feed.
  - Focus moves to the heading on open.
- **Feed rows** show "Works for N (T)" and "Comments N" next to the insight badges, each only when above 0. There is no sort or filter by them.
- **Notifications**: three new bell items, each shown when N > 0 and each opening the full view of the record with the newest matching comment.
  - Comments to review: folded comments on the user's records.
  - Replies to you: received after that record's `seen` time.
  - New comments on your records: other authors' comments received after `seen`, not already counted as replies.
  - Times compare `receivedAt`, and nothing before `since` counts. Works marks never notify.
- **Empty state**: "No comments yet" in the full view.

## Testing Decisions

- Good tests here check external behaviour through a module's exported functions, using in-memory state (library arrays, sets of keys, tombstone maps) as the existing insight and sync tests do. They don't reach into private helpers, and they don't touch IndexedDB, the DOM or the network.
- **Seams** (agreed):
  1. `decideIncoming`, extended. An unknown author's valid Works mark is accepted, an invalid one dropped. An unknown author's comment folds, and the separate 200 cap triggers `drop` with reason `comment-queue-full`. Trusted and self authors are unchanged. Folded comments don't count toward the 50 cap. Hidden, tombstoned and older versions still drop.
  2. The new `tacit-comment.js`, through its exports:
     - Templates: the deterministic Works `d`, and an edit keeps `d` and `postedAt`.
     - Validity: a bad `root`, a bad `parent`, a parent in another thread, body length, a parent cycle, and a mismatch between the Works `d` and `target`.
     - `buildThread`: nesting depth, sibling order by `postedAt`, the edited flag, a stub for each reason, stubs with nothing below dropped, folded comments placed in the tree, and replies under folded comments.
     - `worksCount`: distinct authors, the author's own mark excluded, the trusted and self split, and blocked authors absent.
     - `commentNotifications`: the `since` cut-off, `seen` per record, `receivedAt` rather than `created_at`, and replies not double-counted.
     - `cascadeTargets`: own comments and mark only, current key only.
  3. `parseRoute` / `buildRoute`, extended: `#/tacit/<id>` round-trips, and a malformed id gives null.
  4. Existing readers: `filterFeed`, `buildDrafts` duplicate checks and `announcementFor` leave comments and marks out. `restoreBackup` round-trips them.
- **Prior art**: the insight tests (templates with deterministic `d`, the visible filter, cascade targets, and the `decideIncoming` and `announcementFor` checks for insights), the route tests and the backup tests.
- **Manual checks** (two or three browser profiles), in the slice's verification issue:
  - an unknown author's comment folds and is not relayed until accepted;
  - six-level replies at 390 px stop indenting at level 4;
  - a deleted comment leaves a stub with its replies;
  - "Works for 3 (2)" with partial trust, then un-marking;
  - full view reload and Back;
  - the bell counts and their clearing.
- The existing unit tests must stay green.

## Out of Scope

- A "didn't work" or other negative mark. A failure is explained in a comment. The content can gain an outcome field later, read as `works` when absent.
- Sorting or filtering the Feed by Works count. A later slice could sort by the trusted count once real data exists.
- Comments or marks on local records, and local or private comments of any kind.
- Comments or marks on insights.
- Comments and Works counts on the Tacit Map.
- Including comments in extraction or insight prompts.
- A "continue this thread" sub-view for deep replies.
- Rich text, links, mentions or attachments in comments.
- Interoperability with Nostr NIP-25 reactions or NIP-22 comments; Tacit doesn't talk to public Nostr relays.
- Moderation beyond folding, hide, trust and block.

## Further Notes

- The user's original idea was to save nested comments as JSON. That holds for each comment's content and for the backup, but the thread is a view built in memory, for the signing and merge reasons above.
- Works counts are only as strong as the trust list. A new user who trusts nobody sees T = 0 everywhere, which is honest, not a bug.
- An unknown author's Works marks are relayed without review. The content check and one mark per author per record bound what that lets through. Throwaway keys can still inflate N, which is why T is always shown.
- A deleted or edited comment's earlier text stays with peers who already received it, as for records.
