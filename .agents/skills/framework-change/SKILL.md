---
name: framework-change
description: Use when changing the Director framework itself — src/framework (parsers, validators, generators, auto-fixer, archiver), scripts/*.ts (stage, dress, play, autogen), Playwright patch or the Director UI package.
---

# Change the Framework

## Before you start

- Rule: `framework-code`. Read the module and its unit test (`tests/unit/<module>.test.ts`) first.
- Baseline: `npm run test:run` green and `npm run dress` state recorded before the change.
- Bug fix → reproduce it as a failing unit test first.

## Steps

1. **Locate the layer**: parsing (`core/`), validation (`validation/`), generation/auto-fix/archiving (`generation/`), output (`reporting/`), CLI wiring (`scripts/*.ts`), UI (`packages/director/`), runner patch (`scripts/patch-playwright.js`).
2. **Change** keeping logic pure and paths from `CONFIG`; keep error messages actionable.
3. **Unit tests**: add/adjust cases in `tests/unit/` with inline MD/TS fixtures or temp dirs; `npx vitest run tests/unit/<file>.test.ts`, then `npm run test:run`.
4. **Pipeline check on the example**: `npm run stage` twice — the second run must change nothing (`git status` / `git diff`), then `npm run dress` clean. If generated output changed, inspect `tests/cyborg/**`, `tests/automated/todo/**` and `tests/automated/bdd/**` diffs — intended only.
5. **Edge cases worth a test**: IDs `[]` vs `[TC01-01]` + suffixes, duplicate titles across MDs, renamed/deleted MD (archiving), Windows path separators, empty steps.
6. **Director UI / patch**: `npm run build`, then `npm run show` and exercise the changed UI (explorer, editor, Stage button). Patch changes must stay re-runnable (`npm run postinstall` twice).
7. **Coverage** for core modules: `npm run test:coverage` stays ≥ 90% for `core`, `validation`, `generation`.
8. **Docs**: update `README.md` sections that describe changed behavior (CLI output, validation rules, pipeline phases).

Done when: unit tests are green, `stage` is idempotent on the example, `dress` is clean, and lint passes for changed files.
