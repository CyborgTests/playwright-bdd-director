# Senior AQA Review Checklist

## Page Objects

- [ ] Extends `BasePage`; constructor passes the page's base path.
- [ ] Locators `private readonly`, semantic first (`getByRole` / `getByLabel` / `getByTestId` / `data-*`), no generated class hashes, no unscoped `.first()` / `.nth()`.
- [ ] Method order: private helpers → actions → `expect*`; `expect*` use `expect.soft`, actions use fail-fast `expect` only for preconditions.
- [ ] Action methods return `Promise<void>` (or the next Page Object when navigating).
- [ ] No device/viewport logic re-derived inside steps.
- [ ] Registered as a fixture; no `new XPage()` in steps.

## API clients

- [ ] Endpoints only in `src/clients/*Client.ts` via `BaseClient` helpers.
- [ ] `expect*` wrappers use `APIExpect`: exact `expectStatus`, `expectMatchSchema`, value checks.
- [ ] Schema in `src/schemas/<suite>.schemas.ts`, types in `<suite>.types.ts`.
- [ ] Logged payloads pass through `sanitizeObject`.

## Step definitions

- [ ] Each definition does what its spec step says - its action and its check, nothing of the next step; `npm run dress` has no errors, no unused definitions.
- [ ] Fixtures destructured explicitly; state shared through fixtures, not module variables.
- [ ] Assertions prove the business outcome (data persisted, message shown with exact text, count changed).
- [ ] Negative / boundary cases where the spec or endpoint implies them.
- [ ] A step is implemented completely or left without code (manual) - never half-automated.

## Determinism & data

- [ ] No `waitForTimeout`, `waitForLoadState`, `page.evaluate` DOM mutation, `toHaveCSS` — or a documented exception.
- [ ] Async UI actions are followed by `waitForResponse` or a web-first assertion.
- [ ] Unique data from faker; no shared mutable accounts; cleanup in fixture teardown.
- [ ] Passes on attempt 1 and with `--repeat-each=2`; not order-dependent.

## Hygiene

- [ ] No `.only`, `page.pause()`, `console.log`, empty `catch`, commented-out code.
- [ ] `TODO:` / `FIXME:` / `NOTE:` / `WONTDO:` used per the `typescript` rule.
- [ ] `npx eslint <changed files>` clean.
