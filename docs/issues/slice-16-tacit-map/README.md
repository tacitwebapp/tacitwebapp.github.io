# Slice 16 — Tacit Map

Draw one subject as a radial map: subject, specialties, records, and visible insights as edges styled by relation type.

## Issues
Parent spec: [00-insights-spec](../slice-14-manual-insights/00-insights-spec.md)

- 37-tacit-map (needs 31)
- 38-manual-map-verification (HITL, needs 37)

## Depends on slices
- slice-14-manual-insights (not slice 15; the two can be built in parallel)

## Standalone test
A profile with a subject that has two specialties, records without a specialty, and insights of several types, including two authors stating the same relation on one pair:
1. `g m` opens the Tacit Map; the subject is in the centre, specialties and "General" around it, records on the outer ring.
2. Reload: the layout is identical.
3. The doubled relation shows as one edge with ×2; selecting it lists both authors and rationales.
4. Legend filter to conflicts only; Linked only hides unlinked records.
5. A superseded record is faded; selecting a node opens its record detail.
6. Switch colour scheme: the map follows.
7. On a phone width: pinch-zoom and pan; Fit brings everything back.
8. Network log shows only same-origin requests.
