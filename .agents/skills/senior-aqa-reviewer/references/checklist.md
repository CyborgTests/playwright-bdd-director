# Senior AQA Review Checklist

## Page Objects

- [ ] Extends `BasePage`; constructor passes the page's base path.
- [ ] Locators `private readonly`, semantic first (`getByRole` / `getByLabel` / `getByTestId` / `data-*`), no generated class hashes, no unscoped `.first()` / `.nth()`.
- [ ] Method order: private helpers → actions → `expect*`; `expect*` use `expect.soft`, actions use fail-fast `expect` only for preconditions.
- [ ] Action methods return `Promise<void>` (or the next Page Object when navigating).
- [ ] No device/viewport logic re-derived inside tests.
- [ ] Registered as a fixture; no `new XPage()` in tests.

## API clients

- [ ] Endpoints only in `src/clients/*Client.ts` via `BaseClient` helpers.
- [ ] `expect*` wrappers use `APIExpect`: exact `expectStatus`, `expectMatchSchema`, value checks.
- [ ] Schema in `src/schemas/<suite>.schemas.ts`, types in `<suite>.types.ts`.
- [ ] Logged payloads pass through `sanitizeObject`.

## Test design

- [ ] Describe / test / step titles match MD per `md-specs` (IDs, suffixes); `npm run dress` clean.
- [ ] Every logical block in `test.step`, blank line between steps.
- [ ] AAA visible; assertions prove the business outcome (data persisted, message shown with exact text, count changed).
- [ ] Negative / boundary cases where the MD or endpoint implies them.
- [ ] Steps without work at this layer keep the `test.step` with an explanatory or `WONTDO:` comment.

## Determinism & data

- [ ] No `waitForTimeout`, `waitForLoadState`, `page.evaluate` DOM mutation, `toHaveCSS` — or a documented exception.
- [ ] Async UI actions are followed by `waitForResponse` or a web-first assertion.
- [ ] Unique data from faker; no shared mutable accounts; cleanup in fixture teardown or `try/finally`.
- [ ] Passes on attempt 1 and with `--repeat-each=2`; not order-dependent.

## Hygiene

- [ ] No `.only`, `page.pause()`, `console.log`, empty `catch`, commented-out code.
- [ ] `TODO:` / `FIXME:` / `NOTE:` / `WONTDO:` used per the `typescript` rule.
- [ ] `npx eslint <changed files>` clean.
