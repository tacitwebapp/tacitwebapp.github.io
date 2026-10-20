# Tacit — Product & Technical Spec

Status: Draft · 2026-10-20
Vocabulary: see [GLOSSARY.md](GLOSSARY.md). Terms in **bold** below are glossary terms.

## 1. Summary

Tacit is a static, serverless browser app (GitHub Pages). A user:

1. builds an **extraction prompt** for an **input type** and **subject**, and runs it in an outside LLM;
2. **imports** the LLM output (JSON/CSV, as a file or pasted text) as **drafts**;
3. reviews each draft, then either keeps it as a **local record** or publishes it as a **shared record**;
4. exchanges shared records peer-to-peer with everyone who subscribes to the same **subject room**.

Every record that is kept is a **signed record**: a Nostr event signed by the author's **identity**. A **peer** that **relays** a record cannot change it without breaking the signature. Incoming records from **trusted authors** go straight into the library; records from **unknown authors** go through the **review queue**.

The personal-vault use and the community-exchange use are equally important.

## 2. Goals and non-goals

### Goals
- Signed authorship and tamper evidence for every record, including records relayed through several peers.
- Local records never leave the device.
- One concept of subject. The subject decides which room a record goes to.
- Users can find public subjects without having to share names outside the app.
- No backend and no build step for app code; works on GitHub Pages.
- No third-party scripts at runtime. All dependencies are vendored.

### Non-goals
- Calling an LLM from inside the app. Extraction stays copy-paste.
- Encrypting record contents. Shared means readable by every peer in the room.
- Migrating data from the current app version (see §11).
- Moderation beyond per-user trust and block lists.
- Mobile-native packaging.

## 3. Current state (baseline)

