# Slice 03 — Block others and hide

Control what other people's records do in your library.

## Issues
- 07-unknown-author-review-and-trust
- 11-hide-others-record

## Depends on slices
- slice-02-secure-sharing

## Standalone test
Profiles A and B with different identities, both in subject S:
1. A shares: record lands in B's review queue, not the Feed.
2. B accepts: record is in B's Feed as shared and is relayed to a late-joining C.
3. B trusts A: A's next record goes straight to B's Feed.
4. B blocks A: A's records vanish from B and new ones are dropped.
5. B hides one of A's records: it does not return on re-join and is not sent to late joiners. Own records offer Delete, not Hide.
