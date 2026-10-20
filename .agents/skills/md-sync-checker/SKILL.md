---
name: md-sync-checker
description: Use to report whether test-suites/*.md and the tests implementing them are in sync — after MD edits, before committing near test-suites/ or tests/, or when dress fails. Read-only.
---

# MD Sync Checker

## Before you start

- Read-only: don't run `npm run stage` or edit files during the check.

## Steps

1. **Validator**: `npm run dress`; capture exit code and every finding.
2. **Pairing**: for each `test-suites/**/*.md` list implementations `tests/**/<base>.*.test.ts`; flag MDs without a cyborg test and tests whose base name has no MD (outside `tests/archived/`).
3. **Tags**: every `TAG.SUITE.*` used in tests exists in `src/test-constants/tags.ts`, and each MD base name has its tag.
4. **Classify each finding**:
   - fixable by `stage` (cyborg titles/steps, empty skeletons, MD formatting, missing cyborg file, `TAG.SUITE`);
   - manual (implemented automated tests, IDs, duplicate titles/IDs across MDs, wrong tags).
5. **Report**: grouped by file — what differs (suite/case/step, expected vs actual), and the fix route (`npm run stage` or the manual edit with skill: `md-to-automated`).

Done when: a pass/fail verdict plus an itemized, routed list of mismatches is delivered.
