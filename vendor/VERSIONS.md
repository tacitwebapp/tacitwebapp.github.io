# Vendored dependencies

Build once in a scratch directory with `npm i alpinejs@3.14.9 nostr-tools@2.10.4 trystero@0.26.0 tailwindcss@3.4.17 esbuild@0.24.2`; the outputs are committed. Nothing is fetched at runtime.

| File | Library | Version | Source | SHA-256 |
|---|---|---|---|---|
| alpine.esm.js | Alpine.js | 3.14.9 | https://registry.npmjs.org/alpinejs/-/alpinejs-3.14.9.tgz (`dist/module.esm.min.js`) | f00594ce50655463ddfda0de294457e8c0fad36f1896182f66f6cea7db36b93c |
| nostr-tools.js | nostr-tools (+ @noble/hashes) | 2.10.4 | https://registry.npmjs.org/nostr-tools/-/nostr-tools-2.10.4.tgz | cedb66d718fb456e395bc4bf136ec15a219a63403d504d515725dcc2874d913d |
| trystero-nostr.js | Trystero (nostr strategy) | 0.26.0 | https://registry.npmjs.org/trystero/-/trystero-0.26.0.tgz | df14e3aebddb90ffed458de7d3ebb4afbb775596829e98acf31a3bcd0d411e7a |
| tailwind.css | Tailwind CSS | 3.4.17 | https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.17.tgz | a12ab4830060bb755e55b3041b2469dcdcfd45c4319d007dd60333bcc68276b3 |

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

# tailwind.css (config content: index.html, *.js)
npx tailwindcss -c tailwind.config.js -i in.css -o vendor/tailwind.css --minify   # in.css: @tailwind base; components; utilities;
```

Re-run the Tailwind command after adding new utility classes to `index.html` or the `.js` files.
