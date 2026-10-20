# 00 — Insights and Tacit Map: relations between records, by hand or by LLM, and a map of a subject

**Status:** PARENT SPEC. Delivered by issues 30-40 across slices 14 (manual insights), 15 (insight prompt) and 16 (Tacit Map); not picked up directly.
**Label:** ready-for-agent

Reference: SPEC §1, §2, §4, §6.4, §7.6, §8, §9.3, §9.4, §10, §10.9, §10.10, §12, §13, §14 (Phase 4), §15. Vocabulary: [GLOSSARY.md](../../GLOSSARY.md), section Insights.

## Problem Statement

A subject's library grows into a pile of records that don't refer to each other. Two records can give opposite advice for the same situation, a newer way of doing something can make an older record outdated, and several authors can independently confirm the same heuristic. Nothing in Tacit shows any of this. A reader acting on a record in the Feed can't tell whether it has been replaced or disputed, and the only way to find these relations is to read every record and keep them in your head. Asking an outside LLM helps, but there's no way to give it a set of records in a form it can refer back to, and no way to bring its answer back into Tacit.

## Solution

Users can state an **insight**: a signed claim that two records in the same subject conflict, supersede one another, reinforce, refine, duplicate, are alternatives, or that one is a prerequisite of the other. Each insight has a rationale. Insights are made in a new **Insights** tab, either by hand or by selecting records (all or some, narrowed by search), copying an **insight prompt** into an outside LLM and importing the JSON it returns as **insight drafts** to review. A **Link…** action in the record detail creates one while reading. Large selections are split into several prompts so that every pair is compared. Insights are local or shared like records, go through the same trust and review rules, and only their author can change them. The Feed marks superseded and disputed records. A new **Tacit Map** tab draws a subject as a radial map: the subject in the centre, its specialties, its records, and insights as edges styled by relation type.

## User Stories

