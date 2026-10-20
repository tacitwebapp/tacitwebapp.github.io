# Slice 10 — Browser-extension signer (NIP-07)

Keep the private key out of the page by signing through a browser extension.

## Issues
- 08-nip07-signer

## Depends on slices
- slice-01-basic-posting

## Standalone test
1. With a NIP-07 extension installed: stored records are signed by the extension key; Identity tab shows "extension"; key export/import disabled.
2. Without an extension: local key used, no errors.
3. Switching signer shows the warning and records the old key under previous keys.
4. Records by the old key are read-only and labelled "by previous key".

Needs a real browser with an extension (or a stub `window.nostr`); no peers needed.
