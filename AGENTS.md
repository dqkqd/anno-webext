# anno-webext

Annotation/highlight library for browser extensions (Manifest V3, Chrome + Firefox),
built on the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API).
Published as a single ESM bundle `anno-webext`.

## Structure

```text
src/                    # library source, built to dist/
  index.ts              # public entry point (createAnno())
  location.ts           # XPath-based DOM node anchoring
  codec.ts              # encodes/decodes a Range to/from storage
  normalize-url.ts      # canonicalizes URLs used as storage keys
  registry.ts           # RBush spatial index for point/hover queries
  store.ts              # chrome.storage.local persistence
  types.ts, global.d.ts # shared types

tests/                  # Playwright end-to-end specs (no unit tests)
  fixtures.ts           # browser/extension launch fixtures
  utils.ts              # shared test helpers (select text, assert highlights)
  *.spec.ts             # specs, one file per feature area
  extension/            # sample MV3 extension that imports the built
                        # library; this is what Playwright actually loads

dist/, tests/dist/      # build output — generated, don't edit

flake.nix, .envrc       # Nix devShell (node, browsers, playwright deps)
.github/workflows/      # CI: test matrix, format check, lint, typo check
```

## Setup

With Nix: `direnv allow` (or `nix develop`) - provides Node, Chrome, Firefox,
and Playwright's browser dependencies.

Without Nix: Node >= 26, npm >= 11, then:

```bash
npm ci
npx playwright install --with-deps chromium firefox
```

## Commands

```bash
npm run build                       # build the library to dist/
npm run build:test                  # build + bundle tests/extension into tests/dist/
npm run lint                        # build + eslint
npm run lint:fix                    # eslint --fix
npm run format                      # biome, writes formatting fixes
npm run format:check                # biome, check only
npm run test                        # build:test + playwright test (chromium + firefox)
npm run test -- --project=chromium
npm run test -- --project=firefox
npm run test:debug                  # debug build + playwright --ui --headed
```

## Testing notes

Playwright runs two projects, `chromium` and `firefox`, launched differently
(`tests/fixtures.ts`):

- `chromium` — `launchPersistentContext` with `--load-extension`.
- `firefox` — via `playwright-webextext` (vanilla Playwright can't load
  unpacked extensions in Firefox). The `extensionId` / `popupUrl` fixtures are
  unavailable on this project, and `popup.spec.ts` is excluded for it in
  `playwright.config.ts`.

## Issue and PR Guidelines

- Never create an issue.
- Never create a PR.
