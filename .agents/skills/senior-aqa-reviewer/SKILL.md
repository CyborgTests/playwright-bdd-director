---
name: senior-aqa-reviewer
description: Use before handing off new or changed tests, Page Objects, clients or fixtures — a senior AQA review of architecture, assertion depth, determinism, data isolation and MD sync.
---

# Senior AQA Review

## Before you start

- Read the changed files and the MD suite they implement before judging; review first, edit second.
- Checklist: [references/checklist.md](references/checklist.md). Standards: rules `playwright-tests`, `api-testing`, `md-specs`.

## Steps

1. **Architecture**: Page Objects / clients / fixtures responsibilities; no raw `page.*` / `request.*` in tests; `private readonly` locators; method order; fixture injection.
2. **Design**: AAA; every MD step is a `test.step` with verbatim text; negative paths covered where the MD or endpoint implies them.
3. **Assertion depth**: business outcome asserted, not only visibility; API — exact status + schema + values.
4. **Determinism**: no sleeps / `waitForLoadState`; sync on responses or web-first assertions after async actions; locators semantic and scoped; unique faker data; cleanup on failure paths.
5. **Hygiene**: no `.only`, `page.pause()`, `console.log`, empty catch, commented-out code; annotations (`TODO/FIXME/NOTE/WONTDO`) used correctly.
6. **Execute**: `npm run dress`, then run the changed tests (`run-tests`) — green on the first attempt; `--repeat-each=2` for new tests.
7. **Report**: findings by severity with `file:line`, the rule violated and the fix; then apply fixes if asked.

Done when: dress and the tests pass and every checklist item is either satisfied or reported.
