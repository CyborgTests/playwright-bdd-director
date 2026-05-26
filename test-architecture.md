# Test Architecture

This document explains the design decisions behind the test layer of Script Stage.

The project demonstrates both **SDET skills** (framework, tooling, infrastructure) and **AQA skills** (test design, coverage strategy, maintainability patterns) — in a single coherent codebase.

---

## Big Picture

```text
Markdown (test specs)
        |
        v
  Script Stage Framework  <-- SDET layer
        |
        v
  Test Layer              <-- AQA layer
  ├── API tests           (fast, contract-level)
  ├── UI tests            (end-to-end, browser)
  └── Hybrid tests        (automation + manual checkpoints)
        |
        v
  Playwright Runner + Monocart Reporter
```

One spec file (`auth.md`) drives three independent test implementations. The framework keeps them synchronized. The test layer focuses entirely on _what_ to verify, not _how_ to manage structure.

---

## Layer Breakdown

### 1. Fixtures (`src/fixtures/`)

Fixtures are the foundation of the test layer. They follow the **Playwright fixture composition pattern** - each fixture is a self-contained unit with setup, teardown, and dependencies declared explicitly.

**`base.fixture.ts`** - shared UI context:

- `page` - Playwright page instance
- `apiContext` - isolated API request context
- `homePage`, `loginPage`, `signupPage` - page objects injected as fixtures, not instantiated in tests

**`auth.fixture.ts`** - authentication context built on top of base:

- `testUser` - randomly generated user via Faker (unique per test run)
- `authClient` - API client bound to the current `apiContext`
- `authenticatedUser` - pre-registered user with automatic cleanup in `finally`
- `wrongPassword` - intentionally invalid password constant for negative tests

**Why fixtures over `beforeEach`:**

- Fixtures are lazy - only instantiated when the test actually needs them
- Teardown is scoped to the fixture, not the test file - impossible to forget cleanup
- Composition is explicit - reading fixture params tells you exactly what a test depends on
- Reusable across test files without any shared state

---

### 2. Page Objects (`src/pages/`)

Page objects follow the **single responsibility principle** - each class owns exactly one page's locators and interactions.

```text
BasePage (abstract)
  - navigateTo()
  - expectCurrentUrl()

LoginPage, HomePage, SignupPage (extends BasePage)
  - locators as private readonly
  - action methods (fill, click)
  - assertion methods (expect*)
```

**Design decisions:**

- **Locators are `private readonly`** - consumers call methods, not locators directly. Locator changes stay inside the page object.
- **Assertions live in page objects** - `expectLoggedIn()`, `expectLoginError()` etc. Tests read like specifications, not implementation details.
- **No `page` passed to methods** - `page` is injected once in the constructor via the base fixture, not threaded through every call.

---

### 3. API Client (`src/clients/`)

The API layer mirrors the page object pattern but for HTTP calls.

**`BaseClient`** - generic HTTP methods (`get`, `post`, `put`, `delete`) with URL builder and navigation helpers.

**`AuthClient`** (extends `BaseClient`) - auth-specific methods:

- `register()`, `verifyLogin()`, `deleteAccount()`, `logout()` - raw API calls
- `expectRegistered()`, `expectLoginSuccess()`, `expectLoginFailed()`, `expectLogoutSuccess()` - assertion methods that wrap `APIExpect`

**`APIExpect`** (`src/test-utils/`) wraps `APIResponse` with:

- `expectStatus()` - validates HTTP status
- `expectMatchSchema()` - validates response body against `SchemaValidator` schema
- `getData<T>()` - typed response body access

**`SchemaValidator`** (`src/test-utils/`) - lightweight Joi-like validator for API response contracts. Defines required fields and types without a heavy dependency.

**Why a custom validator over Joi/Zod:**

- Zero runtime dependencies
- Validates only what the test actually cares about (not full schema strictness)
- Error messages designed for test output readability

---

### 4. Test Files (`tests/`)

Three test types, one spec:

