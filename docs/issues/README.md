# Issues by slice

Each slice is a vertical, independently testable increment. Every slice folder has a README with its issues, the slices it depends on, and a standalone test. Issue filenames are unchanged, so "Blocked by" references still resolve.

| Slice | Issues | Needs |
|---|---|---|
| [01 basic posting](slice-01-basic-posting/) | 01, 02, 03, 04, 05 | - |
| [02 secure sharing](slice-02-secure-sharing/) | 06 | 01 |
| [03 block and hide](slice-03-block-and-hide/) | 07, 11 | 02 |
| [04 edit and delete](slice-04-edit-and-delete/) | 09, 10 | 02 |
| [05 private subjects](slice-05-private-subjects/) | 12 | 02 |
| [06 discover subjects](slice-06-discover-subjects/) | 13 | 02 |
| [07 trust management](slice-07-trust-management/) | 14 | 03 |
| [08 feed filters](slice-08-feed-filters/) | 15 | 03 |
| [09 backup restore](slice-09-backup-restore/) | 16 | 04, 07 |
| [10 extension signer](slice-10-extension-signer/) | 08 | 01 |
| [11 e2e verification](slice-11-e2e-verification/) | 17 | 01-10 |
| [12 interface redesign](slice-12-ui-redesign/) | 18-28 (parent spec 00) | 01-10 |
| [13 specialty](slice-13-specialty/) | 29 | 01 |
| [14 manual insights](slice-14-manual-insights/) | 30, 31, 34, 35, 36, 39 (parent spec 00) | 04, 07, 08, 12, 13 |
| [15 insight prompt](slice-15-insight-prompt/) | 32, 33, 40 | 14 |
| [16 tacit map](slice-16-tacit-map/) | 37, 38 | 14 |
| [17 progressive web app](slice-17-pwa/) | 41-50 | 09, 12 |
| [18 works and comments](slice-18-works-and-comments/) | 51-58 (parent spec 00) | 04, 07, 08, 12, 14 |

Unscheduled work: [backlog](backlog/).
