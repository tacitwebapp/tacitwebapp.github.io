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

## Identity and trust

**Identity**:
The keypair a user signs records with. Its public key is how other users recognise the user.
_Avoid_: Account, user, profile

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
