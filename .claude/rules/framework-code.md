---
description: Standards for framework code (src/framework, scripts), its Vitest unit tests, the Director UI package and forked Playwright packages.
paths:
  - 'src/framework/**'
  - 'src/config/**'
  - 'scripts/*.ts'
  - 'scripts/patch-playwright.js'
  - 'scripts/hooks/*.test.ts'
  - 'packages/**'
  - 'playwright.config.ts'
  - 'vitest.config.ts'
---

# Framework Code

## Design

- Layers: `core/` parses specs (Markdown, Gherkin, one spec document), `bdd/` registers step definitions and generates tests (`build.ts` writes them), `validation/` checks and formats Markdown, `reporting/` prints and writes reports.
- Keep parsing and generation pure; file I/O and process exit stay at the edges (`scripts/*.ts`, `bdd/build.ts`, `bdd/prepare.ts`).
- Paths and toggles come from `CONFIG` (`src/framework/config.ts`, env-overridable). Never hardcode `test-suites`, `.director/tests` or `src/steps` elsewhere.
- MD heading syntax comes from `MD_HEADINGS` (`constants/markdown.ts`); kind and layer tags from `constants/tags.ts`.
- Errors carry an actionable fix hint (`errors/error-builders.ts`); console output goes through `reporting/console-formatter.ts` and `utils/icons.ts`.
- Generation is deterministic and idempotent: the same specs and step definitions give byte-identical test files; `stage` run twice changes nothing. Generated tests are never committed and never hand-edited.
- Generated code must pass Prettier + ESLint as emitted (the pipeline formats, but don't rely on it to fix broken syntax).
- Specs are data: their text reaches generated code only through `quoteString` / `commentText` (`generator.ts`) - a line terminator such as U+2028 must not end a string or comment early.
- Path handling is cross-platform: `path.join`/`path.resolve`; paths in reports, messages and generated code go through `toPosix` / `toProjectPath` (`utils/helpers.ts`).

## Unit tests (Vitest, `<module>.test.ts` next to the module)

- Every behavior change in `src/framework/**` gets a unit test; bug fixes start with a failing test.
- Test pure functions with inline specs and step definitions (`clearStepDefinitions()` between tests); use temp dirs for file-writing code, never the real `test-suites/` or `src/steps/`.
- `npm run test:run` must stay green; `npm run test:coverage` keeps critical modules (`core`, `bdd`, `validation`) at 90%+.

## Director UI (`packages/director/**`)

- React 19 + Vite, own `package.json`/tsconfig; talks to the patched runner over WebSocket (`wsClient.ts`).
- The WebSocket server reads, writes and deletes specs, so it starts in UI mode only, listens on `127.0.0.1` and accepts only the random token injected into `uiMode.html`; keep all three when changing it.
- After changes run `npm run build` (builds director + trace-viewer, then re-patches Playwright) and check the UI with `npm run show`.

## Playwright integration

- Playwright is pinned to `1.60.0` in root and `packages/director` peer deps; upgrading means re-checking `scripts/patch-playwright.js` markers and the forks.
- `scripts/patch-playwright.js` is the only way to change `node_modules/playwright`; it must stay re-runnable (removes the previous `// DIRECTOR PATCH` block first).
- Forked packages (`packages/{playwright,playwright-core,trace-viewer,web,…}`) are lint-ignored upstream code: change only what Director integration needs and keep diffs small and greppable.
