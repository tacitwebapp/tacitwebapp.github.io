# Tacit

Tacit is a browser app for capturing practical, experience-based know-how, keeping it in a personal library, and exchanging it with other people peer-to-peer, organised by subject.

## Knowledge

**Tacit knowledge**:
Experience-based know-how such as heuristics, workarounds and rules of thumb, as opposed to facts you could look up.
_Avoid_: Tip, fact, data

**Record**:
One unit of tacit knowledge: an information chunk under a subject, optionally with an actionable workflow.
_Avoid_: Entry, item, knowledge object, tacit data

**Information chunk**:
The required body of a record: a synthesis of the tacit knowledge and how its parts relate.
_Avoid_: Chunk, summary, content

**Actionable workflow**:
The optional part of a record that states the knowledge as a directive or step-by-step rule.
_Avoid_: Action item, action, steps

**Subject**:
A broad category a record belongs to. Each record has exactly one subject, and each subject is also a room.
_Avoid_: Category, tag, topic, channel

**Subject label**:
A subject's name as the user typed it, with its original casing.
_Avoid_: Subject name, title

**Specialty**:
An optional narrower focus inside a subject, such as "Kitchen Garden" under "Gardening". It is added to the extraction prompt and kept on the record, but never affects the room.
_Avoid_: Sub-subject, subcategory

**Subject slug**:
A subject's normalised identity. Two labels with the same slug are the same subject.
_Avoid_: Subject key, room name

## Capture

**Extraction prompt**:
The instruction text a user copies into an outside LLM to turn raw material into records.
_Avoid_: Prompt template, system prompt

**Input type**:
The kind of raw material the user plans to give the outside LLM (chat export, transcript, web page, text, CSV, image).
_Avoid_: Source type, file type

**Import**:
Bringing LLM output into Tacit, by file upload or by pasting text.
_Avoid_: Upload (as the general term)

**Draft**:
An imported record that has not been signed yet and waits in review.
_Avoid_: Pending record, unsigned entry

## Library and review

**Library**:
All records the user has kept, local and shared, from any author.
_Avoid_: Feed (except as the name of the tab that shows the library), database, tacitData

**Review queue**:
Drafts and incoming records waiting for the user to decide what to do with them.
_Avoid_: Pending data, inbox

**Visibility**:
Whether a record in the library is local or shared.
_Avoid_: Scope, privacy level

**Local record**:
A record that never leaves the user's device.
_Avoid_: Private record, stored record

**Shared record**:
A record the user sends to its subject room, including to peers who join later.
_Avoid_: Broadcast record, public record

**Relay (verb)**:
To pass on a shared record whose author is someone else.
_Avoid_: Forward, re-share, gossip

**Hide**:
To remove someone else's record from your own library so that it doesn't come back. It has no effect on other peers.
_Avoid_: Delete (for records you didn't author), discard

**Delete**:
An author withdrawing their own record from every peer.
_Avoid_: Remove, retract

**Tombstone**:
The remembered fact that an author deleted a record, so the record is not brought back by a later sync.
_Avoid_: Deletion marker

## Insights

**Insight**:
A signed claim by one author that two records in the same subject are related, with a relation type and a rationale. It is local or shared like a record, and only its author can edit or delete it.
_Avoid_: Link (except for the act of creating one), relationship, edge (outside the map), connection

**Relation type**:
The kind of relation an insight states. One of seven: conflicts, supersedes, reinforces, refines, duplicates, alternative to, prerequisite of. Some are directed (A supersedes B), some are symmetric (A conflicts with B).
_Avoid_: Link type, category, label

**Rationale**:
The insight's stated reason for the relation, in at most 500 characters.
_Avoid_: Explanation, evidence, note

**Short ID**:
A record's short handle, `t:` plus the first 8 hex characters of the uuid in its `d` tag. Stable across edits. Used in the insight prompt, the insight JSON and the interface, never stored in an insight.
_Avoid_: Alias, record number, reference

**Insight prompt**:
The instruction text a user copies into an outside LLM to find relations between selected records. A large selection is split into several insight prompts so that every pair of records appears in at least one.
_Avoid_: Relation prompt, link prompt

**Prompt limit**:
The largest number of records one insight prompt may contain.
_Avoid_: Batch size, cap

**Insight draft**:
An imported or LLM-proposed insight that has not been signed yet and waits in the Insights tab.
_Avoid_: Pending link, suggestion

**Disagreement**:
An imported row that names a pair the user has already linked or drafted, but with a different relation or direction. It is listed after the import with an Accept button and creates nothing on its own.
_Avoid_: Conflict (that is a relation type), clash

**Visible insight**:
An insight in the library whose two records are both in the library. Only visible insights are shown.
_Avoid_: Active insight, valid insight

**Superseded record**:
A record that a visible insight says is superseded by another record. Shown faded in the Feed and on the map.
_Avoid_: Outdated record, obsolete record

**Tacit Map**:
A radial picture of one subject: the subject in the centre, its specialties around it, its records on the outer ring, and visible insights as edges between records.
_Avoid_: Graph, mind map (outside casual use), network view

## Identity and trust

**Identity**:
The keypair a user signs records with. Its public key is how other users recognise the user.
_Avoid_: Account, user, profile

**Author name**:
The optional name an identity sends with each record it signs, so others see it next to the key. It is public, and a record keeps the name it was signed with.
_Avoid_: Username, display name, profile name

**Author**:
The identity that signed a record.
_Avoid_: Owner, creator, sender

**Previous key**:
An identity the user used to have on this device. Its records stay, but can no longer be edited or deleted.
_Avoid_: Old account, legacy identity

**Signer**:
What produces signatures for the user's identity: a browser extension, or a key stored in the app.
_Avoid_: Wallet, key manager

**Signed record**:
A record wrapped in a signature that proves who wrote it and that nobody changed it afterwards.
_Avoid_: Envelope, event (outside technical contexts)

**Trusted author**:
An author whose incoming records skip review and go straight into the library.
_Avoid_: Friend, followed user, whitelist

**Blocked author**:
An author whose records are removed and refused.
_Avoid_: Banned user, blacklist

**Unknown author**:
An author who is neither trusted nor blocked. Their records go to review.
_Avoid_: Stranger, untrusted author

**Notification**:
An item in the header bell's popover that needs the user's attention: records waiting for review, or the reminder to set an author name. The badge counts them.
_Avoid_: Alert, message

## Network

**Peer**:
Another running copy of Tacit connected to the same room at the same moment.
_Avoid_: Node, client, user

**Subject room**:
The live meeting place where peers who subscribe to the same subject exchange shared records.
_Avoid_: Channel, room ID, group

**Subscribed subject**:
A subject whose room the user joins automatically.
_Avoid_: Channel subscription, followed subject

**Private subject**:
A subject whose room needs a password to join. It is never listed in the directory.
_Avoid_: Locked room, private channel

**Directory**:
An app-wide room where peers list the public subjects they subscribe to, so that others can find them. It carries no records.
_Avoid_: Lobby, index, global room

**Subject announcement**:
A peer's list of the public subjects it subscribes to, sent in the directory.
_Avoid_: Advert, beacon

**Backup**:
A file of the user's library, tombstones, trust lists and subjects that can be imported again on any device.
_Avoid_: Export (as a noun), dump
