# Tacit — Product & Technical Spec

Status: Draft · 2026-10-20
Vocabulary: see [GLOSSARY.md](GLOSSARY.md). Terms in **bold** below are glossary terms.

## 1. Summary

Tacit is a static, serverless browser app (GitHub Pages). A user:

1. builds an **extraction prompt** for an **input type** and **subject**, and runs it in an outside LLM;
2. **imports** the LLM output (JSON/CSV, as a file or pasted text) as **drafts**;
3. reviews each draft, then either keeps it as a **local record** or publishes it as a **shared record**;
4. exchanges shared records peer-to-peer with everyone who subscribes to the same **subject room**;
5. relates records in a subject with **insights** (conflicts, supersedes and so on), either by hand or through an **insight prompt** run in an outside LLM, and sees them on the **Tacit Map** (§6.4, §7.6, §10.9, §10.10);
6. marks a shared record **Works** when it worked for them, and discusses it in a **thread** of nested **comments**, shown in the record's **full view** (§7.7, §7.8, §10.12, §10.13).

Every record that is kept is a **signed record**: a Nostr event signed by the author's **identity**. A **peer** that **relays** a record cannot change it without breaking the signature. Incoming records from **trusted authors** go straight into the library; records from **unknown authors** go through the **review queue**.

The personal-vault use and the community-exchange use are equally important.

## 2. Goals and non-goals

### Goals
- Signed authorship and tamper evidence for every record, including records relayed through several peers.
- Local records never leave the device.
- One concept of subject. The subject decides which room a record goes to.
- Users can find public subjects without having to share names outside the app.
- No backend and no build step for app code; works on GitHub Pages.
- No third-party scripts, stylesheets or fonts at runtime. All dependencies are vendored.
- One consistent interface that works on phones and desktops, in light and dark, and can be used by keyboard alone (§10).

### Non-goals
- Calling an LLM from inside the app, or running any model in the browser. Extraction and insight finding stay copy-paste.
- Insights between records of different subjects.
- Encrypting record contents. Shared means readable by every peer in the room.
- Migrating data from the current app version (see §11).
- Moderation beyond per-user trust and block lists.
- Mobile-native packaging, and installable or offline-capable web packaging (manifest, service worker).

## 3. Current state (baseline)

