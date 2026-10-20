---
name: ui-mapper
description: Use before writing tests for pages not yet covered by Page Objects — systematically explores the live pages via Playwright MCP (menus, dropdowns, modals, validation states) and adds locators only. Preparatory pass, not test writing.
---

# Map Live UI into Page Objects

## Before you start

- Scope: list the pages/features for this pass; check `src/pages/` for existing coverage.
- Locators only — no action/`expect*` methods, fixtures or tests in this pass.
- One targeted check inside another task → use `ui-explorer` instead.

## Steps

1. **Open each in-scope page** from `baseURL` (`playwright.config.ts`); log in by creating a throwaway account the way tests do if the page requires it.
2. **Snapshot the resting state**, then actively reveal hidden UI and snapshot each: menus, dropdown option lists, tabs, modals/dialogs, validation errors (submit empty/invalid forms), conditional fields, empty/loaded lists.
3. **Declare locators** in `src/pages/<Name>Page.ts` (`extends BasePage`): `private readonly` fields or private parametrized locator methods, priority and suffixes as in `add-page-object`. Add a class-level `// TODO: action/expect methods not added yet — locators-only pass (ui-mapper)`.
4. **Record coverage** in the session report: page → Page Object → states captured → gaps (what could not be reached and why).

## Do not

- Add a locator you did not observe in this session.
- Confirm destructive actions just to reveal a dialog — open, snapshot, cancel.

Done when: each in-scope page has a Page Object with observed locators and the report lists captured states and gaps.
