# 34 — Incoming insights in Import & Review

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](00-insights-spec.md). Reference: SPEC §7.3, §7.5, §7.6, §10 (Import & Review).

## What to build

Incoming insights from unknown authors already reach the review queue through the unchanged pipeline. Give them their own card in the author's group: relation, direction, rationale and both records (short ID and preview, looked up in the library or the review queue). A record the user does not hold shows as "t:xxxx — not in your library". Accept, Discard, Accept all, Discard all, Trust author and Block author cover insights the same way as records.

## Acceptance criteria

- [ ] An unknown author's shared insight shows as an insight card under that author, not as a record card.
- [ ] Accept moves it into the library as shared and relays it; it shows once both records are held.
- [ ] Trust author moves their pending insights into the library; Block author removes them and refuses new ones.
- [ ] Insights count toward the author's 50-item cap.
- [ ] A record missing from the library shows the "not in your library" line.
- [ ] `npm test` passes.

## Blocked by

- 30-insight-model-and-manual-linking