| Area | Today | Change |
|---|---|---|
| Records | Unsigned JSON objects in `localStorage` | Signed Nostr events in IndexedDB |
| Rooms | Free-text channel list, not linked to subjects | Subject = room, plus a directory room |
| Peer join | Sends **all** saved records, including "stored locally" ones ([tacit-sync.js:15](../src/tacit-sync.js#L15)) | Sends only shared records for that room |
| Share | Sends the record, then drops it from the sharer's library ([tacit-app.js:58](../src/tacit-app.js#L58)) | Sharer keeps it as shared |
| Share all | Sends every record to every channel ([tacit-app.js:62](../src/tacit-app.js#L62)) | Removed; routing is by subject |
| Duplicates | `JSON.stringify` equality (sensitive to key order) | Identified by `(pubkey, d)`, newest wins |
| Schema | Free-form; feed falls back to `chunk`/`title`/`action_item` | `information_chunks` required |
| Dependencies | Alpine `3.x.x`, Tailwind play CDN, Trystero via esm.sh | Pinned and vendored |

## 4. Architecture

### 4.1 Modules

Plain ES modules, no bundler. `index.html` loads `src/tacit-main.js` as `type="module"`, which imports vendored Alpine's ESM build, registers the component, then calls `Alpine.start()`. All modules and `tacit.src.css` live in `src/`; the table below lists them by bare filename. Modules marked *pure* have no DOM, storage or network access, so `node --test` can test them.

| File | Responsibility | Pure |
|---|---|---|
| `index.html` | Markup and tabs | – |
| `tailwind.config.js`, `tacit.src.css` | Tailwind theme and source styles: design tokens, light and dark schemes, `@font-face`, component classes (§10.1). Compiled into `vendor/tailwind.css` | – |
| `tacit-main.js` | Bootstrap: import Alpine, register `tacitApp`, start | – |
| `tacit-app.js` | Alpine component: UI state and actions | – |
| `tacit-prompt.js` | Builds the extraction prompt | yes |
| `tacit-json-parser.js`, `tacit-csv-parser.js` | Parse text into raw objects | yes |
| `tacit-import.js` | Format detection, validation, normalisation into drafts (§6.2) | yes |
| `tacit-subject.js` | `slugify`, subject list operations | yes |
| `tacit-events.js` | Build record and deletion templates, verify, merge decisions (§7) | yes (verification uses vendored nostr-tools) |
| `tacit-identity.js` | Signer interface; NIP-07 and local-key backends; key import/export | – |
| `tacit-store.js` | IndexedDB access (§8) | – |
| `tacit-sync.js` | Trystero subject rooms and directory room | – |
| `tacit-backup.js` | Backup export and import | builder and parser pure |
| `tacit-ui.js` | Interface helpers: author avatar, keyboard shortcut resolver, toast queue, theme resolver (§10.4–10.6, §10.1) | yes |
| `tacit-insight.js` | Insights: short IDs, insight prompt batches, JSON rows to insight drafts and disagreements, insight templates, visibility, grouping, feed badges, cascade on delete (§6.4, §7.6) | yes |
| `tacit-comment.js` | Comments and Works marks: templates, validity, building a thread with stubs and depth, Works counts, unread counts for notifications, cascade on delete (§7.7, §7.8, §10.11–§10.13) | yes |
| `tacit-route.js` | Hash routes for tabs, their views and the full view (§10.13) | yes |
| `tacit-map.js` | Tacit Map layout: positions and the Cytoscape element list for one subject (§10.10). Drawing is done by Cytoscape in `tacit-app.js` | yes |
| `vendor/` | Pinned third-party builds, the bundled font, plus `VERSIONS.md` | – |
| `tests/*.test.js` | Unit tests | – |

`tacit-feed.js` is replaced by `tacit-events.js` and `tacit-store.js`.

### 4.2 Dependencies (vendored)

| Library | Purpose | Notes |
|---|---|---|
| Alpine.js 3.x (exact patch) | UI reactivity | ESM build (`module.esm.js`) |
| Trystero 0.26.0, nostr strategy | WebRTC P2P with Nostr relays for connection setup | Self-contained single-file ESM bundle (e.g. esm.sh `?bundle` output) |
| nostr-tools 2.x (exact) | `finalizeEvent`, `verifyEvent`, `getPublicKey`, `generateSecretKey`, `nip19` | Self-contained ESM bundle |
| Cytoscape.js 3.x (exact) | Draws the Tacit Map: nodes, edges, pan, zoom, touch | ESM build. Used with the `preset` layout only; positions come from `tacit-map.js`, so the drawing layer can be replaced without changing the layout. |
| DM Sans (variable, Latin subset, WOFF2) | Typeface | Committed in `vendor/` and loaded with `@font-face` from the same origin (`font-display: swap`, system font fallback). SIL Open Font License; the licence text is committed next to the file. |

Tailwind CSS 3.4.17 stays, as a dev-time tool only. `tailwindcss` is a pinned dev dependency, `npm run build:css` compiles `tacit.src.css` with `tailwind.config.js` into the committed `vendor/tailwind.css`, and `VERSIONS.md` records that command. There is no CSS build on deploy or at runtime.

`vendor/VERSIONS.md` records each library's and font's exact version, source URL and SHA-256 hash. No `<script src>`, `<link>`, `@font-face` or `import` may point to a third-party host.

## 5. Identity

### 5.1 Signer

```js
// tacit-identity.js
signer = {
  source: 'extension' | 'local',
  getPublicKey(): Promise<hex>,
  signEvent(template): Promise<SignedEvent>,
}
```

- **Extension (NIP-07):** used when `window.nostr` is present and the `signerPreference` setting is `extension` (the default). Key export and import are disabled; the extension manages the key.
- **Local key:** otherwise. On first run, `generateSecretKey()` creates a key, which is stored as hex in `localStorage['tacit.secretKey']`. nostr-tools v2 expects `Uint8Array` keys, so convert with `hexToBytes`/`bytesToHex`.
- Identity tab: shows the public key (npub plus short hex), the signer source and an optional author name (`settings.authorName`, sent as the `author_name` tag of §7.1). The user can switch the signer when both are available. Switching changes identity, so it gets the same warning as an import (§5.3).
- Name prompt: the first time the user signs a record, insight or edit under an identity, a dialog asks for a name (prefilled with the current `settings.authorName`). Save stores it, Skip leaves it as is, and both continue the action. Escape or a click outside cancels the action and asks again next time. Deletions do not prompt. A bulk save prompts once before it starts. Saving a name in the Identity tab counts as answering. A switch or import is a new identity, so the prompt fires again. See §10.11 for the reminder after Skip.

### 5.2 Export
- "Export private key" (local signer only) reveals the key in hex and nsec and offers a copy button, behind a warning: anyone with this key can sign records as you.

### 5.3 Import
- Accepts 64-character hex or `nsec1…` (decoded with `nip19.decode`; any other prefix is rejected).
- Before replacing, the user must tick "I have exported my current key", with the current key's export one click away.
- On import, the current public key is added to `previousKeys`. Library records by previous keys stay. They are still valid and still relayed if shared, but read-only and labelled "by previous key".

### 5.4 Self-trust
- The current public key and every key in `previousKeys` are always treated as trusted (§7.3).

## 6. Capture

### 6.1 Extract tab
- Input type and subject dropdowns, plus "Create subject". The prompt is built by `buildTacitPrompt({ inputType, subjectCategory, specialty })`, with a **Copy** button. An optional **Specialty** text field (for example "Kitchen Garden" under the subject "Gardening") is passed as `specialty`; the prompt then asks the LLM to restrict extraction to it and emit a `specialty` key per record, which is kept in the record content and shown in the Feed. Specialty never affects the room: routing is by subject only. An **Edit** button opens the prompt template in a textarea (Save, Cancel, Reset to default). An edited template is kept in `localStorage` (`tacit.extractPrompt`) only: it is never published, synced, or included in backups. The dynamic lines (input type, parsing instructions, subject, specialty) are still filled in from the edited template.
- The selected subject becomes the default subject in the Import panel.

### 6.2 Import
- One panel with a file picker (`.json`, `.csv`) and a paste textarea.
- A **subject must be selected** before import. Import is disabled until one is.
- Format detection: by file extension for files; for pasted text, the first non-space character `[` or `{` means JSON, anything else means CSV.
- JSON: an array of objects, an object with a `knowledge` array, or a single object (existing parser rules).
- CSV: a header row and at least one row; columns are mapped by header name (existing parser).
- For each raw object:
  - `information_chunks` must be a non-empty string, otherwise the object is rejected and listed in the import summary.
  - `subject` is overwritten with the selected subject. If the file had a different subject, the draft carries the warning `subject overwritten (was "<x>")`.
  - A missing or empty `actionable_workflows` adds the warning `no actionable workflow`.
  - Other fields are kept as they are.
  - `schemaVersion: 1` is added.
- Duplicates: a draft is skipped if a draft or own library record with the same subject slug and identical `information_chunks` (after trimming) already exists.
- The import summary shows "N drafts created, M rejected, K duplicates skipped", with reasons.

### 6.3 Record content (`event.content`, JSON)

```json
{
  "schemaVersion": 1,
  "subject": "Pest Control",
  "information_chunks": "…required…",
  "actionable_workflows": "…optional…",
  "specialty": "…optional, narrows the subject; never affects routing…",
  "...": "other fields kept as they are"
}
```

### 6.4 Insights tab

An **insight** relates two records of the same subject (§7.6). Insights are made in the Insights tab, by hand or through an **insight prompt** run in an outside LLM.

**Selecting records**
- A subject must be selected. The record list holds every library record of that subject, from any author and with either visibility. It is searched and filtered with the Feed rules (`filterFeed`: author group, visibility, text).
- Each record shows its **short ID** (`t:` + the first 8 hex characters of the uuid in its `d` tag), a preview of its information chunk, and a checkbox. **Select all** selects the records the filters currently show. At least 2 records must be selected to build a prompt.

**Insight prompt**
- Each record in a prompt is one block. It holds the short ID, the date (`created_at` as `YYYY-MM-DD`), the specialty if set, the information chunk and the actionable workflow if set. The author is never included.
  ```
  [t:3f9a1c2e] 2026-03-14 · Specialty: Kitchen Garden
  Information: <information_chunks>
  Workflow: <actionable_workflows>
  ```
- The prompt defines the seven relation types and their directions (§7.6), asks only for pairs with a clear relation, and asks for `[]` when there are none.
- **Skip list**: pairs among the prompt's records that the user (current key) has already linked, as an insight or an insight draft, are listed as `Already linked, do not output: t:aaa–t:bbb, …`. Pairs only, no relation types. Other authors' insights are never included.
- **Prompt limit** *k*: `settings.insightPromptLimit`, set next to the counter in the tab. Default 30, minimum 4, maximum 200, even numbers only.
- **Batches**: if the selection *N* ≤ *k*, there is one prompt. Otherwise the records are sorted by specialty, then by `created_at`, and split into *m* = ⌈2*N*/*k*⌉ groups of at most *k*/2. There is one prompt for each pair of groups, *m*(*m*−1)/2 prompts in total, so every pair of selected records appears in at least one prompt. The tab shows "N records → P prompts" before anything is copied.
- Prompts are listed as cards ("Prompt 2 of 6 · groups 1+3") with a **Copy** button and a copied tick for the session.

**Insight JSON** (what the LLM returns)

```json
[
  {
    "from": "t:3f9a1c2e",
    "to": "t:7b20aa91",
    "relation": "supersedes",
    "rationale": "Both treat Parijat pests; t:3f9a1c2e replaces the chemical-first approach with manual removal and a 5-day recovery wait."
  }
]
```

- A directed relation reads "`from` *relation* `to`". For a symmetric relation the order does not matter.

**Import** (file or paste, JSON only, one at a time)
- Each short ID is resolved against the whole library. A row is **rejected**, with its reason in the import summary, when: an ID matches no record or more than one record; `from` and `to` are the same record; the two records are in different subjects; `relation` is not one of the seven types; `rationale` is missing or empty.
- A rationale longer than 500 characters is cut to 500 and the draft carries the warning `rationale shortened`.
- A `supersedes` row whose `from` record is older than its `to` record carries the warning `supersedes a newer record`.
- **Import never changes an existing insight.** A row for a pair the user (current key) has already linked or drafted is not turned into a draft:
  - same relation and direction → counted as a **duplicate**;
  - different relation or direction → listed as a **disagreement**: the pair, the existing relation and the proposed relation and rationale. Each disagreement has an **Accept** button. On an insight draft, Accept replaces the draft's relation, direction and rationale. On a signed insight, Accept signs an edit (same `d`, same visibility) and sends it if the insight is shared.
- Every other row becomes an **insight draft**, stored in `pending` (§8.1). Within one import, the first row for a pair wins and later rows for the same pair are treated as above.
- The summary reads "N drafts, M disagreements, K rejected, J duplicates", with reasons. The disagreement list stays until the next import or until the tab is left.

**Insight drafts**
- Listed in the Insights tab, not in Import & Review. Each card shows the relation, its direction, both records (short ID and preview) and the rationale. The relation, direction and rationale can be edited before signing.
- Actions: **Store**, **Share**, **Discard**, and **Store all**, **Share all**, **Discard all**. Share is not possible when either record is a `local` record (§7.6). Share all skips those drafts and reports how many it skipped.

**Manual linking**
- A form in the Insights tab: record A (searchable within the subject), relation type, record B, rationale (optional), then Store or Share.
- A **Link…** action in the record detail (§10.3), where the open record is A.
- A manual link to a pair the user has already linked opens that insight for editing instead of creating a new one.

**Insight list**
- Lists the subject's **visible insights** (§7.6), grouped by pair and relation type with a count ("conflicts ×2"). Expanding a group lists each insight with its author and rationale. Filters: relation type, author group.
- Each insight has the actions of §7.6: Edit and Delete for the user's own (current key), Hide for others, Share for the user's own local insights.

## 7. Signed records and merge rules

### 7.1 Record event

```js
{
  kind: 30078,                          // NIP-78 data for a specific app, addressable
  created_at: <unix seconds>,
  tags: [
    ['d', 'tacit-entry-' + uuid],       // stays the same across edits
    ['subject', '<subject label>'],
    ['author_name', '<name>'],          // optional: only when the author has set a name
  ],
  content: JSON.stringify(recordContent),
}
// signed → adds id, pubkey, sig
```

- Identity of a record: `key = pubkey + ':' + d`.
- `author_name` is the author's self-chosen name (at most 40 characters, control characters stripped). It is signed with the record. It is added to every record signed or edited while a name is set, and omitted when none is set. Records signed earlier keep the name they were signed with.
- A receiver shows an author's name from that author's newest held record (library or review queue). A newer record without the tag means the author cleared the name.
- `kind 30000` (the kind named in the original brief) is NIP-51 follow sets and must not be used.

### 7.2 Deletion event (NIP-09)

```js
{
  kind: 5,
  created_at: <unix seconds>,
  tags: [
    ['a', '30078:<pubkey>:<d>'],
    ['subject', '<subject label>'],     // so it reaches the right room
  ],
  content: '',
}
```

- A deletion takes effect only if `deletion.pubkey === record pubkey`. It removes the record and stores a **tombstone** `{ key, created_at, event }`.
- Tombstones are kept and are sent to peers who join, like shared records, so a deleted record is not brought back.

### 7.3 Receive pipeline

For each event received in subject room *R*:

1. `verifyEvent(event)` fails → drop; log `Rejected tampered record from peer <id6>` in the visible sync log and with `console.warn`.
2. Author is blocked → drop.
3. Kind 5 → apply §7.2 and continue with the next event.
4. Kind other than 30078 → drop. This is a type check, not content validation.
5. `key` is hidden → drop.
6. A tombstone exists for `key` with `created_at >=` the event's → drop.
7. The library holds `key` with `created_at >=` the event's → drop (duplicate or older version).
8. Author is trusted, or self (§5.4) → upsert into the library as `shared`, and relay it to the current peers in *R*.
9. Otherwise (unknown author), by the prefix of the event's `d` tag:
   - `tacit-works-` (a **Works mark**, §7.8): if its content is a valid Works mark, upsert into the library as `shared` and relay it to the current peers in *R*; otherwise drop. Works marks never enter the review queue.
   - `tacit-comment-` (a **comment**, §7.7): upsert into `pending` as a **folded comment** and do not relay it. If that author already has **200** folded comments, drop and log `Comment queue full for <npub-short>`.
   - Anything else: upsert into the review queue, grouped by author. If that author already has **50** pending records, drop and log `Review queue full for <npub-short>`. Folded comments do not count toward this cap.

Per decision Q18, events are **not** checked for subject/room match, timestamp sanity, content shape or size. The one exception is an unknown author's Works mark (step 9), whose content is checked because it skips review. See §12 for the accepted risks.

### 7.4 Local actions

| Action | Applies to | Effect |
|---|---|---|
| Store (draft) | Draft | Sign → library as `local` |
| Share (draft) | Draft | Sign → library as `shared` → send to *R*. Subscribes to the subject first if needed (§9.2). |
| Discard (draft) | Draft | Remove |
| Accept (incoming) | Unknown author's record | Library as `shared` (Q12: always relay) → send to *R* |
| Discard (incoming) | Unknown author's record | Remove from queue. Not hidden; it may come back on re-sync. |
| Accept all / Discard all | Author group in the queue | The same action, in bulk |
| Trust author / Block author | Review card, record detail, Identity tab | §7.5 |
| Share (library) | Own `local` record | Becomes `shared` → send to *R* |
| Edit | Own record (current key) | Re-sign with the same `d` and a newer `created_at`. If shared, send. |
| Delete | Own record (current key) | Sign a kind-5 event → remove → tombstone. If the record was shared, send the deletion. |
| Hide | Another author's record | Remove from library, add `key` to `hidden`, stop relaying |

There is no change from shared back to local. Delete is how an author withdraws a shared record.

### 7.5 Trust lists
- There is one global list of `{ pubkey, status: 'trusted' | 'blocked', nickname?, authorName? }`. `authorName` is the name the author shared, snapshotted when the author is trusted or blocked (blocking removes their records). `nickname` is this node's override and wins over the shared name; the Identity tab prefills it with the shared name, and saving it empty or equal to the shared name removes the override. An author can be trusted or blocked, not both.
- **Trust**: the author's pending records move into the library as `shared`.
- **Block**: all library and pending records by the author are removed, and future events from them are dropped (§7.3 step 2).
- The Identity tab lists, renames and removes entries.

### 7.6 Insights

**Relation types**

| Type | Direction | Meaning |
|---|---|---|
| `conflicts` | A ↔ B | Same situation, incompatible advice or outcome |
| `supersedes` | A → B | A replaces B's way of doing it; B is outdated |
| `reinforces` | A → B | A adds evidence or experience backing B |
| `refines` | A → B | A is a narrower or more precise version of B; both still hold |
| `duplicates` | A ↔ B | Same knowledge, said differently |
| `alternative_to` | A ↔ B | Different approach to the same goal; both hold |
| `prerequisite_of` | A → B | Do A before B |

No other type is accepted, from the JSON, the form or a peer.

**Insight event**

```js
{
  kind: 30078,
  created_at: <unix seconds>,
  tags: [
    ['d', 'tacit-link-<uuidA>-<uuidB>'],   // the two records' d uuids, sorted
    ['subject', '<subject label>'],
    ['author_name', '<name>'],             // optional, as §7.1
  ],
  content: JSON.stringify({
    schemaVersion: 1,
    type: 'insight',
    relation: 'supersedes',
    from: '<pubkey:d>',                    // full record keys, never short IDs
    to: '<pubkey:d>',
    rationale: '…',                        // required from the JSON, optional when linked by hand
    source: 'llm' | 'manual',
  }),
}
```

- **One insight per author per pair.** The `d` is built from the two records' uuids in sorted order, so an author's second insight on the same pair is an edit of the first. For a symmetric relation, `from` and `to` are stored in the same sorted order.
- An insight is a record event as far as sync is concerned. It goes through §7.2–§7.5 unchanged: the receive pipeline, the review queue and its 50-per-author cap, trust, block, hide, edit, delete and tombstones. Only its author can edit or delete it; anyone else can hide it, or state their own insight on the same pair.
- The content is not checked on receive (§7.3). An insight whose content is not a valid insight (unknown type, missing keys, `from` equal to `to`) is kept but never shown.

**Rules**
- **Same subject only.** Both records must have the same subject slug, and the insight takes that subject. It is routed to that subject room.
- **Shared needs shared.** An insight can be shared only when both of its records are `shared` in the user's library. Otherwise it can only be stored as local, and Share says "Share record t:xxxx first".
- **Visible insight.** An insight is shown (Insights list, record detail, Feed badges, map) only when both of its records are in the library. Otherwise it is kept and relayed as usual, and appears without any action once both records are there. This covers records not yet received, records waiting in review, hidden records, deleted records and blocked authors.
- **Cascade on delete.** Deleting one of the user's records also deletes the user's own insights (current key) that point at it, with one deletion event per insight, sent if the insight was shared, and removes the user's insight drafts that point at it. The delete confirmation says "This also deletes N of your insights". Editing a record does not touch insights.
- **Previous keys.** Insights signed by a previous key are read-only, like records. They do not count as "already linked" for the skip list or for import duplicates.

**Local actions on insights**

| Action | Applies to | Effect |
|---|---|---|
| Store / Share / Discard | Insight draft | As for drafts in §7.4, with the "shared needs shared" rule |
| Accept / Discard, Accept all / Discard all | Unknown author's insight in the review queue | As for incoming records in §7.4 |
| Share | Own local insight | Becomes `shared` → send to *R*, if both records are shared |
| Edit | Own insight (current key) | Change relation, direction or rationale; re-sign with the same `d` |
| Delete | Own insight (current key) | As §7.4 Delete |
| Hide | Another author's insight | As §7.4 Hide |

### 7.7 Comments

A **comment** is one author's signed text about a shared record, or a **reply** to another comment on it. Each comment is its own event. The **thread** is built on each device from the comments it holds, and is never stored or sent as one object.

**Comment event**

```js
{
  kind: 30078,
  created_at: <unix seconds>,
  tags: [
    ['d', 'tacit-comment-' + uuid],        // stays the same across edits
    ['subject', '<record subject label>'],
    ['author_name', '<name>'],             // optional, as §7.1
  ],
  content: JSON.stringify({
    schemaVersion: 1,
    type: 'comment',
    root: '<pubkey:d>',                    // the record the thread belongs to
    parent: '<pubkey:d>',                  // the record itself, or a comment with the same root
    body: '…',                             // plain text, 1–2000 characters
    postedAt: <unix seconds>,              // set when first signed, kept across edits
  }),
}
```

- A comment is a record event as far as sync is concerned (§7.2–§7.5), except that an unknown author's comment becomes a **folded comment** instead of entering the review queue (§7.3 step 9).
- A comment is **valid** when its content has the fields above, `root` is a record key, `parent` is `root` or the key of a comment with the same `root`, `body` is 1–2000 characters, and following `parent` links never leads back to the comment. An invalid comment is kept but never shown. Every comment in a cycle of parents is invalid.
- The body is shown as plain text with text bindings only (§12).

**Rules**
- **Shared records only.** Comments can be made only on a record that is `shared` in the user's library. On a local record the comment controls are not shown, and the record detail says "Share this record to discuss it". A comment is always shared; there are no local comments.
- **Visible thread.** A thread is shown only when its root record is in the library. Otherwise its comments are kept and relayed as usual, as for insights (§7.6).
- **Stubs.** A comment whose parent is not shown keeps its place. The parent is drawn as a **stub**: "Comment deleted" when there is a tombstone for it, "Comment hidden" when it is hidden or its author is blocked, and "Earlier comment not received yet" otherwise. A stub with no shown comment below it is not drawn.
- **Order.** Siblings are ordered by `postedAt`, oldest first. An edited comment keeps its place and shows "edited" when `created_at` is later than `postedAt`.
- **Cascade on delete.** Deleting one of the user's records also deletes the user's own comments (current key) on it, with one deletion event per comment, sent. Other authors' comments on it are kept but not shown. The delete confirmation counts them with the insights: "This also deletes N of your insights and M of your comments". Deleting a comment never deletes its replies.
- **Previous keys.** Comments signed by a previous key are read-only, like records.

**Folded comments**
- An unknown author's comment is stored in `pending` (`kind: 'incoming-comment'`) and is not relayed. The thread draws it in its place, collapsed: "Comment from <author label>, unknown author", with **Show**, **Accept**, **Trust author**, **Block author** and **Hide**.
- **Accept** moves it to the library as `shared` and sends it to *R*. **Trust author** also moves all of that author's other folded comments (§7.5). **Block author** removes them. **Hide** removes it and adds its key to `hidden`.
- Replies to a folded comment are drawn under it, whether it is expanded or not.
- Folded comments are not listed in Import & Review.

**Local actions on comments**

| Action | Applies to | Effect |
|---|---|---|
| Comment | Shared record | Sign with `parent = root` → library as `shared` → send to *R* |
| Reply | Shown or folded comment on a shared record | Accept the comment first if it is folded. Sign with `parent` = that comment → library as `shared` → send to *R* |
| Edit | Own comment (current key) | Change the body; re-sign with the same `d` and `postedAt` and a newer `created_at`; send |
| Delete | Own comment (current key) | As §7.4 Delete. Peers holding replies to it show a stub |
| Hide | Another author's comment | As §7.4 Hide. Its replies stay under a stub |
| Accept / Trust author / Block author | Folded comment | As above |

### 7.8 Works marks

A **Works mark** is one author's signed statement that a record worked for them. There is no negative mark; a failure is explained in a comment.

```js
{
  kind: 30078,
  created_at: <unix seconds>,
  tags: [
    ['d', 'tacit-works-<record uuid>'],     // the uuid in the record's d tag
    ['subject', '<record subject label>'],
    ['author_name', '<name>'],              // optional, as §7.1
  ],
  content: JSON.stringify({
    schemaVersion: 1,
    type: 'works',
    target: '<pubkey:d>',                   // the record's full key
  }),
}
```

- **One mark per author per record.** The `d` is built from the record's uuid, so marking again is an edit of the same mark.
- A mark is **valid** when its content has the fields above and the uuid in `target` matches the uuid in the mark's own `d`. An invalid mark is kept but not counted; an unknown author's invalid mark is dropped on receive (§7.3 step 9).
- A Works mark goes through §7.2–§7.5 like a record, except that it never enters the review queue (§7.3 step 9).
- **Shared records only**, as for comments. The Works control is not shown on a local record.
- **Toggle.** **Works** signs a mark → library as `shared` → send to *R*. Selecting it again un-marks: a deletion event, tombstone and send (§7.2). Marking again later signs a mark with the same `d` and a newer `created_at`, which the older tombstone does not stop (§7.3 step 6).
- **Own record.** An author can mark their own record. The control shows it as marked, but the mark is not counted.
- **Works count.** For a record in the library, *N* is the number of distinct authors with a valid mark on it in the library, leaving out the record's author. *T* is how many of those are trusted or self (§5.4). It is shown as "Works for N (T)" when *N* > 0, with the tooltip "N people say this worked for them; T of them you trust". *T* is shown even when it is 0.
- **Cascade on delete.** Deleting one of the user's records also deletes the user's own mark on it.

## 8. Storage

### 8.1 IndexedDB `tacit`, version 1

| Store | keyPath | Indexes | Value |
|---|---|---|---|
| `library` | `key` | `subjectSlug`, `pubkey`, `visibility` | `{ key, event, visibility, subjectSlug, receivedFrom?, receivedAt }`. Holds records, insights, comments and Works marks; their content has `type: 'insight'`, `'comment'` or `'works'` |
| `pending` | `id` | `pubkey`, `kind` (`draft` / `incoming` / `insight-draft` / `incoming-comment`) | Drafts: `{ id, kind:'draft', content, warnings[], createdAt }`. Incoming records and insights: `{ id: key, kind:'incoming', event, pubkey, receivedFrom, receivedAt }`. Insight drafts: `{ id, kind:'insight-draft', content, warnings[], createdAt }` with `content` as in §7.6. Folded comments: `{ id: key, kind:'incoming-comment', event, pubkey, receivedFrom, receivedAt }` |
| `tombstones` | `key` | – | `{ key, created_at, event }` |
| `trust` | `pubkey` | `status` | `{ pubkey, status, nickname?, authorName? }` |
| `hidden` | `key` | – | `{ key, hiddenAt }` |

### 8.2 localStorage

| Key | Value |
|---|---|
| `tacit.secretKey` | Hex private key (local signer only) |
| `tacit.previousKeys` | `string[]` of public keys |
| `tacit.settings` | `{ signerPreference, relays: string[], subjects: Subject[], insightPromptLimit?, authorName?, namePromptedKey?, nameNudgeDismissedKey? }` (limit default 30, §6.4). The two `*Key` fields hold the public key whose name prompt was answered, and whose name reminder was dismissed (§5.1, §10.11). |
| `tacit.theme` | `'light'` or `'dark'`. Absent means follow the system (§10.1) |
| `tacit.hue` | Site colour: `blue`, `teal`, `green`, `amber`, `rose` or `violet`. Absent means blue (§10.1) |
| `tacit.subjectHues` | JSON object mapping subject slug to a hue name. Several subjects may share a hue (§10.1) |
| `tacit.threadSeen` | `{ since: <unix seconds>, seen: { [recordKey]: <unix seconds> } }`. `since` is set the first time the app runs with comments; nothing received before it counts as new. `seen` is when the user last opened each record's full view (§10.11) |

`Subject = { label, slug, subscribed: boolean, password?: string }`. Passwords are stored in plain text, the same as the key.

Everything that reads the library as records leaves insights, comments and Works marks out: the Feed, the import duplicate check (§6.2), the directory `sharedCount` (§9.4) and the record counts. Backup includes insights, comments and Works marks with the library (§11.1).

## 9. Network

### 9.1 Rooms
- `appId: 'com.tacit-sync.v1'`. This is a new appId, so old clients that send raw arrays never meet new ones.
- Subject room id: `'subject:' + slug`. Directory room id: `'directory'`. The prefix stops a subject from colliding with the directory.
- Relays: `settings.relays`; empty means Trystero's defaults. **Check the relay option name against the pinned Trystero version.** The current code passes `relayConfig.urls`, which may not be the option 0.26 reads.
- Private subjects: `joinRoom({ appId, password, … }, roomId)`. Peers with a different password cannot connect, so the same slug with different passwords gives separate groups.

### 9.2 Subjects
- `slugify(label)`: lowercase, every run of non-`[a-z0-9]` becomes `-`, leading and trailing `-` removed. A label with an empty slug is rejected. Known limitation: `C++` and `C` become the same slug.
- Creating a subject whose slug already exists reuses that subject; the first label is kept.
- When the app loads, it joins rooms for all subscribed subjects and the directory.
- Subscribing joins the room; unsubscribing leaves it. Unsubscribing does not remove records.
- Sharing to an unsubscribed subject subscribes to it, joins the room, then sends.

### 9.3 Sync action `syncTacit` (subject rooms)
- Payload: an array of signed events (kind 30078 and kind 5). Insights, comments and Works marks are kind 30078 events and travel the same way.
- When a peer joins *R*: send it every `library` record with `visibility = 'shared'` and `subjectSlug = slug(R)`, plus the tombstones for that subject.
- When a record is shared, edited, deleted or accepted: send it to the current peers in *R*.
- Never sent: `local` records, drafts, pending incoming records, folded comments, or records from other subjects.

### 9.4 Directory action `announce`
- Payload: `[{ label, slug, sharedCount }]` (`sharedCount` counts shared records, not insights, comments or Works marks) for the user's **subscribed, non-private** subjects. Unsigned, and treated as hints only.
- Sent to each peer that joins the directory, and again to everyone when subscriptions change.
- On receive: keep entries whose `label` is a string of at most 80 characters and whose `slug === slugify(label)`, at most 100 per peer. Keep them per peer id, and drop that peer's entries when it leaves.
- Subject cache: every valid entry received is also saved locally (`tacit.subjectCache`, keyed by slug with `label`, `sharedCount`, `seenAt`), so it survives the announcing peer leaving and a reload. `seenAt` is when the subject was last announced by a peer that subscribes to it; a relayed entry carries its original `seenAt` and never refreshes it. Entries older than 7 days are dropped, and at most 200 are kept (newest first).
- Relay: announcements also list cached subjects not already in the user's own list, each with its `seenAt`, up to 100 entries in total. When a peer's announcement teaches the user a slug not yet in the cache, the user announces to everyone again.
- Discover list (Subjects tab): grouped by slug. Shows the most common label, the number of announcing peers, and the largest `sharedCount`, sorted by peer count. Cached subjects with no announcing peer now are listed as `saved`. Has a **Subscribe** button. Subjects the user already has are marked.

### 9.5 Connection status
- Reconnecting is left to Trystero. The Subjects tab shows each room's status (joined, peer count) and a sync log (the latest 50 lines).

## 10. UI

| Tab | Contents |
|---|---|
| **Feed** | The library. Filters: subject; author (all / mine / trusted / others); visibility (local / shared); text search over `information_chunks` and `actionable_workflows`. A row shows the subject label, a two-line preview of the information chunk, author avatar and label (nickname, the name the author shared, or short npub), verified badge, `created_at` and visibility. Tapping a row opens the record detail (§10.3), which shows the full record, warnings and the actions of §7.4. A row also shows the Works count and comment count (§10.12). |
| **Extract** | §6.1 |
| **Import & Review** | Import panel (§6.2). Review queue: drafts first, then incoming records and insights grouped by author, with bulk actions, trust/block buttons and a per-author count. Drafts can be edited before storing. An incoming insight card shows the relation, its direction, the rationale and both records; a record the user does not hold shows as "t:xxxx — not in your library". |
| **Insights** | §6.4: subject, record selection, insight prompts, insight import, insight drafts, manual link form, insight list |
| **Tacit Map** | §10.10 |
| **Subjects** | Subject list with a subscribe toggle, optional password, room status and peer count. Create subject. Discover list (§9.4). Sync log. |
| **Identity** | Public key, signer source and switch, key export/import (§5), previous keys, trust and block lists, relay URLs, backup export/import (§11). |

Help icons (a small "?" button) sit next to controls that need a note: the Extract specialty field and, in the Subjects tab, a subject's password and subscribe toggle. Hover, focus or tap shows the note in a tooltip that stays inside the viewport; Escape or tapping elsewhere closes it.

The redesign changes presentation and navigation only. Data, signing, sync and storage behave as specified elsewhere in this document.

### 10.1 Look and feel

- **Direction: grouped lists.** Each tab opens with a large title. Content sits in inset, rounded groups on a tinted page background. Rows in a group are separated by hairlines and show a chevron when they open something. Filters use a segmented control where the choices are few and fixed.
- **Styles.** Tailwind with a theme. The source stylesheet defines design tokens as CSS custom properties (colour roles, radii, font stacks), one set per scheme. The Tailwind config maps its colours, radii and fonts to those tokens, so utilities such as `bg-surface` follow the active scheme without `dark:` variants. Patterns that repeat (group, row, button, field) are component classes built with `@apply`; one-off layout uses utilities. Once every tab is migrated, the config drops Tailwind's default palette so only token colours exist. There are no inline colours.
- **Colour scheme.** Light and dark palettes are both designed, each with its own token values. With no stored preference the app follows the system setting (`prefers-color-scheme`). A palette button in the header opens a theme panel with three parts: a System, Light, Dark choice that stores `light` or `dark` in `tacit.theme` (removing the key for System); a row of six hue swatches (blue, teal, green, amber, rose, violet) that retint the whole site by overriding the accent tokens for both schemes through `data-hue` on `<html>`, stored in `tacit.hue`; and a list of subjects, each with a hue choice stored in `tacit.subjectHues`, which tints that subject's label wherever it appears (`data-hue` on the label retints its subtree). Theme choices stay on this device: they are never shared and not part of backups. The stored scheme and hue are applied before first paint, so a reload does not flash the default look. so a reload does not flash the other scheme.
- **Typeface.** DM Sans from the bundled file, with a system sans-serif stack as fallback. Monospace uses the system monospace stack. Public keys, hex and the sync log use monospace.
- **Existing hooks are kept.** Every element `id`, every `data-tab` attribute and every behavioural class name that the tests and manual checks use (for example `record`, `store-draft`, `accept-incoming`, `trust-author`) stays on an equivalent element. Where a control changes form (the author filter becomes a segmented control), the `id` moves to the new control's container and the manual checks that name it are updated.

### 10.2 Navigation and layout

- Seven destinations, as in the table above, in that order. On narrow screens (below 900 px) they form a tab bar fixed to the bottom of the screen, with the safe-area inset respected. From 900 px up, the same destinations appear as a navigation bar at the top.
- The content column is full width below 900 px and at most 75% of the window from 900 px up, centred. Forms and lists use the full width of the column.
- Touch targets are at least 44 × 44 px.
- The header holds the app name, the notification bell (§10.11) and the colour-scheme control. The tagline moves to the Feed's empty state (§10.7).

### 10.3 Record detail

- Opens from a Feed row as a sheet (a native `dialog`) with the full information chunk, the actionable workflow, author, verified badge, visibility, `created_at` and any warnings.
- It holds the actions of §7.4 that apply to the record (Share, Edit, Delete, Hide, Trust author, Block author), keeping their current class names.
- A **Relations** section lists the record's visible insights, grouped by relation type, each with the other record (short ID and preview), author and rationale, and the insight actions of §7.6. A **Link…** action creates an insight with this record as A (§6.4).
- The record's short ID is shown.
- On a shared record: a **Works** button (pressed when the user has marked it) with the Works count, the number of comments, and an **Open** button to the full view (§7.8, §10.13). On a local record these are replaced by "Share this record to discuss it".
- Closes with a Close button, `Esc`, or a tap outside it. Closing returns focus to the row that opened it. Deleting or hiding closes it.
- Record text is shown with text bindings only, never as HTML (§12).

### 10.4 Author avatars

- Each author shows a round avatar: an initial on a background colour. The colour is derived from the public key alone, so the same key looks the same on every screen, every device and every reload.
- The initial is the first letter of the author label already shown (nickname, "You", "by previous key" or the short npub; for the short npub, the first two characters after `npub1`).
- The hue is derived from the key; saturation and lightness come from tokens, so the initial meets 4.5:1 contrast in both schemes.
- Avatars appear in Feed rows and the record detail, on review cards and author groups, in the trust list, and in the Identity tab header. They are decoration: the author label is always shown as text beside them and the avatar is hidden from assistive technology.
- No images are fetched.

### 10.5 Toasts

- Short confirmations appear as toasts: prompt copied, secret copied, draft stored, shared, accepted, edited, deleted, hidden, author trusted or blocked, backup exported.
- At most three are visible. A new one with the same text as a visible one resets that one's timer instead of stacking. Each disappears after 4 seconds, and the user can dismiss it sooner.
- Toasts are announced politely (`role="status"`). A toast that reports a failure uses `role="alert"` and stays 8 seconds.
- Results that need to stay on screen stay inline: the import summary (`#import-summary`), identity messages (`#identity-message`), the backup restore summary (`#backup-summary`) and field validation errors. The inline "Copied" text is replaced by a toast.
- Toasts sit above the tab bar and never cover it.

### 10.6 Keyboard shortcuts

| Keys | Action |
|---|---|
| `/` | Go to Feed and focus the search field |
| `g` then `f`, `e`, `r`, `n`, `m`, `s`, `i` | Go to Feed, Extract, Import & Review (`r`), Insights (`n`), Tacit Map (`m`), Subjects, Identity |
| `?` | Open the shortcut list |
| `Esc` | Close the open sheet or list |

- Shortcuts do nothing while focus is in a text field, select, textarea or editable element, or while Ctrl, Meta or Alt is held.
- After `g`, the next key must arrive within 1.5 seconds. Any other key cancels the sequence and is not treated as a shortcut.
- The shortcut list is reachable from the header without a keyboard.

### 10.7 Empty states

Each empty list shows a short title, one sentence on what goes here, and one button for the next step:

| Where | Condition | Button |
|---|---|---|
| Feed | Library is empty | Go to Extract |
| Feed | Filters match nothing (`#feed-empty`) | Clear filters |
| Extract | No subjects | Create subject (focuses the field) |
| Import & Review | Nothing to review | None; points to the import panel above |
| Subjects | No subjects | Create subject (focuses the field) |
| Subjects, Discover | No public subjects found | None; says peers appear when others announce public subjects |
| Identity | No trusted or blocked authors | None; says how to trust an author from a record |
| Insights | Subject has fewer than 2 records | Go to Extract |
| Insights | Subject has records but no visible insights | None; points to record selection and the link form |
| Tacit Map | Subject has no records | Go to Extract |
| Full view | Record has no comments | None; says "No comments yet" above the comment field |

### 10.8 Accessibility

- Text and interactive elements meet WCAG AA contrast in both schemes.
- Every control is reachable and operable by keyboard, with a visible focus ring. Exception: the Tacit Map's canvas (§10.10). It is a visual aid; its content is fully available in the Insights list and the record detail Relations section, and its toolbar and legend are ordinary keyboard-operable controls. The tab bar and segmented controls expose their selected state.
- Focus moves into the record detail when it opens and returns to its row when it closes (§10.3). The shortcut list behaves the same way.
- Any transition respects `prefers-reduced-motion`. No decorative animation is part of this redesign.

### 10.9 Insights in the Feed

- A Feed row shows a **Superseded** badge when a visible insight says another record supersedes it, and the row is faded. A **Conflicts (n)** badge shows the number of distinct records it has a visible `conflicts` insight with.
- Only visible insights in the library count: the user's own, accepted ones and those from trusted authors. Other relation types get no badge.
- Selecting a badge opens the record detail at its Relations section.

### 10.10 Tacit Map

- One subject at a time, chosen in the tab. Radial layout: the subject in the centre, its specialties on an inner ring (records with no specialty go under "General"), and its records on the outer ring, grouped under their specialty. Within a specialty, records are ordered so that linked records sit next to each other. The layout is deterministic: the same library gives the same picture.
- A record node is labelled with its short ID and the first ~40 characters of its information chunk. Superseded records are faded.
- Visible insights are edges, grouped by pair and relation type: one edge per type, labelled with a count when more than one author states it. Each relation type has its own colour **and** line pattern; directed types have an arrowhead.
- A legend lists the relation types and works as a filter. A **Linked only** toggle hides records without visible insights; it is on by default when the subject has more than 40 records.
- Selecting a record node opens the record detail. Selecting an edge opens a sheet listing its insights with author, rationale and the insight actions.
- Toolbar: Zoom in, Zoom out, Fit. With the map focused, `+`, `-` and `0` do the same.
- Positions and the element list come from `tacit-map.js`; Cytoscape draws them with its `preset` layout. Its style is built from the colour tokens and rebuilt when the colour scheme changes.

### 10.11 Notifications

- The header bell opens a popover. Its badge counts the unread items: the review count (drafts plus incoming records), plus the three comment counts below, plus 1 while the name reminder is active.
- The popover lists the active items. When there are none it says "Nothing to show".
  - **Review (N)**, shown when N > 0. Review opens Import & Review on the review queue.
  - **Comments to review (N)**: folded comments on the user's records (current or previous key).
  - **Replies to you (N)**: comments in the library whose parent is one of the user's comments, received after that record's `seen` time.
  - **New comments on your records (N)**: other authors' comments in the library on the user's records, received after that record's `seen` time and not already counted as replies.
  - Each comment item is shown when N > 0 and opens the full view of the record with the newest such comment. "Received after" compares `receivedAt`, never `created_at`, and nothing received before `tacit.threadSeen.since` counts (§8.2). Opening a full view sets that record's `seen` time to now. Works marks never notify.
  - **Set your name**, shown while the reminder is active. Set name opens the Identity tab with the Name field focused. Dismiss removes the reminder and lowers the badge by 1.
- The name reminder is active when no name is set, the user answered the name prompt (§5.1), and has not dismissed the reminder. Saving a name removes it. Dismissing is stored per public key, so an identity switch or import brings it back.
- Escape, a click outside, or choosing an item closes the popover.

### 10.12 Works and comments in the Feed

- A Feed row shows "Works for N (T)" when N > 0, and "Comments N" when N > 0, next to the insight badges (§10.9). The comment count counts shown comments in the library; folded comments are not counted.
- No sort or filter uses them yet.

### 10.13 Full view

- A page of its own for one record at `#/tacit/<8 hex of the short ID>`. `tacit-route.js` parses it as `{ tab: 'tacit', id }`. It is not a navigation destination; the Feed stays selected in the navigation.
- Opened from the record detail's **Open** button, from a notification (§10.11), or by visiting the URL. A **Back** control returns to the previous route, or to the Feed when the page was opened directly.
- The short ID is resolved against the library. No match shows "Not in your library yet". More than one match shows a list of the matches (author and preview) to pick from.
- Shows the record as the record detail does (§10.3), with its actions, Relations and the Works button and count, then the thread, with a comment field for a new top-level comment.
- Each comment shows the author avatar and label, the time (`postedAt`), "edited" when it applies, the body, and its actions (§7.7). **Reply** opens a field under that comment; one reply field is open at a time.
- **Nesting.** Each level of replies is indented one step, up to 4 levels below 900 px and 8 from 900 px up. Deeper replies stay at the last level and start with "↳ replying to <author label>".
- Any comment with replies can be collapsed to "▸ N replies". Collapsed state lasts for the session.
- Folded comments and stubs are drawn as §7.7.
- On open, focus moves to the page heading.

## 11. Backup and existing data

### 11.1 Backup file

```json
{
  "format": "tacit-backup",
  "version": 1,
  "exportedAt": "<ISO>",
  "records": [{ "event": { }, "visibility": "local" }],
  "tombstones": [{ }],
  "trust": [{ "pubkey": "…", "status": "trusted", "nickname": "…" }],
  "subjects": [{ "label": "…", "slug": "…", "subscribed": true }]
}
```

- `records` holds every library event: records, insights, comments and Works marks. Folded comments, like other pending items, are not included.
- The backup **excludes** the private key, which has its own export, and subject passwords.
- On import: every event goes through `verifyEvent`. Records merge per §7.3 steps 5–7, with visibility from the file; failures are counted and reported. Tombstones and trust entries merge (existing trust entries win on conflict). Subjects are merged by slug.

### 11.2 Existing data
- No migration. The old keys (`tacit_knowledge_db`, `tacit_pending_review`, `tacit_settings`, `tacit_subject_categories`) are ignored and left as they are.

## 12. Security notes and accepted risks

| Risk | Status |
|---|---|
| A relaying peer changes a record | **Mitigated**: Schnorr signature over the `id` hash; checked on every receive and on backup import |
| Private key stolen by XSS or a third-party script | **Reduced**: NIP-07 preferred; all dependencies vendored. The local key is still readable by any script that runs in the page. Never use `innerHTML` with record data; Alpine `x-text` only. |
| Fake identities (unlimited keys) | **Partial**: unknown authors need review; 50 pending per author; block list |
| Oversized or many events fill IndexedDB, or freeze the tab | **Accepted** (Q18). A trusted author's records skip review. |
| Off-topic record in a room (subject tag ≠ room) | **Accepted** (Q18). Shown under its own subject tag. |
| Future `created_at` stops later edits from taking effect | **Accepted** (Q18). Only the author can do this, and only to their own records. |
| A relay withholds records or replays old versions | **Partial**: an old version never replaces a newer one (§7.3 step 7); withholding is not detectable |
| Shared contents are readable by anyone in the room | **By design**; private subjects limit who can join |
| Directory reveals a user's subscribed public subjects | **By design**; private subjects are not announced |
| Subject passwords and the local key are stored in plain text | **Accepted** for v1 |
| A trusted author marks good records as superseded or conflicting | **Partial**: the badge opens the insight with its author and rationale; the user can hide it or block the author |
| An insight reveals that a local record exists | **Mitigated**: an insight can be shared only when both records are shared (§7.6) |
| Insight prompts send record text to an outside LLM | **By design**, as with extraction; the author is never included |
| Fake identities inflate a Works count | **Partial**: the count shows how many marks come from trusted authors, "Works for N (T)"; blocking removes an author's marks |
| Works marks skip review, so an unknown author's events are relayed without review | **Mitigated**: an unknown author's mark is kept only when its content is a valid Works mark (§7.3 step 9), and there is one per author per record |
| Comment spam from unknown authors | **Mitigated**: folded and not relayed until accepted; 200 per author; block |
| A deleted or edited comment's earlier text stays with peers who already received it | **By design**, as for records |
| Crafted comments whose parents form a cycle | **Mitigated**: comments in a cycle are invalid and never shown (§7.7) |

## 13. Testing

- `package.json` (dev only, `"type": "module"`) with `npm test` → `node --test tests/`.
- Unit tests cover: JSON/CSV parsers, paste format detection, import validation and warnings, `slugify`, prompt builder, building and verifying record and deletion events (including a tampered `content` failing `verifyEvent`), the merge decisions in §7.3 (driven by in-memory state), backup build and parse, and the interface helpers in `tacit-ui.js` (§10): avatar derivation is deterministic, in range and different for different keys; the shortcut resolver handles `/`, `g` sequences, the 1.5 s timeout, and ignores editable targets and modifier keys; the toast queue caps at three, merges duplicates and expires by time; the theme resolver maps a stored value and the system setting to the effective scheme, and `hueOf` accepts only the six known hues.
- Insights (`tacit-insight.js`): short ID derivation and resolution (no match, ambiguous match); batch split covers every pair, respects the limit and the prompt count formula; prompt contents (record blocks, no author, skip list of own pairs only); JSON rows to drafts with each rejection reason, rationale shortening, the `supersedes a newer record` warning, duplicates, disagreements and Accept; insight template with deterministic `d` and sorted symmetric pairs; visible-insight filter; grouping by pair and relation; Feed badges; cascade on delete; the "shared needs shared" check. Existing seams: `decideIncoming` treats insight events like records; `filterFeed`, `buildDrafts` and `announcementFor` leave insights out.
- Comments and Works marks (`tacit-comment.js`): comment and mark templates (Works `d` from the record uuid); validity (bad `root` or `parent`, parent in another thread, body length, parent cycles, Works `d` and `target` mismatch); thread building: nesting, sibling order by `postedAt`, "edited", stubs with each reason, stubs with nothing below not drawn, folded comments in place; Works counts (distinct authors, own mark not counted, trusted split); notification counts with `since` and `seen`; cascade on delete. Router: `#/tacit/<id>` parses and builds. Existing seams: `decideIncoming` sends an unknown author's valid Works mark to the library, drops an invalid one, and sends an unknown author's comment to `pending` as folded, with its own cap; `filterFeed`, `buildDrafts` and `announcementFor` leave comments and marks out.
- Name prompt and reminder (`tacit-ui.js`): the prompt is needed until it is answered for the active public key, and again after a key change; the reminder is active only with no name, after an answer and before dismissal.
- Tacit Map (`tacit-map.js`): deterministic positions, specialty grouping with "General", linked records adjacent, grouped edges with counts and classes, Linked only. Cytoscape drawing is checked by hand.
- Visual and interaction checks for the redesign are manual, in a browser, in the slice 12 standalone test. The existing unit tests must stay green with no edits other than the selector updates in §10.1.
- Manual checks (two browser profiles, A and B):
  1. A shares a record in subject S; B, subscribed to S, sees it in review (A is unknown to B).
  2. B trusts A; A's next record goes straight into B's library.
  3. A changes one byte of a record in transit (dev hook); B rejects it and logs it.
  4. A's local record never reaches B.
  5. A edits a shared record; B ends up with only the newer version. A deletes it; B removes it and does not bring it back after re-joining.
  6. A private subject with password P: C without P cannot connect.
  7. Directory: B sees S in Discover, with A's peer count.
  8. A comments on a shared record, then goes offline. B, with A unknown, sees it folded in the full view. C joins with only B online and does not get it until B accepts it.
  9. A and B reply to each other 6 levels deep. At 390 px the replies stop indenting at level 4 and show "↳ replying to".
  10. A deletes a comment that has replies. B sees "Comment deleted" with the replies in place.
  11. A, B and C mark D's record Works, and B trusts only A. B sees "Works for 3 (2)". A un-marks; B sees "Works for 2 (1)".

## 14. Delivery phases

**Phase 1: signed core**
- Vendored dependencies and the ES-module bootstrap
- Identity (both signers, export/import)
- Subject model and slugs, subject rooms, auto-join
- Import (file and paste, JSON and CSV) with validation and warnings
- Review queue, store/share/discard, the receive pipeline (§7.3 steps 1–2 and 4–9), trust and block from cards
- IndexedDB storage
- Feed with record details
- Unit tests

**Phase 2: lifecycle and discovery**
- Edit, delete, tombstones (§7.2, §7.3 steps 3 and 6), hide
- Directory room and the Discover list
- Private subjects (passwords)
- Backup export/import
- Trust list management in the Identity tab, bulk review actions, the 50-per-author cap
- Feed filters and search

**Phase 3: interface redesign (§10)**
- Tailwind-themed design system with light and dark schemes, bundled font, `npm run build:css`
- Grouped-list layout, tab bar and top navigation, record detail
- Author avatars, toasts, keyboard shortcuts, guided empty states

**Phase 4: insights and Tacit Map (§6.4, §7.6, §10.9, §10.10)**
- Manual insights: insight events, Link… and Relations in record detail, Insights tab link form and insight list, incoming insights in review, cascade on delete, Feed badges
- Insight prompt: record selection, insight prompts with batches, import, insight drafts, disagreements
- Tacit Map with vendored Cytoscape (needs manual insights only)

**Phase 5: Works and comments (§7.7, §7.8, §10.11–§10.13)**
- Works marks: events, toggle, Works count in the record detail and the Feed
- Full view route
- Comments: events, folded comments, threads with stubs and nesting, edit, delete, hide, cascade on delete
- Comment notifications

## 15. Acceptance criteria

- [ ] No network request goes to a third-party script or stylesheet host when the page loads.
- [ ] A fresh profile generates a key on first load, and keeps it across reloads.
- [ ] A record stored as local never appears in another peer's view under any sequence of joins or shares.
- [ ] A record shared by A arrives at B byte-identical, and passes `verifyEvent`.
- [ ] Changing any field of a received event makes B drop it and show a sync-log entry.
- [ ] Importing a file without `information_chunks` in a row rejects that row and imports the rest.
- [ ] Importing without a selected subject is not possible.
- [ ] An edited record replaces the earlier version on every peer that receives both, in either order.
- [ ] A deleted record does not come back after a peer that still holds it re-joins.
- [ ] Blocking an author removes their records and refuses new ones.
- [ ] A backup imported into a fresh profile restores the library, trust lists and subjects, and rejects tampered events.
- [ ] `npm test` passes.
- [ ] Phase 3: with the network log open, every request on load goes to the page's own origin, including the font.
- [ ] Phase 3: with no stored preference the app matches the system colour scheme. The header control switches it and the choice survives a reload with no flash of the other scheme.
- [ ] Phase 3: all five tabs are usable at 390 px and 1280 px wide, in both schemes, with no horizontal scrolling.
- [ ] Phase 3: every action in §7.4 can be reached from the record detail, by keyboard alone.
- [ ] Phase 3: the same public key shows the same avatar everywhere and after a reload.
- [ ] Phase 3: each empty state in §10.7 appears on a fresh profile and its button does what it says.
- [ ] Phase 4: an insight shared by A arrives at B; it is shown only once B holds both records, and goes through review while A is unknown to B.
- [ ] Phase 4: an insight with a local record cannot be shared.
- [ ] Phase 4: a selection larger than the prompt limit gives *m*(*m*−1)/2 prompts and every pair of selected records is in at least one.
- [ ] Phase 4: importing the same JSON twice creates no new drafts; a different relation for a linked pair shows as a disagreement and Accept applies it.
- [ ] Phase 4: deleting a record deletes the deleter's insights on it, on every peer.
- [ ] Phase 4: a superseded record is faded in the Feed and on the map.
- [ ] Phase 4: the Tacit Map draws the same layout after a reload, and the page still loads nothing from a third-party host.
- [ ] Phase 5: a comment by A on a shared record reaches B. While A is unknown to B it is folded and B does not relay it; after Accept, B relays it.
- [ ] Phase 5: replies nest to any depth, and when two peers reply to the same comment at the same time, both end up with both replies.
- [ ] Phase 5: deleting a comment leaves its replies in place under a stub on every peer.
- [ ] Phase 5: a local record has no Works or comment controls.
- [ ] Phase 5: "Works for N (T)" is the same on every peer with the same marks and trust list; an author's mark on their own record is not counted; un-marking lowers it on every peer.
- [ ] Phase 5: `#/tacit/<id>` opens the full view after a reload, and Back returns to where it was opened from.

## 16. Open items

- ~~Confirm Trystero 0.26's relay URL option name (§9.1).~~ Confirmed: `relayConfig.urls`. Note 0.26 handlers are properties: `action.onMessage = (data, { peerId })`, `action.send(data, { target })`, `room.onPeerJoin = fn`; the old code's `send(data, peerId)` was wrong.
- ~~Choose the exact versions to vendor~~ Done: see `vendor/VERSIONS.md`.