```text
auth.md  (5 test cases)
  |
  ├── auth.api.test.ts    - pure API, no browser
  ├── auth.ui.test.ts     - full browser E2E
  └── auth.hybrid.test.ts - browser automation + manual checkpoints
```

**Why three implementations of the same spec:**

- **API tests** are fast and deterministic - catch contract regressions in seconds without browser overhead
- **UI tests** verify the real user journey end-to-end - the only layer that catches CSS/JS rendering issues
- **Hybrid tests** keep manual QA in the loop for exploratory or visually-sensitive assertions that are expensive to automate

Each implementation is independently runnable. The same test case (`User Registration`) is validated at three levels simultaneously.

---

### 5. Test Data Strategy

All test data is **generated per test run** via `faker.js`, never hardcoded:

```typescript
email: faker.internet.email() // unique per run
password: faker.internet.password() // random strength
name: faker.person.firstName() // realistic
```

**Cleanup is guaranteed** via fixture teardown with `finally`:

```typescript
authenticatedUser: async ({ ... }, use) => {
  const testUser = generateTestUser()
  await authClient.register(testUser)
  await use({ testUser, authClient, ... })
  await authClient.deleteAccount(testUser.email, testUser.password)
}
```

`finally` ensures cleanup runs even when the test fails mid-execution. No leftover accounts, no flaky dependencies between runs.

---

### 6. Sensitive Data Handling

API responses can contain tokens, emails, passwords. The `sanitizeObject` helper in `src/test-helpers/test.helpers.ts` masks sensitive keys recursively before attaching to test reports:

```typescript
sanitizeObject({ email: 'user@test.com', password: 'secret123' })
// => { email: 'us***@test.com', password: '***' }
```

Partial email masking preserves debuggability while keeping credentials out of logs.

---

### 7. Tagging System (`src/test-constants/tags.ts`)

Tests are tagged with a two-dimensional system:

```typescript
TAG.TEST.AUTO // execution type: @auto, @manual, @hybrid
TAG.TYPE.API // technical type: @api, @ui, @e2e
TAG.SUITE.AUTH // feature domain: @auth, @todo, ...
```

This allows precise test selection:

```bash
npm run play api auth        # only API auth tests
npm run play ui              # all UI tests across all suites
npm run play hybrid auto     # hybrid + automated
npm run play auth            # everything tagged @auth
```

Tags are type-safe constants - no string typos, autocomplete works, global rename is one operation.

---

### 8. Reporting

Tests use **Monocart Reporter** with:

- Step-level detail in HTML report
- Screenshots on failure
- Structured logs attached via `logger.ts` (`attachLog`, `attachJSON`)

Dynamic project selection in `playwright.config.ts` uses `getProjectsFromGrep()` - reads the `--grep` tag at config time and activates only the matching projects (automated/hybrid/manual). This means headless/headed mode, parallelism, and timeouts are set correctly for each test type automatically.

---

## Coverage Map

| Test Case                  | API | UI  | Hybrid |
| -------------------------- | --- | --- | ------ |
| User Registration          | +   | +   | +      |
| Login With Wrong Password  | +   | +   | +      |
| Verify Login Without Email | +   | +   | +      |
| User Login                 | +   | +   | +      |
| Delete User Account        | +   | +   | +      |

5 test cases x 3 implementations = **15 test scenarios** from one source of truth.

---

## Why This Architecture Scales

1. **New feature** - add `feature.md`, run `npm run stage`, skeletons are generated for all three test types
2. **Spec change** - update the MD file, run `npm run stage`, manual tests are auto-fixed, API/UI tests highlight what needs updating
3. **New page** - add a page object, extend the base fixture, available in all tests via dependency injection
4. **New API endpoint** - add method to `AuthClient` (or new client extending `BaseClient`), add schema to `auth.schemas.ts`
5. **Team growth** - MD specs are readable by non-engineers; test files are readable by engineers; the framework keeps them in sync

Each layer has exactly one responsibility. Changes are local. The framework enforces consistency so the team can focus on test quality instead of structural maintenance.
