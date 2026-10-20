# 01 — Vendor dependencies, ES-module bootstrap, test harness

Type: AFK
**Status:** DONE

## What to build

Make the app load no third-party code at runtime, and make its logic testable in Node. Pin exact versions of Alpine.js, Trystero (nostr strategy, 0.26.0), nostr-tools 2.x and Tailwind CSS 3.x, and commit them as self-contained files in the repo. Record each library's version, source URL, SHA-256 hash, and the command that regenerates the Tailwind CSS. The page loads one module entry point, which imports Alpine's ESM build, registers the app component, and starts Alpine. The existing app works the same as before.

Add a dev-only test setup that runs unit tests with Node's built-in test runner, and move the existing parsers and the prompt builder to ES modules that import cleanly in Node. Find out which option Trystero 0.26 uses for custom relay URLs, and fix the current call if it is wrong.

Reference: SPEC §4.1, §4.2, §9.1, §13, §16.

## Acceptance criteria

- [x] On page load, no request goes to a third-party host (checked in the DevTools network panel).
- [x] The version file lists exact versions, source URLs and hashes for every vendored file.
- [x] Existing tabs (feed, upload, prompt, settings) work as before.
- [x] `npm test` runs and passes, with tests for the JSON parser, the CSV parser and the prompt builder.
- [x] The relay URL option name is confirmed against Trystero 0.26, and the result is written in the spec's open items.

## Blocked by

None - can start immediately
