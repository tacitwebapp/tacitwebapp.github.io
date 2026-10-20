# 02 — Local identity: generate, show, export, import

Type: AFK
**Status:** DONE

## What to build

Give every user a signing identity with no setup. On first load, if no key is stored, generate one and keep it across reloads. A new Identity tab shows the public key (npub and short hex) and where the signer comes from ("local key"). "Export private key" reveals the key as hex and nsec, with a copy button, behind a clear warning. "Import identity" accepts hex or nsec, rejects anything else, and requires the user to confirm that they exported their current key. After an import, the old public key is kept in the user's previous keys.

Reference: SPEC §5.1–§5.4, §8.2.

## Acceptance criteria

- [x] A fresh profile gets a key on first load, and the same public key after reload.
- [x] Export shows matching hex and nsec only after the user acknowledges the warning.
- [x] Importing a valid hex or nsec key replaces the identity; invalid input is rejected with a message.
- [x] Import stays blocked until the user ticks "I have exported my current key".
- [x] After an import, the old public key appears under previous keys.
- [x] Unit tests: key import parsing (hex, nsec, invalid).

## Blocked by

- 01-vendor-deps-and-module-bootstrap
