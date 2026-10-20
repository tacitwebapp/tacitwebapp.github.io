# 08 — Browser-extension signer (NIP-07)

Type: AFK
**Status:** DONE

## What to build

When a NIP-07 extension (`window.nostr`) is present, use it as the signer by default, so the private key never enters the page. All signing goes through one async signer interface, with an extension backend and a local-key backend. The Identity tab shows which signer is active. When both are available, the user can switch, with the same warning as an identity import. The key in use before the switch is added to previous keys. Key export and import are disabled while the extension is active.

Reference: SPEC §5.1, §5.3.

## Acceptance criteria

- [x] With an extension installed, records are signed by the extension's key, and the signer shows "extension".
- [x] Without an extension, the local key is used, with no errors.
- [x] Switching signer warns, then records the old key as a previous key.
- [x] Records signed by the old key are read-only and labelled "by previous key".

## Blocked by

- 05-store-signed-local-record
