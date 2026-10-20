# 37 — Tacit Map tab with vendored Cytoscape

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-insights-spec](../slice-14-manual-insights/00-insights-spec.md). Reference: SPEC §4.1, §4.2, §10.6, §10.7, §10.8, §10.10.

## What to build

Vendor Cytoscape.js 3.x as an ESM build at an exact version (published at least two weeks before vendoring) and record version, source and SHA-256 in `vendor/VERSIONS.md`.

A new pure map module takes a subject's records, the grouped visible insights and the filters, and returns deterministic positions and a Cytoscape element list: the subject in the centre, specialties on an inner ring ("General" for records without one), records on the outer ring grouped by specialty and ordered so linked records sit together, one edge per pair and relation type with a count label when more than one author states it, and classes for relation type, direction and superseded.

A new **Tacit Map** tab after Insights, with an icon, the `g m` shortcut and an empty state. It has a subject selector, a legend that filters relation types, a **Linked only** toggle (on by default above 40 records), and Zoom in, Zoom out, Fit (`+`, `-`, `0` when the map is focused). Cytoscape draws with the `preset` layout. Each relation type has a colour and a line pattern; directed types have arrowheads; superseded records are faded. Style comes from the colour tokens and is rebuilt on scheme change. Selecting a record opens the record detail; selecting an edge opens a sheet with its insights (author, rationale, actions). The map is destroyed when the tab is left.

## Acceptance criteria

- [ ] Same library gives the same picture after a reload.
- [ ] Specialty grouping, "General", linked records adjacent.
- [ ] Edge per pair and relation type with counts; colours and patterns distinguishable in both schemes; arrows on directed types.
- [ ] Legend filter and Linked only work.
- [ ] Node opens record detail; edge opens its insights.
- [ ] Pan, zoom and pinch work on a phone; toolbar and legend are keyboard-operable.
- [ ] Network log on load shows only same-origin requests.
- [ ] Unit tests for the map module: determinism, rings, adjacency, grouped edges and classes, Linked only, legend filter.
- [ ] `npm test` passes.

## Blocked by

- 31-insights-tab-and-insight-list
