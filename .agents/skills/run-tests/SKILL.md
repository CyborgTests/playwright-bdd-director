---
name: run-tests
description: Use when running, filtering, debugging or reporting Playwright tests here — the play CLI, tag-based --grep patterns, single tests, debug modes, traces and the Monocart report. Also for framework unit tests.
---

# Run & Debug Tests

## Before you start

- Tests are generated from the specs whenever `playwright.config.ts` loads (`.director/tests/`); an invalid spec or ambiguous step stops the run with the reason - fix it, nothing else to regenerate.
- Projects select by tag: `api` runs `@auto` API tests once; `chrome`, `firefox` run every `@auto` UI/E2E test; `tablet`, `mobile` only `@all-devices` ones; `cyborg` runs `@cyborg`. Tags of a test: `@auto|@cyborg`, its layer `@api|@ui|@e2e`, suite `@<spec base name>`, its spec tags.

## Steps

1. **Pick the command**:
   - `npm run play <types...> [suites...] [@tags...] [devices...]`. Examples: `play auto`, `play api auth-api`, `play ui auth`, `play cyborg navigation`, `play auth`, `play ui @smoke`.
   - A device name selects its project: `play e2e mobile`. Layers alone (`api`, `ui`, `e2e`) run automated tests; add `cyborg` for cyborg ones.
   - Raw: `npx playwright test --grep "(?=.*(@ui)(\s|$))(?=.*(@auth)(\s|$))"` - every group required, a tag ends at a space.
   - Single test: `npx playwright test --grep "User Login"`.
   - Visual runner with Director: `npm run show` (the list follows spec edits).
2. **Cyborg** runs are headed with one worker — the user acts on each manual step; don't run them unattended.
3. **Debug a failure**:
   - `--debug` (Inspector), `--headed`, `--trace on`, `DEBUG=pw:api`.
   - Generated test: `.director/tests/<spec>.test.ts`; the failing `autoStep` names the step, its definition is in `src/steps/`.
   - Trace: `npx playwright show-trace test-results/artifacts/<test>/trace.zip` (retained on failure).
   - Report: `npm run review` (Monocart); every run also writes `test-results/cucumber-report.{json,html}`, `cucumber-messages.ndjson` and `junit.xml`.
   - Deeper analysis → `pw-triager` skill.
4. **Flakiness check**: `--repeat-each=3 --workers=1` for order/data coupling; a pass only on retry is a failure.
5. **Framework unit tests**: `npm run test:run` (once), `npx vitest run src/framework/<layer>/<module>.test.ts`, `npm run test:coverage`.

Done when: the requested scope ran and the result is reported with counts and failing test names (or trace/report location).
