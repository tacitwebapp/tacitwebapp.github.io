# Slice 01 — Basic posting

Capture knowledge and keep it as signed records on this device. No network.

## Issues
- 01-vendor-deps-and-module-bootstrap
- 02-local-identity
- 03-subject-model-and-tabs
- 04-import-to-drafts
- 05-store-signed-local-record

## Depends on slices
None.

## Standalone test
1. Load the page on a fresh profile with the network panel open: no third-party requests; a key is generated and survives reload.
2. Create subject "Pest Control"; Extract tab builds a prompt and Copy works.
3. Import a JSON file and the same content pasted: identical drafts, warnings shown, re-import creates no new drafts.
4. Store a draft: it appears in the Feed as local, by "you", verified.
5. Reload: drafts and library persist.
6. `npm test` passes.

No second peer needed.
