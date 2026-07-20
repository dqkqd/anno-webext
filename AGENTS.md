# anno-webext

Annotation/highlight library for browser extensions (Manifest V3, Chrome + Firefox),
built on the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API).
Published as a single ESM bundle `anno-webext`.

## Structure

```text
src/                    # library source, built to dist/
  index.ts              # public entry point — re-exports createAnno() + types
  anno.ts               # core orchestration: annotate, restore, query, store
  highlight.ts          # CSS Custom Highlight API wrapper
  location.ts           # XPath-based DOM node anchoring
  codec.ts              # encodes/decodes a Range to/from storage
  normalize-url.ts      # canonicalizes URLs used as storage keys
  rtree.ts              # RBush spatial index for point/hover queries
  store.ts              # chrome.storage.local persistence
  types.ts, global.d.ts # shared types, ambient declarations

tests/                  # Playwright end-to-end specs
  fixtures.ts           # browser/extension launch fixtures
  utils.ts              # shared test helpers (select text, assert highlights)
  annotation.spec.ts    # annotate text across DOM structures + invalid/missing recovery
  jump.spec.ts          # scroll-to-annotation via URL hash fragment
  popup.spec.ts         # popup page: list annotations, update metadata (chromium only)
  registry.spec.ts      # RBush spatial query (hover/point-based)
  update-metadata-in-dom.spec.ts  # metadata update in content script DOM
  url.spec.ts           # URL normalization + per-URL annotation isolation
  extension/            # sample MV3 extension that imports the built
                        # library; this is what Playwright actually loads

dist/                   # library build output — generated, don't edit
tests/dist/             # test extension build output — generated, don't edit

vitest.config.ts        # vitest unit test configuration (jsdom, src/**/*.test.ts)
playwright.config.ts    # Playwright E2E: chromium + firefox projects
tsconfig.json           # TS 6, ESNext, noEmit
vite.config.ts          # library build (ESM lib + unplugin-dts with bundleTypes)
vite.config.e2e.ts      # test extension build (multi-entry)
eslint.config.ts        # ESLint flat config
dprint.json             # dprint formatter config
flake.nix, .envrc       # Nix devShell (node, browsers, playwright deps)
.github/workflows/      # CI: anno.yml (unit + e2e + format + lint), typos.yml (spell check)
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
npm run build:e2e                   # build library + bundle tests/extension into tests/dist/
npm run lint                        # build + eslint
npm run lint:fix                    # eslint --fix
npm run format                      # dprint, writes formatting fixes
npm run format:check                # dprint, check only
npm run test                        # test:unit + test:e2e (unit runs first, e2e skipped if unit fails)
npm run test:unit                   # vitest unit tests (src/**/*.test.ts)
npm run test:e2e                    # build:e2e + playwright test (chromium + firefox)
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e:debug              # debug build + playwright --ui --headed
npm run build:debug                 # non-minified build with inline sourcemaps
npm run build:e2e:debug             # non-minified e2e build with inline sourcemaps
npm run web-ext:firefox             # run test extension in Firefox via web-ext
npm run web-ext:chrome              # run test extension in Chrome via web-ext
```

## Testing notes

Unit tests (`npm run test:unit`) use vitest with jsdom and cover functional
modules in `src/`. E2E tests (`npm run test:e2e`) use Playwright.

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
