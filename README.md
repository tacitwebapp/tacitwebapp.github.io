# Tacit

Tacit is a browser app for capturing practical, experience-based know-how (heuristics, workarounds, rules of thumb), keeping it in a personal library, and exchanging it with other people peer-to-peer, organised by subject.

It is a static site with no backend. Your records are stored in your browser, and shared records travel directly between peers who subscribe to the same subject.

## What it does

1. **Extract.** Tacit builds a prompt for the kind of material you have (a chat export, a web page, a transcript, an image). You paste it into an outside LLM together with your material.
2. **Import.** You paste or upload the LLM's JSON or CSV output. Each item becomes a draft.
3. **Review.** For each draft you choose **Store** (kept on your device only) or **Share** (sent to everyone subscribed to the subject).
4. **Exchange.** Shared records sync with peers in the subject's room. Records from authors you have not trusted wait in a review queue.
5. **Relate.** You link records in a subject (one supersedes another, two conflict, and so on), by hand or with a second LLM prompt, and view the result on the Tacit Map.

Tacit never calls an LLM itself. Extraction and insight finding are copy and paste.

## Concepts

- **Record.** One unit of know-how: an information chunk (required) and an optional actionable workflow, under one subject.
- **Subject.** A broad category such as "Gardening". Every subject is also a room, and a record is shared only to its subject's room.
- **Specialty.** An optional narrower focus inside a subject, such as "Kitchen Garden". It steers the extraction prompt and is kept on the record. It never changes which room a record goes to.
- **Signed record.** Every kept record is a Nostr event signed by your identity. A peer that relays it cannot change it without breaking the signature.
- **Local vs shared.** A local record never leaves your device. A shared record is sent to the subject room, including to peers who join later. There is no way back from shared to local; deleting is how you withdraw a shared record.
- **Insight.** A link between two records of the same subject, with a relation type and a rationale. Relation types: `conflicts`, `supersedes`, `reinforces`, `refines`, `duplicates`, `alternative_to`, `prerequisite_of`.

## Using the app

The app has seven tabs.

### Subjects

Create a subject (for example "Gardening") or subscribe to one found in the **Discover** list, which shows public subjects that peers announce. Subscribing joins the subject's room. A subject can have a password, which makes it a private group: only peers with the same password connect.

### Extract

1. Pick an input type and a subject. Optionally add a specialty.
2. Copy the generated prompt.
3. Paste it into your LLM of choice with your material, and ask it to return JSON or CSV.

Input types: WhatsApp chat export, YouTube link, website link, archive, text file, CSV file, image.

### Import & Review

1. Select a subject. Import stays disabled until you do.
2. Upload a `.json` or `.csv` file, or paste the output. Format is detected from the extension, or from the first character of pasted text.
3. The summary reports drafts created, rejected and duplicates skipped. Items without a non-empty `information_chunks` are rejected. Items with a different subject are re-assigned to the selected one, with a warning.
4. For each draft, edit it if needed, then **Store**, **Share** or **Discard**. Bulk actions are available.

Records that arrive from peers also land here. Records from unknown authors wait for you to **Accept**, **Discard**, **Trust author** or **Block author**. Trusted authors' records go straight into your library.

### Feed

Your library: local and shared records, from any author. Filter by subject, author (all, mine, trusted, others) and visibility, or search the text. Open a record to see it in full and to edit, share, delete, hide, link or trust or block its author. A record superseded by another is faded and badged, and a record with conflicts shows a conflicts count.

### Insights

Pick a subject and select records, then either:

- **Generate a prompt.** Tacit builds one or more insight prompts that cover every pair of the selected records. Paste each into an LLM and import the JSON it returns as insight drafts. Pairs you have already linked are left out of the prompt, and rows for pairs you have linked differently show up as disagreements you can accept.
- **Link by hand.** Choose two records, a relation and an optional rationale, then Store or Share. A shared insight needs both records to be shared.

Insights from trusted authors, and ones you accept, are visible in the Feed and on the map.

### Tacit Map

A radial map of one subject: the subject in the centre, specialties around it, records on the outer ring, and insights as coloured, patterned edges between records. Click a record or an edge to open its details. The legend filters by relation type, and **Linked only** hides records without insights. There is a full screen option, and zoom controls (`+`, `-`, `0` when the map has focus).

### Identity

Your key is created on first use and stored in your browser. If a Nostr browser extension (NIP-07) is present, Tacit uses it instead and never sees the key. From this tab you can:

- set an author name that is sent with your shared records,
- export or import your private key,
- manage trusted and blocked authors,
- set relay URLs,
- export and restore a backup.

Export your private key and keep it safe. Losing it means losing the ability to edit or delete your shared records, and anyone who has it can sign as you. Clearing browser data deletes your library; use the backup export (records, trust list and subjects, but not the private key or subject passwords).

### Keyboard shortcuts

| Keys | Action |
|---|---|
| `/` | Go to Feed and focus search |
| `g` then `f`, `e`, `r`, `n`, `m`, `s`, `i` | Go to Feed, Extract, Import & Review, Insights, Tacit Map, Subjects, Identity |
| `?` | Show the shortcut list |
| `Esc` | Close the open sheet |

## Things to know

- **Shared means readable.** Record contents are not encrypted. Anyone in the subject room can read a shared record. A subject password limits who can join, but is not encryption.
- **Peers are real people.** Records from trusted authors are accepted without review. Trust only authors you know.
- **Peer-to-peer sync needs peers online.** Records reach others when you and they are connected to the same room at the same time, or when a peer that holds the record is.

## Running locally

Tacit is plain ES modules with no bundler, but browsers block modules loaded from `file://`, so serve the folder over HTTP:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Development

```sh
npm install
npm test            # node --test tests/*.test.js
npm run build:css   # compile src/tacit.src.css into vendor/tailwind.css
```

- `index.html`: markup for all tabs.
- `src/`: application modules and the Tailwind source stylesheet. Modules marked pure in the spec have no DOM, storage or network access and are covered by the tests.
- `vendor/`: pinned dependencies (Alpine, Trystero, nostr-tools, Cytoscape, DM Sans) and the compiled `tailwind.css`, all committed. Nothing is loaded from a third-party host at runtime. See [vendor/VERSIONS.md](vendor/VERSIONS.md).
- `tests/`: unit tests.
- `docs/`: [SPEC.md](docs/SPEC.md) is the product and technical spec, [GLOSSARY.md](docs/GLOSSARY.md) defines the vocabulary, and `docs/issues/` holds the delivery slices.

After adding Tailwind classes to `index.html` or `src/*.js`, re-run `npm run build:css` and commit the updated `vendor/tailwind.css`. There is no CSS build on deploy.

Tacit is built to be hosted as static files on GitHub Pages.
