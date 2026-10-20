---
description: Playwright test-layer standards — POM/fixtures architecture, assertion quality, determinism, test.step structure and forbidden anti-patterns.
paths:
  - 'tests/automated/**/*.ts'
  - 'tests/cyborg/**/*.ts'
  - 'src/pages/**/*.ts'
  - 'src/fixtures/**/*.ts'
  - 'src/clients/**/*.ts'
  - 'src/test-helpers/**/*.ts'
  - 'src/test-utils/**/*.ts'
---

# Playwright Test Layer

## Architecture

- Responsibilities: Page Objects (`src/pages/`, extend `BasePage`) own locators and UI interactions; clients (`src/clients/`, extend `BaseClient`) own HTTP calls; fixtures (`src/fixtures/`) build and inject them; test files only declare scenarios and assertions.
- Tests receive Page Objects and clients through fixtures (`test.extend`), never `new XPage(page)` in a test.
- Locators are `private readonly` inside Page Objects; tests never call `page.locator()` / `page.getBy*()` directly.
- Locator priority: `getByRole` / `getByLabel` / `getByTestId` / stable `data-*` attributes > text > scoped CSS. No generated class hashes, no unscoped `.first()` / `.nth()` (scoped indexing inside charts/SVG/3rd-party widgets is fine).
- Page Object method order: private helpers → actions (`click*`, `fill*`, fail-fast `expect`) → `expect*` assertion methods (use `expect.soft`).

## Test design

- Arrange (fixtures, data) → Act (Page Object / client methods) → Assert (resulting state).
- Assert business outcomes — persisted data, changed counts, response payloads — not just `toBeVisible()`. Visibility-only is acceptable when nothing deeper is observable (canvas, opaque widgets).
- Every test runs independently and in parallel: unique data from `faker` per test, own entities only, cleanup in fixture teardown or `try/finally` (runs even when the test fails).
- After an action that triggers async backend work, synchronize on `page.waitForResponse(...)` or a web-first assertion before the next step.
- A test that passes only on retry is not green — fix the root cause from the first attempt's trace.
- Never make a test pass by weakening assertions, commenting out steps or dropping coverage. Real app bug → `test.fixme()` + `FIXME:` comment (see `typescript` rule).

## Steps & MD sync

- Every `test.step()` title equals the matching `####` step from `test-suites/*.md`; test titles and describe titles follow the `md-specs` rule. `npm run dress` verifies it.
- Wrap each logical action/assertion block in `await test.step(...)`; separate consecutive steps with one blank line.
- Cyborg tests use `manualStep('…')` for human checks; automate the parts that are cheap to automate inside the same step.

## Forbidden (with the only accepted exceptions)

- `page.waitForTimeout()` / sleeps — except timing tests (debounce, SLA) with no deterministic signal.
- `page.waitForLoadState()` — Playwright auto-waits; use web-first assertions.
- `page.evaluate()` to mutate the DOM or fake user input — reading geometry that locators can't expose is fine.
- `toHaveCSS` / pixel assertions — except an explicit visual requirement with no semantic signal.
- Empty `try/catch` around interactions; `try/finally` for cleanup is fine.
- Committed `page.pause()`, stray `console.log`, `test.only` / `describe.only`.

## Screenshots

Default is none — assert state instead. Add one only when the value is visual (layout, theming, charts, i18n); mask dynamic regions; review every new baseline before committing. Procedure: `add-screenshot` skill.
