---
name: md-to-automated
description: Use when automating a Markdown suite (test-suites/*.md) or re-syncing an implemented automated test after its MD changed — autogen skeleton, move to api/ui/e2e, implement step by step, keep step text verbatim.
---

# Markdown Suite → Automated Test

## Before you start

- MD is final for this pass and valid (`npm run dress`). Code adapts to MD, never the other way round.
- Rules: `md-specs`, `playwright-tests` (+ `api-testing` for API).
- Pick the layer(s): API for contract/data rules, UI/E2E for user journeys. One MD case may have several implementations (ID suffixes).

## Steps

1. **Skeleton**: `npm run autogen -- --dry-run`, then `npm run autogen` (only MDs with no automated test yet) → `tests/automated/todo/<base>.auto.test.ts` (`test.describe.fixme`, every step `// TODO`).
2. **Move**: to `tests/automated/<api|ui|e2e>/<base>.<api|ui|e2e>.test.ts`; set describe title suffix and tags per `add-test` step 3; remove `.fixme`.
3. **Implement one test case at a time**:
   - UI/E2E: reproduce the case live (`ui-explorer`) before writing code.
   - Fill each `test.step` through fixtures (Page Objects, clients); add missing ones via `add-page-object` / `update-api-client`.
   - Step not applicable at this layer → keep the step, comment inside (`// WONTDO: <reason>` if permanent).
   - Run just that case: `npx playwright test <file> -g "<case title>"`; fix before moving on.
4. **MD changed later** (implemented tests are not rewritten by `stage`): diff the MD against the test — titles, case count/order, step count/text — and update the code verbatim; keep step bodies, rewrite only what the new step means.
5. **Verify**: `npm run dress` (file absent from findings), `npm run play <type> <base>` green on the first attempt, `npx eslint <file>`.
6. Review with `senior-aqa-reviewer`.

Done when: every MD case/step maps 1:1 to the test, `dress` is clean and the suite is green.