1. As a user, I want to relate two records with a relation type, so that knowledge that belongs together is connected.
2. As a user, I want to mark that one record supersedes another, so that readers know which way of doing something is current.
3. As a user, I want to mark two records as conflicting, so that readers know the advice is disputed.
4. As a user, I want to mark that a record reinforces another, so that well-supported knowledge stands out.
5. As a user, I want to mark that a record refines another, so that a narrower version is not mistaken for a replacement.
6. As a user, I want to mark two records as duplicates, so that I can tell the same knowledge said twice from separate knowledge.
7. As a user, I want to mark two records as alternatives, so that different valid approaches are not mistaken for a conflict.
8. As a user, I want to mark that one record is a prerequisite of another, so that workflows are done in the right order.
9. As a user, I want to give a rationale for each insight, so that others can judge whether it holds.
10. As a user, I want a fixed list of relation types with clear meanings, so that insights mean the same thing to everyone.
11. As a user, I want an Insights tab, so that all relation work happens in one place.
12. As a user, I want to pick a subject in the Insights tab, so that I only see records that can be related to each other.
13. As a user, I want to search and filter the records in the Insights tab like in the Feed, so that I can narrow a large subject to the records I care about.
14. As a user, I want to tick individual records or Select all of the filtered ones, so that I decide exactly what goes into the prompt.
15. As a user, I want each record to show a short ID, so that I can recognise it in the prompt, the JSON and the interface.
16. As a user, I want the short ID to stay the same when a record is edited, so that links and prompts still refer to it.
17. As a user, I want to copy an insight prompt that contains the selected records' text, so that an outside LLM can find relations between them.
18. As a user, I want the prompt to include each record's date, so that the LLM can tell which record is newer when judging supersedes.
19. As a user, I want the prompt to include specialty and workflow, so that the LLM can tell refinements and conflicting steps apart.
20. As a privacy-minded user, I want author names and keys left out of the prompt, so that nobody's identity is sent to a third-party LLM.
21. As a user, I want the prompt to define the seven relation types and their directions, so that the LLM uses them correctly.
22. As a user, I want the prompt to ask only for clear relations and allow an empty answer, so that I don't get a link between everything.
23. As a user re-running a prompt, I want pairs I already linked listed as "skip", so that the LLM only proposes new relations.
24. As a user, I want the skip list to contain only my own links, so that I never sign someone else's claim by mistake.
25. As a user, I want a limit on records per prompt, so that the LLM compares pairs carefully instead of skimming.
26. As a user, I want to set that limit in the Insights tab, so that I can suit it to the LLM I use.
27. As a user with a large selection, I want it split into several prompts that together cover every pair, so that no relation is missed.
28. As a user, I want to see "N records → P prompts" before copying, so that I can narrow the selection if it's too much work.
29. As a user, I want each prompt on its own card with a Copy button and a copied tick, so that I can work through them in order.
30. As a user, I want to paste or upload the LLM's JSON in the Insights tab, so that its proposals come back into Tacit.
31. As a user, I want rows with unknown or ambiguous IDs, the same record twice, records from different subjects, unknown relation types or no rationale rejected with reasons, so that bad output never becomes an insight.
32. As a user, I want an overlong rationale shortened with a warning, so that one wordy row doesn't fail the import.
33. As a user, I want a warning when a row says an older record supersedes a newer one, so that I catch a likely mistake.
34. As a user, I want rows for pairs I already linked with the same relation counted as duplicates, so that re-importing is harmless.
35. As a user, I want rows that disagree with a relation I already have listed separately, so that I see where the LLM disagrees without anything changing.
36. As a user, I want an Accept button on a disagreement, so that I can take the new relation in one click when it's better.
37. As a user, I want an import summary of drafts, disagreements, rejections and duplicates, so that I know what happened.
38. As a user, I want imported insights to become drafts I review, so that nothing is signed without my decision.
39. As a user reviewing an insight draft, I want to see both records, the relation, its direction and the rationale, so that I can judge it without leaving the card.
40. As a user, I want to edit a draft's relation, direction and rationale before signing, so that I can fix a near miss.
41. As a user, I want Store, Share and Discard on each draft and in bulk, so that I can work through many proposals quickly.
42. As a user, I want my drafts to survive a reload, so that I can review them later.
43. As a user, I want to create an insight by hand from a form in the Insights tab, so that I can record a relation I know myself.
44. As a user reading a record, I want a Link… action in its detail, so that I can relate it to another record where I notice the relation.
45. As a user linking by hand, I want the rationale to be optional, so that quick links are quick.
46. As a user linking a pair I already linked, I want my existing insight opened for editing, so that I don't end up with two.
47. As a user, I want my insights stored locally by default and shared only when I choose, so that I control what peers see.
48. As a user, I want sharing blocked when either record is local, so that my local records never leak through an insight.
49. As a user, I want my shared insights sent to the subject room and to peers who join later, so that the community gets them like records.
50. As a peer, I want insights from trusted authors added directly, so that people I trust shape my view without extra work.
51. As a peer, I want insights from unknown authors to go through review, so that a stranger can't mark my records as outdated.
52. As a peer reviewing an incoming insight, I want to see both records' text, or a "not in your library" note, so that I can judge it.
53. As a peer, I want Accept all and Discard all to cover an author's insights too, so that one decision handles their contribution.
54. As a peer, I want trusting or blocking an author to cover their insights, so that trust works the same everywhere.
55. As a peer, I want an insight to appear only when I hold both of its records, so that I never see links to records I don't have.
56. As a peer, I want an insight that arrived before its record to appear once the record arrives, so that the order of sync doesn't matter.
57. As a peer, I want insights about records I hid, or whose author I blocked, to stay out of sight, so that hiding and blocking still work.
58. As an author, I want to edit and delete only my own insights, so that my signed claims can't be changed by others.
59. As a user who disagrees with someone's insight, I want to hide it or state my own on the same pair, so that I can respond without overwriting them.
60. As an author, I want only one insight of mine per pair, so that my claims about a pair never contradict each other.
61. As an author deleting a record, I want my insights on it deleted too, after being told how many, so that I don't leave dead links on the network.
62. As an author editing a record, I want my insights on it kept, so that small edits don't undo my links.
63. As a user, I want to list a subject's insights grouped by pair and relation with counts, so that agreement reads as a number and disagreement as different relations.
64. As a user, I want to filter the insight list by relation type and author group, so that I can focus on conflicts or on my own claims.
65. As a user, I want a Relations section in the record detail, so that I can see everything said about a record in one place.
66. As a reader, I want superseded records faded and badged in the Feed, so that I don't follow outdated advice.
67. As a reader, I want a Conflicts badge with a count in the Feed, so that I know advice is disputed before acting on it.
68. As a reader, I want a badge to open the record's relations, so that I can see who made the claim and why.
69. As a user, I want a Tacit Map tab, so that I can see a subject's knowledge and its relations at a glance.
70. As a user, I want the map arranged as subject, then specialties, then records, so that the subject's structure is visible.
71. As a user, I want the map to look the same each time I open it, so that I can find my way around it.
72. As a user, I want linked records placed next to each other, so that edges stay short and readable.
73. As a user, I want each relation type drawn with its own colour and line pattern and arrows for directed types, so that I can tell them apart, including if I'm colour-blind.
74. As a user, I want one edge per relation type between two records, with a count, so that busy pairs stay readable.
75. As a user, I want the legend to filter relation types, so that I can see just the conflicts.
76. As a user with a large subject, I want a Linked only toggle, so that unrelated records don't crowd the map.
77. As a user, I want superseded records faded on the map, so that the current knowledge stands out.
78. As a user, I want to select a record on the map to open its detail, so that I can read it and act on it.
79. As a user, I want to select an edge to see its insights with authors and rationales, so that I understand the claim.
80. As a user, I want to pan, zoom and fit the map on desktop and phone, so that I can explore large subjects.
81. As a user, I want the map in my colour scheme, so that it matches the rest of the app in light and dark.
82. As a keyboard or screen-reader user, I want everything on the map available in the Insights list and record detail, so that I lose no information.
83. As a keyboard user, I want `g n` and `g m` to go to Insights and Tacit Map, so that the new tabs are as quick to reach as the others.
84. As a new user, I want guided empty states in the new tabs, so that I know what to do first.
85. As a user, I want insights included in my backup, so that restoring brings my relations back.
86. As a privacy-minded user, I want the map library served from the app itself, so that opening the map contacts no third party.

