# Slice 08 — Feed filters and search

Narrow the Feed by subject, author group, visibility and text.

## Issues
- 15-feed-filters-and-search

## Depends on slices
- slice-03-block-and-hide

## Standalone test
Library with records across 2+ subjects, own/trusted/other authors, local and shared:
1. Each filter alone narrows correctly; combinations narrow further.
2. Search matches either text field, ignoring case.
3. Empty result shows a clear message.
4. Predicate unit tests pass.
