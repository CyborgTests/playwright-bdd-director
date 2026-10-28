---
name: framework-change
description: Use when changing the Director framework itself — src/framework (parsers, step registry, generator, runtime, reports), scripts/*.ts (dress, steps, stage, adapt, rename, reword, migrate, play, matrix, ci), Playwright patch or the Director UI package.
---

# Change the Framework

## Before you start

- Rule: `framework-code`. Read the module and its unit test (`<module>.test.ts` next to it) first.
- Baseline: `npm run test:run` green and `npm run dress` output recorded before the change.
- Bug fix → reproduce it as a failing unit test first.

## Steps

1. **Locate the layer**:
   - parsing (`core/`), step registry / generator / runtime / build (`bdd/`), Markdown check and formatting (`validation/`), output (`reporting/`);
   - CLI wiring (`scripts/*.ts`), config-time generation (`bdd/prepare.ts`, `playwright.config.ts`), UI (`packages/director/`), runner patch (`scripts/patch-playwright.js`).
2. **Change** keeping logic pure and paths from `CONFIG`; keep error messages actionable.
3. **Unit tests**: add/adjust cases in the module's `*.test.ts` with inline specs and step definitions or temp dirs; `npx vitest run src/framework/<layer>/<module>.test.ts`, then `npm run test:run`.
4. **Pipeline check on the example**: `npm run dress` (no errors, expected auto / cyborg counts), `npm run stage` twice - the second run changes nothing; inspect the generated `.director/tests/**` when generation changed - intended only.
5. **Edge cases worth a test**: Markdown and Gherkin of the same flow, layer override and missing layer, a definition without code, manual Background, examples rows, Windows path separators.
6. **Run the example**: `npm run play auto` green; a cyborg change → `npm run play cyborg` with the user.
7. **Director UI / patch**: `npm run build`, then `npm run show` and exercise the changed UI (explorer, editor, Stage button, extension change in the file name, test list after a spec edit). Patch changes must stay re-runnable (`npm run postinstall` twice).
8. **Coverage** for core modules: `npm run test:coverage` stays ≥ 90% for `core`, `bdd`, `validation`.
9. **Docs** (`AGENTS.md` definition of done):
   - `README.md` and `docs/step-definitions.md` where they describe changed behavior;
   - grep the command / option / feature name (`adapt`, `matrix`, `LAST_RUN_FILE`) across `docs/`, `AGENTS.md`, `.claude/rules`, `.agents/skills` and `scripts/*.ts` headers, update every hit and report the sweep.

Done when: unit tests are green, `dress` has no errors, `stage` is idempotent, the example runs green, lint passes for changed files, and no doc describes the old behavior.
