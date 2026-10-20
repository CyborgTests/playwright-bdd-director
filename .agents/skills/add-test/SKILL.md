---
name: add-test
description: Use when adding a new automated Playwright test (API, UI or E2E) for a suite in test-suites/*.md — file placement, naming, tags, fixtures, MD-aligned steps and verification.
---

# Add an Automated Test

Adds an API/UI/E2E implementation that the Director can match against its Markdown suite.

## Before you start

- The MD suite exists in `test-suites/<base>.md` and is valid (`npm run dress` reports no MD errors). No suite yet → write the MD first (`md-driven-suites` skill).
- Rules: `md-specs` (naming, IDs, tags), `playwright-tests`, `api-testing` for API.
- UI/E2E: confirm the flow live first (`ui-explorer` skill) — don't derive locators from memory.

## Steps

1. **File**: `tests/automated/<api|ui|e2e>/<base>.<api|ui|e2e>.test.ts`. If an AUTO skeleton exists in `tests/automated/todo/`, follow `md-to-automated` instead.
2. **Fixture import**: the suite's fixture (`import { test } from '@/fixtures/<suite>.fixture'`, e.g. `auth.fixture`); create one extending `base.fixture` if the suite needs its own clients/data.
3. **Describe**: title = MD `##` title with the implementation suffix per ID rules (`[API] Authentication Tests` for `## [] …`, `[TS01-API] …` for `## [TS01] …`); tags `[TAG.TEST.AUTO, TAG.TYPE.<API|UI|E2E>, TAG.SUITE.<BASE>]`.
4. **Tests**: one `test()` per `###` case, same title (plus ID/suffix if the MD has an ID). One `await test.step('<#### text verbatim>', …)` per MD step, blank line between steps.
5. **Body**: only fixture-injected Page Objects/clients; data from `faker`/fixtures; cleanup in fixture teardown or `try/finally`. A step with nothing to do at this layer keeps its `test.step` with a `// WONTDO: <reason>` (or plain explanation) comment inside.
6. **Missing pieces**: new page → `add-page-object`; new endpoint → `update-api-client`.
7. **Verify**:
   - `npm run dress` — the new file must not appear in the findings.
   - `npm run play <api|ui|e2e> <base>` — green on the first attempt; run twice to catch order/data coupling.
   - `npx eslint <file>`.
8. Review with `senior-aqa-reviewer` before handing off.

Done when: the file is matched by `dress`, runs green via `play`, and passes lint.
