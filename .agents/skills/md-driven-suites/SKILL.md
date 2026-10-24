---
name: md-driven-suites
description: Use when creating, editing, renaming or deleting a Markdown test suite in test-suites/*.md, or working with generated cyborg tests — the stage / dress pipeline, cyborg tests and archiving.
---

# Markdown-Driven Suites

`test-suites/<base>.md` → `npm run stage` → `tests/cyborg/<base>.cyborg.test.ts` (+ `TAG.SUITE.<BASE>`), checked by `npm run dress`. Gherkin `.feature` specs differ: both their tests are generated whole (`md-specs` rule, `docs/step-definitions.md`).

## Before you start

- Rule: `md-specs` (format, IDs, naming). MD is the source of truth — never edit generated titles/steps to fix sync.
- Know the current state: `npm run dress` (read-only).

## Steps

1. **Write or edit the MD**: `## [ID?] Suite`, `### [ID?] Case`, `#### Step`; details/test data as `- bullets`. Keep IDs/titles globally unique.
2. **Stage**: `npm run stage`. It auto-fixes MD formatting, validates, generates missing cyborg tests, archives orphans, syncs cyborg titles/steps and empty AUTO skeletons, registers `TAG.SUITE`, then formats and lints.
3. **Read the output**: fix every reported error at its source (MD duplicates, missing/extra IDs, tags) and re-run `stage` until "Stage is set!".
4. **Cyborg bodies**: generated steps call `manualStep('…')`. Automate cheap parts inside the same `test.step` (navigation, form filling through fixtures) and keep human checks as `manualStep`; cleanup in `try/finally` or fixture teardown.
5. **Run cyborg**: `npm run play cyborg <base>` (headed, single worker); pass/fail each step in the Cyborg popup.
6. **Rename / delete an MD**: just rename/delete and run `stage` — cyborg tests and empty skeletons move to `tests/archived/`; implemented automated tests stay and must be renamed/retitled by hand.
7. **Automated twins**: implemented API/UI/E2E tests are not rewritten by `stage` — update their titles/steps by hand (`md-to-automated`), then `npm run dress`.

Done when: `npm run stage` ends with "Stage is set!" and `npm run dress` reports no mismatches.
