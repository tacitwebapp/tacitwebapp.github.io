# 21 — Author avatars

Type: AFK
**Status:** TODO
**Label:** ready-for-agent

## Parent

[00-ui-redesign-spec](00-ui-redesign-spec.md). Reference: SPEC §10.4.

## What to build

Each author gets a round avatar with an initial on a background colour derived from the public key. A pure function in the interface-helper module takes a public key and the author label and returns a hue (0 to 359) and an initial; saturation and lightness come from tokens so the initial meets 4.5:1 contrast in both schemes. The initial is the first letter of the author label already shown (nickname, "You", "by previous key"), or the first two characters after `npub1` of the short npub. Avatars appear on Feed rows and the record detail, on review cards and author groups, in the trust list, and in the Identity tab header. The author label stays as text beside the avatar and the avatar is hidden from assistive technology. No images are fetched.

## Acceptance criteria

- [ ] The same key gives the same avatar on every screen and after a reload.
- [ ] Unit tests: deterministic; hue always in 0..359; a sample set of different keys gives different hues; nickname sets the initial; missing or malformed key gives a neutral result.
- [ ] Avatars show in all five places above.
- [ ] The initial meets 4.5:1 contrast in light and dark.
- [ ] The avatar is `aria-hidden` and the author label is present as text next to it.
- [ ] `npm test` passes.

## Blocked by

- 20-feed-rows-and-record-detail
