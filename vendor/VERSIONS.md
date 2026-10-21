# Vendored dependencies

Build once in a scratch directory with `npm i alpinejs@3.14.9 nostr-tools@2.10.4 trystero@0.26.0 esbuild@0.24.2 cytoscape@3.34.3`; the outputs are committed. `tailwind.css` is built in the repo (see below). Nothing is fetched at runtime.

| File | Library | Version | Source | SHA-256 |
|---|---|---|---|---|
| alpine.esm.js | Alpine.js | 3.14.9 | https://registry.npmjs.org/alpinejs/-/alpinejs-3.14.9.tgz (`dist/module.esm.min.js`) | f00594ce50655463ddfda0de294457e8c0fad36f1896182f66f6cea7db36b93c |
| nostr-tools.js | nostr-tools (+ @noble/hashes) | 2.10.4 | https://registry.npmjs.org/nostr-tools/-/nostr-tools-2.10.4.tgz | cedb66d718fb456e395bc4bf136ec15a219a63403d504d515725dcc2874d913d |
| trystero-nostr.js | Trystero (nostr strategy) | 0.26.0 | https://registry.npmjs.org/trystero/-/trystero-0.26.0.tgz | df14e3aebddb90ffed458de7d3ebb4afbb775596829e98acf31a3bcd0d411e7a |
| cytoscape.esm.js | Cytoscape.js | 3.34.3 (published 2026-09-07) | https://registry.npmjs.org/cytoscape/-/cytoscape-3.34.3.tgz (`dist/cytoscape.esm.min.mjs`, copied unchanged and renamed) | c299a4d5de7af08dfa7813f8eec4e2a2ef4f700f490f4505b408a0ce57e8e816 |
| tailwind.css | Tailwind CSS (compiled from `src/tacit.src.css`) | 3.4.17 (dev dependency) | `npm run build:css` | built output, see below |
| DMSans-latin-wght.woff2 | DM Sans variable, Latin subset | 5.3.0 (@fontsource-variable/dm-sans) | https://registry.npmjs.org/@fontsource-variable/dm-sans/-/dm-sans-5.3.0.tgz (`files/dm-sans-latin-wght-normal.woff2`); licence in `DMSans-OFL.txt` (SIL OFL 1.1) | 9fea608a947e67020c33cad9a6fe3d60c54119dfb8cff87768a8117a15ed7543 |

## Regenerate

```
# nostr-tools.js (entry: n.js)
export { finalizeEvent, verifyEvent, getPublicKey, generateSecretKey } from 'nostr-tools/pure';
export * as nip19 from 'nostr-tools/nip19';
export { hexToBytes, bytesToHex } from '@noble/hashes/utils';
npx esbuild n.js --bundle --format=esm --minify --outfile=vendor/nostr-tools.js

# trystero-nostr.js (entry: t.js)
export { joinRoom, selfId } from 'trystero/nostr';
npx esbuild t.js --bundle --format=esm --minify --outfile=vendor/trystero-nostr.js

# cytoscape.esm.js: no bundling, a single self-contained file
cp node_modules/cytoscape/dist/cytoscape.esm.min.mjs vendor/cytoscape.esm.js

# tailwind.css: run from the repo root after `npm install`
npm run build:css   # tailwindcss -c tailwind.config.js -i src/tacit.src.css -o vendor/tailwind.css --minify
```

Re-run `npm run build:css` after adding classes to `index.html` or the `src/*.js` files, or after editing `tailwind.config.js` or `src/tacit.src.css`.
