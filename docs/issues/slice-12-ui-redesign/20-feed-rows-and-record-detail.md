# 20 — Feed rows and record detail

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §10 (Feed), §10.3, §7.4.

## What to build

The Feed becomes a grouped list of rows. A row shows the subject label, a two-line preview of the information chunk, the author label, the verified badge, the date and the visibility. Opening a row shows the record detail as a sheet with the full information chunk, the actionable workflow, any warnings, and every action that applies to that record under the existing action table (Share, Edit, Delete for own records; Hide, Trust author, Block author for others). The filters become one group: a segmented control for author (All, Mine, Trusted, Others), selects for subject and visibility, and the search field. A filter that matches nothing shows the existing message with a Clear filters button.

## Acceptance criteria

- [ ] Rows show the fields above, with the preview clamped to two lines.
- [ ] Opening a row (click, tap, Enter or Space) shows the detail sheet. Close button, Esc and a tap outside all close it, and focus returns to the row that opened it.
- [ ] The detail holds all applicable actions with their current class names. Delete and Hide close the sheet.
- [ ] Record text is rendered with text bindings only, never as HTML.
- [ ] The author filter is a segmented control with the selected state exposed. Its id replaces the old `feed-author` id on the control container, and the filter result is unchanged.
- [ ] The subject and visibility selects and the search field keep their ids and behaviour.
- [ ] A filter combination with no results shows `#feed-empty` with a Clear filters button that resets all four filters.
- [ ] Every action in the detail can be reached and used by keyboard alone.
- [ ] No horizontal scrolling at 390 px or 1280 px in either scheme.
- [ ] `npm test` passes.

## Blocked by

- 18-design-foundation-and-shell
