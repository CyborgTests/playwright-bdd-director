---
name: add-page-object
description: Use when creating a new Page Object or extending an existing one in src/pages/ — class shape, locators, method order and fixture registration.
---

# Add or Extend a Page Object

## Before you start

- Check `src/pages/` — extend an existing class rather than creating a near-duplicate.
- Locators come from a live snapshot taken in this session (`ui-explorer` or `ui-mapper`), not from guesses.

## Steps

1. **Class**: `src/pages/<Name>Page.ts`, `export class <Name>Page extends BasePage`; constructor `(page: Page)` calls `super(page, '<base path>')` so `goto()` works.
2. **Locators**: `private readonly` fields assigned in the constructor.
   - Priority: `getByRole` / `getByLabel` / `getByTestId` / stable `data-*` (the example site uses `[data-qa="…"]`) > text > scoped CSS.
   - Suffix by role, matching existing pages: `…Btn`, `…Input`, `…Msg`, `…Form`, `…Link`, `…Dd`, `…Chk`.
3. **Parametrized locators**: private methods (`private rowByName(name: string): Locator`).
4. **Method order**:
   1. private helpers
   2. actions — `navigateTo…`, `click…`, `fill…`, `select…`; a fail-fast `expect` only for preconditions (e.g. button enabled)
   3. assertions — `expect…` methods using `expect.soft`
5. **Composite flows** (`registerUser(user)`) only when at least two tests need the same sequence.
6. **Fixture**: add `<name>Page: async ({ page }, use) => { await use(new <Name>Page(page)) }` to `src/fixtures/base.fixture.ts` (and its `BaseFixture` interface) or to the suite fixture if page-specific.
7. **Verify**: use it from a test via the fixture; `npx eslint <files>`; run the affected test.

Done when: tests use the page only through the fixture, with no raw `page.*` calls, and the affected test passes.
