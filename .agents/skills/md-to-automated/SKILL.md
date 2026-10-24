---
name: md-to-automated
description: Use when automating the steps of a spec (test-suites/*.md or *.feature) — step definition skeletons, implementing them with Page Objects and clients, until its tests become @auto.
---

# Automate a Suite Step by Step

## Before you start

- The spec is final for this pass and `npm run dress` has no errors. Code adapts to the spec, never the other way round.
- Rules: `md-specs`, `playwright-tests` (+ `api-testing` for API).
- Steps of other suites may already cover yours - same text, same definition. Different wording of the same action: register the existing step function under the new text (`Step('…', existingStep)`).

## Steps

1. **List**: `npm run dress` - the steps a person walks in this suite (no definition or one without code).
2. **Skeletons**: `npm run steps <base>` → `src/steps/<base>.steps.ts`, one per missing expression. A skeleton has no code, so its step stays manual until implemented.
3. **Implement one step at a time**:
   - UI/E2E: reproduce it live (`ui-explorer`) before writing code.
   - Destructure the fixtures it needs (Page Objects, clients, data like `testUser`); add missing ones via `add-page-object` / `update-api-client` and register fixtures in `src/fixtures/`.
   - Parameters from the expression (`{string}`, `{int}`); rename the `_string` skeleton parameter when using it.
   - Run the test(s) using it: `npm run play auto <base>` once all steps of a test are done, else `npx playwright test --grep "<title>"`.
4. **API tests** stay `fixme` until every step is implemented - finish a test case before starting the next.
5. **Verify**: `npm run dress` (suite no longer listed, no unused definitions), `npm run play <api|ui|e2e> <base>` green on the first attempt, `npx eslint src/steps`.
6. Review with `senior-aqa-reviewer`.

Done when: every step of the suite has an implemented definition, its tests are `@auto` and green.