| Area | Today | Change |
|---|---|---|
| Records | Unsigned JSON objects in `localStorage` | Signed Nostr events in IndexedDB |
| Rooms | Free-text channel list, not linked to subjects | Subject = room, plus a directory room |
| Peer join | Sends **all** saved records, including "stored locally" ones ([tacit-sync.js:15](../tacit-sync.js#L15)) | Sends only shared records for that room |
| Share | Sends the record, then drops it from the sharer's library ([tacit-app.js:58](../tacit-app.js#L58)) | Sharer keeps it as shared |
| Share all | Sends every record to every channel ([tacit-app.js:62](../tacit-app.js#L62)) | Removed; routing is by subject |
| Duplicates | `JSON.stringify` equality (sensitive to key order) | Identified by `(pubkey, d)`, newest wins |
| Schema | Free-form; feed falls back to `chunk`/`title`/`action_item` | `information_chunks` required |
| Dependencies | Alpine `3.x.x`, Tailwind play CDN, Trystero via esm.sh | Pinned and vendored |

## 4. Architecture

### 4.1 Modules

Plain ES modules, no bundler. `index.html` loads `tacit-main.js` as `type="module"`, which imports vendored Alpine's ESM build, registers the component, then calls `Alpine.start()`. Modules marked *pure* have no DOM, storage or network access, so `node --test` can test them.

| File | Responsibility | Pure |
|---|---|---|
| `index.html` | Markup and tabs | – |
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
| `vendor/` | Pinned third-party builds plus `VERSIONS.md` | – |
| `tests/*.test.js` | Unit tests | – |

`tacit-feed.js` is replaced by `tacit-events.js` and `tacit-store.js`.

### 4.2 Dependencies (vendored)

| Library | Purpose | Notes |
|---|---|---|
| Alpine.js 3.x (exact patch) | UI reactivity | ESM build (`module.esm.js`) |
| Trystero 0.26.0, nostr strategy | WebRTC P2P with Nostr relays for connection setup | Self-contained single-file ESM bundle (e.g. esm.sh `?bundle` output) |
| nostr-tools 2.x (exact) | `finalizeEvent`, `verifyEvent`, `getPublicKey`, `generateSecretKey`, `nip19` | Self-contained ESM bundle |
| Tailwind CSS 3.x | Styling | CSS generated once with the Tailwind CLI and committed as `vendor/tailwind.css`. The regenerate command goes in `VERSIONS.md`. |

`vendor/VERSIONS.md` records each library's exact version, source URL and SHA-256 hash. No `<script src>` and no `import` may point to a third-party host.

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
- Identity tab: shows the public key (npub plus short hex) and the signer source. The user can switch the signer when both are available. Switching changes identity, so it gets the same warning as an import (§5.3).

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
- Input type and subject dropdowns, plus "Create subject". The prompt is built by `buildTacitPrompt({ inputType, subjectCategory })` (existing behaviour), with a **Copy** button.
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
  "...": "other fields kept as they are"
}
```

## 7. Signed records and merge rules

### 7.1 Record event

```js
{
  kind: 30078,                          // NIP-78 data for a specific app, addressable
  created_at: <unix seconds>,
  tags: [
    ['d', 'tacit-entry-' + uuid],       // stays the same across edits
    ['subject', '<subject label>'],
  ],
  content: JSON.stringify(recordContent),
}
// signed → adds id, pubkey, sig
```

- Identity of a record: `key = pubkey + ':' + d`.
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
9. Otherwise (unknown author) → upsert into the review queue, grouped by author. If that author already has **50** pending records, drop and log `Review queue full for <npub-short>`.

Per decision Q18, events are **not** checked for subject/room match, timestamp sanity, content shape or size. See §12 for the accepted risks.

### 7.4 Local actions

| Action | Applies to | Effect |
|---|---|---|
| Store (draft) | Draft | Sign → library as `local` |
| Share (draft) | Draft | Sign → library as `shared` → send to *R*. Subscribes to the subject first if needed (§9.2). |
| Discard (draft) | Draft | Remove |
| Accept (incoming) | Unknown author's record | Library as `shared` (Q12: always relay) → send to *R* |
| Discard (incoming) | Unknown author's record | Remove from queue. Not hidden; it may come back on re-sync. |
| Accept all / Discard all | Author group in the queue | The same action, in bulk |
| Trust author / Block author | Review card, feed card, Identity tab | §7.5 |
| Share (library) | Own `local` record | Becomes `shared` → send to *R* |
| Edit | Own record (current key) | Re-sign with the same `d` and a newer `created_at`. If shared, send. |
| Delete | Own record (current key) | Sign a kind-5 event → remove → tombstone. If the record was shared, send the deletion. |
| Hide | Another author's record | Remove from library, add `key` to `hidden`, stop relaying |

There is no change from shared back to local. Delete is how an author withdraws a shared record.

### 7.5 Trust lists
- There is one global list of `{ pubkey, status: 'trusted' | 'blocked', nickname? }`. An author can be trusted or blocked, not both.
- **Trust**: the author's pending records move into the library as `shared`.
- **Block**: all library and pending records by the author are removed, and future events from them are dropped (§7.3 step 2).
- The Identity tab lists, renames and removes entries.

## 8. Storage

### 8.1 IndexedDB `tacit`, version 1

| Store | keyPath | Indexes | Value |
|---|---|---|---|
| `library` | `key` | `subjectSlug`, `pubkey`, `visibility` | `{ key, event, visibility, subjectSlug, receivedFrom?, receivedAt }` |
| `pending` | `id` | `pubkey`, `kind` (`draft` / `incoming`) | Drafts: `{ id, kind:'draft', content, warnings[], createdAt }`. Incoming: `{ id: key, kind:'incoming', event, pubkey, receivedFrom, receivedAt }` |
| `tombstones` | `key` | – | `{ key, created_at, event }` |
| `trust` | `pubkey` | `status` | `{ pubkey, status, nickname? }` |
| `hidden` | `key` | – | `{ key, hiddenAt }` |

### 8.2 localStorage

| Key | Value |
|---|---|
| `tacit.secretKey` | Hex private key (local signer only) |
| `tacit.previousKeys` | `string[]` of public keys |
| `tacit.settings` | `{ signerPreference, relays: string[], subjects: Subject[] }` |

`Subject = { label, slug, subscribed: boolean, password?: string }`. Passwords are stored in plain text, the same as the key.

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
- Payload: an array of signed events (kind 30078 and kind 5).
- When a peer joins *R*: send it every `library` record with `visibility = 'shared'` and `subjectSlug = slug(R)`, plus the tombstones for that subject.
- When a record is shared, edited, deleted or accepted: send it to the current peers in *R*.
- Never sent: `local` records, drafts, pending incoming records, or records from other subjects.

### 9.4 Directory action `announce`
- Payload: `[{ label, slug, sharedCount }]` for the user's **subscribed, non-private** subjects. Unsigned, and treated as hints only.
- Sent to each peer that joins the directory, and again to everyone when subscriptions change.
- On receive: keep entries whose `label` is a string of at most 80 characters and whose `slug === slugify(label)`, at most 100 per peer. Keep them per peer id, and drop that peer's entries when it leaves.
- Discover list (Subjects tab): grouped by slug. Shows the most common label, the number of announcing peers, and the largest `sharedCount`, sorted by peer count. Has a **Subscribe** button. Subjects the user already has are marked.

### 9.5 Connection status
- Reconnecting is left to Trystero. The Subjects tab shows each room's status (joined, peer count) and a sync log (the latest 50 lines).

## 10. UI

| Tab | Contents |
|---|---|
| **Feed** | The library. Filters: subject; author (mine / trusted / others); visibility (local / shared); text search over `information_chunks` and `actionable_workflows`. A card shows the subject label, information chunk, actionable workflow, author (nickname or short npub), verified badge, `created_at`, visibility and warnings. Actions per §7.4. |
| **Extract** | §6.1 |
| **Import & Review** | Import panel (§6.2). Review queue: drafts first, then incoming records grouped by author, with bulk actions, trust/block buttons and a per-author count. Drafts can be edited before storing. |
| **Subjects** | Subject list with a subscribe toggle, optional password, room status and peer count. Create subject. Discover list (§9.4). Sync log. |
| **Identity** | Public key, signer source and switch, key export/import (§5), previous keys, trust and block lists, relay URLs, backup export/import (§11). |

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

## 13. Testing

- `package.json` (dev only, `"type": "module"`) with `npm test` → `node --test tests/`.
- Unit tests cover: JSON/CSV parsers, paste format detection, import validation and warnings, `slugify`, prompt builder, building and verifying record and deletion events (including a tampered `content` failing `verifyEvent`), the merge decisions in §7.3 (driven by in-memory state), and backup build and parse.
- Manual checks (two browser profiles, A and B):
  1. A shares a record in subject S; B, subscribed to S, sees it in review (A is unknown to B).
  2. B trusts A; A's next record goes straight into B's library.
  3. A changes one byte of a record in transit (dev hook); B rejects it and logs it.
  4. A's local record never reaches B.
  5. A edits a shared record; B ends up with only the newer version. A deletes it; B removes it and does not bring it back after re-joining.
  6. A private subject with password P: C without P cannot connect.
  7. Directory: B sees S in Discover, with A's peer count.

## 14. Delivery phases

**Phase 1: signed core**
- Vendored dependencies and the ES-module bootstrap
- Identity (both signers, export/import)
- Subject model and slugs, subject rooms, auto-join
- Import (file and paste, JSON and CSV) with validation and warnings
- Review queue, store/share/discard, the receive pipeline (§7.3 steps 1–2 and 4–9), trust and block from cards
- IndexedDB storage
- Feed with card details
- Unit tests

**Phase 2: lifecycle and discovery**
- Edit, delete, tombstones (§7.2, §7.3 steps 3 and 6), hide
- Directory room and the Discover list
- Private subjects (passwords)
- Backup export/import
- Trust list management in the Identity tab, bulk review actions, the 50-per-author cap
- Feed filters and search

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

## 16. Open items

- ~~Confirm Trystero 0.26's relay URL option name (§9.1).~~ Confirmed: `relayConfig.urls`. Note 0.26 handlers are properties: `action.onMessage = (data, { peerId })`, `action.send(data, { target })`, `room.onPeerJoin = fn`; the old code's `send(data, peerId)` was wrong.
- ~~Choose the exact versions to vendor~~ Done: see `vendor/VERSIONS.md`.
