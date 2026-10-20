---
description: Standards for framework code (src/framework, scripts), its Vitest unit tests, the Director UI package and forked Playwright packages.
paths:
  - 'src/framework/**'
  - 'src/config/**'
  - 'scripts/*.ts'
  - 'scripts/patch-playwright.js'
  - 'tests/unit/**'
  - 'packages/**'
  - 'playwright.config.ts'
  - 'vitest.config.ts'
---

# Framework Code

## Design

- Layers: `core/` parses (MD, TS via ts-morph, matching), `validation/` decides, `generation/` writes files, `reporting/` prints. Keep parsing and decision logic pure; file I/O and process exit stay at the edges (`scripts/*.ts`, writers in `generation/`).
- Paths and toggles come from `CONFIG` (`src/framework/config.ts`, env-overridable). Never hardcode `test-suites`, `tests/...` or the tags file path elsewhere.
- MD heading syntax comes from `MD_HEADINGS` (`constants/markdown.ts`); file-type rules from `constants/test-files.ts`.
- Errors carry an actionable fix hint (`errors/error-builders.ts`); console output goes through `reporting/console-formatter.ts` and `utils/icons.ts`.
- `stage` must be idempotent: a second run on unchanged input changes nothing. Auto-fix only structure (titles, steps, tags), never implemented step bodies.
- Generated code must pass Prettier + ESLint as emitted (the pipeline formats, but don't rely on it to fix broken syntax).
- Path handling is cross-platform: `path.join`/`path.resolve`, normalize separators before comparing; keep path-traversal protection in readers.

## Unit tests (Vitest, `tests/unit/**`)

- Every behavior change in `src/framework/**` gets a unit test; bug fixes start with a failing test.
- Test pure functions with inline MD/TS fixtures; use temp dirs for file-writing code, never the real `test-suites/` or `tests/`.
- `npm run test:run` must stay green; `npm run test:coverage` keeps critical modules (`core`, `validation`, `generation`) at 90%+.

## Director UI (`packages/director/**`)

- React 19 + Vite, own `package.json`/tsconfig; talks to the patched runner over WebSocket (`wsClient.ts`).
- After changes run `npm run build` (builds director + trace-viewer, then re-patches Playwright) and check the UI with `npm run show`.

## Playwright integration

- Playwright is pinned to `1.60.0` in root and `packages/director` peer deps; upgrading means re-checking `scripts/patch-playwright.js` markers and the forks.
- `scripts/patch-playwright.js` is the only way to change `node_modules/playwright`; it must stay re-runnable (removes the previous `// DIRECTOR PATCH` block first).
- Forked packages (`packages/{playwright,playwright-core,trace-viewer,web,…}`) are lint-ignored upstream code: change only what Director integration needs and keep diffs small and greppable.
