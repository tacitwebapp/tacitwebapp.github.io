# 29 — Optional specialty within a subject

Type: AFK
**Status:** DONE
**Label:** ready-for-agent

## Parent

Reference: SPEC §6.1 (Extract tab).

## What to build

An optional **Specialty** free-text field on the Extract tab, for a narrower focus inside a subject (for example "Kitchen Garden" under the subject "Gardening"). The subject stays the only link to a room: a specialty never changes routing, the room id, the directory announcements or the subject list.

When a specialty is set, the extraction prompt names it in its header, tells the LLM to extract only knowledge within that specialty and to set it on every record, and adds a `specialty` key to the output schema. When it is blank the prompt is unchanged. An imported `specialty` key is kept in the record content, and the Feed row and the record detail show it next to the subject.

## Acceptance criteria

- [x] Extract tab has an optional Specialty field; it is not saved in subject settings.
- [x] With a specialty set, the prompt shows it in the header, the extraction rule and the output schema.
- [x] With the field blank, the prompt has no mention of specialty.
- [x] A record imported with `specialty` keeps it, and the Feed row and detail show it.
- [x] Records are still routed by subject only.
- [x] SPEC §6.1 describes the field.
- [x] `npm test` passes.
- [ ] Checked by hand in a browser: Extract input, copied prompt, Feed and detail display (not yet run).

## Blocked by

None - can start immediately.