## Implementation Decisions

**Data model**
- An insight is a kind-30078 event, like a record, with tags `d`, `subject` and optional `author_name`. Its content is `{ schemaVersion: 1, type: 'insight', relation, from, to, rationale, source }`, where `from` and `to` are full record keys (`pubkey:d`), `rationale` is a string and `source` is `llm` or `manual`.
- `d` is `tacit-link-<uuidA>-<uuidB>`, built from the two records' `d` uuids in sorted order. This gives one insight per author per unordered pair: a second insight by the same author on the same pair is an edit. For symmetric types, `from` and `to` are stored in that same sorted order.
- Seven relation types, with direction: `conflicts` ↔, `supersedes` →, `reinforces` →, `refines` →, `duplicates` ↔, `alternative_to` ↔, `prerequisite_of` →. The list is closed.
- Short ID: `t:` + the first 8 hex characters of the record's `d` uuid. It's used only in prompts, JSON and the interface, and is resolved against the whole library. No match or more than one match is an error.
- Insights live in the `library` store next to records, told apart by `content.type`. Insight drafts live in `pending` with `kind: 'insight-draft'`. No IndexedDB version change is needed. The prompt limit is `settings.insightPromptLimit`: default 30, minimum 4, maximum 200, even only.

**Rules**
- Both records must be in the same subject. The insight takes that subject and its room.
- An insight can be shared only when both records are `shared` in the user's library. Otherwise it can only be stored locally.
- A visible insight is one whose two records are both in the library. Invisible insights are kept and relayed. One rule covers out-of-order arrival, review, hide, delete and block.
- The sync and trust pipeline is unchanged: `decideIncoming` already treats any kind-30078 event alike. Insights from unknown authors go to the Import & Review queue under that author and count toward the 50 cap. Trust, block, hide, edit, delete and tombstones work as for records. Only the author can edit or delete.
- Insight content isn't checked on receive. Invalid content is kept but never shown.
- Deleting a record deletes the deleter's insights (current key) on that record and their insight drafts on it. The confirmation states the count. Editing a record leaves insights alone.
- Previous-key insights are read-only and don't count as "already linked".

**Insight prompt and import**
- Record block: short ID, date (`YYYY-MM-DD` from `created_at`), specialty if set, information chunk, workflow if set. No author.
- The skip list holds the user's own (current key) insights and insight drafts among the prompt's records, as pairs only.
- Batching: if N ≤ k, one prompt. Otherwise sort by specialty then `created_at`, split into m = ⌈2N/k⌉ groups of at most k/2, and make one prompt per pair of groups, m(m−1)/2 in total. Every pair is covered, and pairs within a group appear more than once. The count is shown before copying.
- JSON row: `from`, `to`, `relation`, `rationale`, all required. Rejection reasons: unknown ID, ambiguous ID, same record, different subjects, unknown relation, missing rationale. A rationale over 500 characters is cut, with a warning. A `supersedes` whose `from` is older than its `to` gets a warning.
- Import never changes an existing insight. For a pair already linked or drafted by the user: same relation and direction counts as a duplicate, and anything else is a disagreement with Accept. Accept replaces a draft's values, or signs an edit of a signed insight (same `d` and visibility, sent if shared). Within one import, the first row for a pair wins.

**Interface**
- Tab order: Feed, Extract, Import & Review, Insights, Tacit Map, Subjects, Identity. Shortcuts `g n` and `g m`. Each new tab has an icon and guided empty states.
- Insights tab: subject, filters, record selection, prompt limit and counter, prompt cards, import panel and summary with the disagreement list, insight drafts, manual link form, and the insight list grouped by pair and relation with counts.
- Record detail: shows the short ID, a Relations section and a Link… action.
- Feed: a Superseded badge with faded row, and a Conflicts (n) badge that counts distinct records. Both are computed from visible insights only.
- The Feed, the record import duplicate check and the directory `sharedCount` leave insights out.

