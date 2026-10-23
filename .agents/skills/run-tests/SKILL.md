---
name: run-tests
description: Use when running, filtering, debugging or reporting Playwright tests here — the play CLI, tag-based --grep patterns, single tests, debug modes, traces and the Monocart report. Also for framework unit tests.
---

# Run & Debug Tests

## Before you start

- Selection works only through tags: `play` builds a `--grep` pattern and `playwright.config.ts` activates the `automated` / `cyborg` project from it (`src/config/tagToProject.ts`). There are no TAGS/PROJECTS env vars.
- Tags: `TAG.TEST` `@auto|@cyborg`, `TAG.TYPE` `@api|@ui|@e2e`, `TAG.SUITE` `@<md-base>` (`src/test-constants/tags.ts`).

## Steps

1. **Pick the command**:
   - `npm run play <types...> [suites...] [@tags...]` — runs `dress` first. Examples: `play auto`, `play api auth`, `play api ui auth`, `play cyborg auth`, `play auth`, `play ui @smoke` (spec tags). `npm run coldplay …` skips `dress`.
   - Raw: `npx playwright test --grep "(@api|@ui).*(@auth)"`. Tags combine as a regex in describe-tag order.
   - Single test: `npx playwright test tests/automated/ui/auth.ui.test.ts -g "User Login"`.
   - Visual runner with Director: `npm run show`.
2. **Cyborg** runs are headed with one worker — the user acts on each step; don't run them unattended.
3. **Debug a failure**:
   - `--debug` (Inspector), `--headed`, `--trace on`, `DEBUG=pw:api`.
   - Trace: `npx playwright show-trace test-results/artifacts/<test>/trace.zip` (retained on failure).
   - Report: `npm run review` (Monocart, `test-results/monocart-report/index.html`); every run also writes `test-results/cucumber-report.json` and `junit.xml` for test management tools.
   - Deeper analysis → `pw-triager` skill.
4. **Flakiness check**: `--repeat-each=3 --workers=1` for order/data coupling; a pass only on retry is a failure.
5. **Framework unit tests**: `npm run test:run` (once), `npx vitest run tests/unit/<file>.test.ts`, `npm run test:coverage`.

Done when: the requested scope ran and the result is reported with counts and failing test names (or trace/report location).
