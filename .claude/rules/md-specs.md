---
description: Markdown test-suite format (test-suites/*.md), IDs and implementation suffixes, file naming and MD ↔ TS sync contract.
paths:
  - 'test-suites/**/*.md'
  - 'tests/automated/**/*.ts'
  - 'tests/cyborg/**/*.ts'
  - 'src/test-constants/tags.ts'
---

# Markdown Specs & Sync Contract

## Format

- `## ` suite, `### ` test case, `#### ` step. Bullet lines (`- …`) under any heading are free-form details/test data, `---` is an optional separator — both ignored by the validator.
- One MD file = one suite. Base name is unique across `test-suites/**` and becomes the suite tag (`auth.md` → `TAG.SUITE.AUTH` = `@auth`).
- `Tags: @smoke @JIRA-1` right under a `##`/`###` heading tags the suite / case (Playwright tags, strings next to `TAG.*` in tests).
- A markdown table under a `###` heading (after `Tags:`) makes the case parametrized: `<column>` placeholders in title/steps; TS loops over inline string data (`for (const example of [{ column: '…' }])`) with `${example.column}` in titles; the title needs a unique-valued placeholder.
- Gherkin `.feature` is an alternative spec format with the same contract: Feature → suite, Scenario → case, step → step with its keyword kept (`Given user …`); `@tag` → tags (Rule tags go to its scenarios); tables, doc strings are details. Steps are written in tests, as for MD (README "Gherkin").
- `.feature` files in `test-suites/bdd/` (`CONFIG.bdd.dirs`) use step definitions instead: `src/steps/**/*.steps.ts` (`Given/When/Then` from `./bdd`, fixtures destructured in the first parameter); `stage` fully generates `tests/bdd/**/*.bdd.test.ts` - never edit it, change the spec or the steps.
- Hooks (`Before({ tags }, …)`) and special tags (`@skip`, `@slow`, `@retries:N`, …) are in README "Step definitions style".
- English only; titles are human-readable actions/outcomes, no articles where avoidable, quotes for literal UI text (`Click "Signup" Button`).
- IDs and titles are globally unique across all MD files.

## IDs and implementation suffixes

- Optional bracket IDs on suite/case: `## [TS01] …`, `### [TC01-01] …`; `[]` = empty ID for suffix-only matching.
- MD is the source of truth: MD has an ID → every TS implementation carries it; MD has none → TS has none.
- Non-empty ID + suffix uses a dash: `[TC01-01-API]`, `[TC01-01-CYBORG]`. Empty ID + suffix has no dash: `[AUTO]`, `[CYBORG]`, `[UI]`.
- Other formats (`TC-001:`) are not IDs; the whole title is compared.

## File naming & placement

- Tests: `<md-base>.<type>.test.ts`, type ∈ `cyborg | auto | api | ui | e2e`; the base name before the first dot pairs the file with its MD.
- `tests/cyborg/` — cyborg; `tests/automated/{api,ui,e2e}/` — implemented automation; `tests/automated/todo/` — generated AUTO skeletons (ignored by the runner); `tests/archived/` — orphans.
- MD subfolders (`test-suites/e2e/x.md`) are mirrored by generated files (`tests/cyborg/e2e/x.cyborg.test.ts`). Suites in `CONFIG.noCyborg` (folder or MD path inside `test-suites/`, no `.md`) get no cyborg file from `stage`.
- Tags per describe: execution `TAG.TEST.*` (`AUTO` / `CYBORG`), optional layer `TAG.TYPE.*`, suite `TAG.SUITE.*`.

## Sync contract

- Suite title, test case count/titles, step count/titles and spec tags (any order) in each TS file match the MD (with ID/suffix rules above).
- `npm run dress` checks it read-only; `npm run stage` fixes what it can (MD formatting, cyborg structure and spec tags, empty skeletons, `TAG.SUITE`) and archives orphans.
- `stage` aligns cases/steps by title or ID, never by position: inserts missing ones as skeletons in place, only reports removed or reordered ones. Steps of cyborg files written with `test.step()` are not synced.
- `stage` never rewrites implemented automated tests — fix their titles/steps by hand, keeping step bodies. Only exception: examples data arrays, synced everywhere (spec data, not code).
- TS side: all outermost describes form the suite (title/tags from the first); nested describes only group; loop-declared tests count once; `test.use`, `describe.configure`, runtime `test.skip(cond)`/`test.slow()` are not cases.
- Named `test.beforeAll('<case title>')` / `test.afterAll('<case title>')` are MD test cases (setup/teardown with MD steps); unnamed hooks are not.
- A `Background` case (Gherkin `Background:` or MD `### Background`) is implemented by `test.beforeEach('Background', …)`; other `beforeEach`/`afterEach` hooks are not cases.
- Changing what a test checks starts in MD; code follows. Never edit MD just to make code pass `dress`.