**Modules**
- New pure module `tacit-insight.js` (the main test seam). Its interface covers: short ID and resolution; relation types; building insight prompts with batches and the skip list; turning JSON rows into drafts, rejections, duplicates and disagreements; insight templates (new and edit) with deterministic `d`; the "shared needs shared" check; the visible-insight filter; grouping by pair and relation; Feed badges per record; cascade targets for a record deletion.
- New pure module `tacit-map.js`: given a subject's records, visible grouped insights and the filters (relation types, Linked only), it returns deterministic positions and a Cytoscape element list with nodes, edges, counts and style classes.
- Changes: `tacit-app.js` (state and actions for the two tabs, Relations, Link…, badges, cascade, map lifecycle), `index.html` (tabs and markup), `tacit-ui.js` (`g n` and `g m` in the shortcut resolver), `tacit-feed.js` and `tacit-sync.js` (leave insights out of the feed and `sharedCount`), and the app's import duplicate input (leave insights out).
- Vendor Cytoscape.js 3.x as an ESM build at an exact, pinned version, and record it in `vendor/VERSIONS.md` with source and SHA-256. Use only the `preset` layout. Build its style from the CSS colour tokens and rebuild it when the colour scheme changes. Toolbar: Zoom in, Zoom out, Fit, plus `+`, `-` and `0` when the map is focused.
- §10.8 is amended: the map canvas is exempt from the keyboard requirement. The Insights list and record detail are its accessible equivalent.

## Testing Decisions

- A good test drives a module's public functions with plain data and checks results a user would notice: which drafts, rejections and disagreements come out, which pairs a prompt set covers, which insights are visible, which badges a record gets, where nodes land. It doesn't check internal helpers or exact prompt wording beyond the parts that carry decisions (record blocks, no author, the skip list).
- `tacit-insight.js` is tested for: short ID derivation, and resolution with no match and an ambiguous match; batches covering every pair for several N and k values, prompt count m(m−1)/2, and no prompt over k; prompt record blocks with no author; a skip list holding only own pairs within that prompt; every rejection reason; rationale shortening; the supersedes-newer warning; duplicate versus disagreement; Accept on a draft and on a signed insight (the edit template keeps `d`); deterministic `d` and sorted symmetric pairs; the shared-needs-shared check; the visible filter for each missing-record case; grouping counts; badges (Superseded, Conflicts counting distinct records); cascade targets (own current-key insights and drafts only).
- `tacit-map.js` is tested for: the same input giving the same positions; specialty rings with "General"; linked records adjacent; grouped edges with counts and classes; Linked only; the legend filter.
- Existing seams are extended: `decideIncoming` accepts, sends to review, hides and tombstones insight events exactly like records; `filterFeed`, `buildDrafts` (via its `existing` input) and `announcementFor` leave insights out.
- Prior art: `tests/subject-import.test.js` (draft building and rejections), `tests/identity-events.test.js` (templates, signing, `decideIncoming` with in-memory state), `tests/feed.test.js` (`filterFeed`), `tests/ui.test.js` (pure UI helpers and the shortcut resolver).
- Cytoscape drawing, the Alpine wiring, IndexedDB and signer prompts are checked by hand in each slice's manual verification (issues 39, 40 and 38), with two browser profiles for sync and review.

## Out of Scope

- Running any model in the browser (embeddings, NLI, small LLMs); in the backlog as candidate-pair suggestions.
- Insights between records of different subjects.
- Drag-to-link on the map.
- Keyboard navigation inside the map canvas.
- A "Hide superseded" Feed filter.
- Badges for relation types other than supersedes and conflicts.
- Editing other authors' insights, or shared editable insights without authorship.
- More than one insight per author per pair.
- Any change to record extraction, the record schema or room routing.
- An in-house SVG map renderer (only if Cytoscape proves too limiting).

## Further Notes

- Decisions came from a grilling session on 2026-10-20. Main trade-offs chosen: signed events over a local-only store (reuses the whole pipeline; dangling links are handled by the visibility rule); a deterministic `d` (idempotent re-runs); import that never changes existing insights (overlapping batches can't flip relations, and disagreements stay visible with Accept); full pair coverage over disjoint batches (no silently missed pairs, at quadratic prompt count); Cytoscape over hand-written SVG (less code, at the cost of the §10.8 exemption).
- Keeping the layout in `tacit-map.js` and Cytoscape as a drawing layer only is what makes a later in-house renderer cheap.
- A NIP-07 extension may ask for approval once per signature. Store all, Share all and cascade deletes sign several events.
