---
description: API test standards — client layer, APIExpect, SchemaValidator contracts, status matrix and data isolation.
paths:
  - 'tests/automated/api/**/*.ts'
  - 'src/clients/**/*.ts'
  - 'src/schemas/**/*.ts'
  - 'src/test-utils/**/*.ts'
---

# API Testing

## Client layer

- Endpoints and HTTP methods live only in clients (`src/clients/*Client.ts`, extending `BaseClient`). Tests never call raw `request.post()` or build URLs.
- Clients expose raw calls (`register()`, `verifyLogin()`) plus `expect*` methods that wrap `APIExpect` (`expectRegistered()`, `expectLoginFailed()`).
- Clients are injected by fixtures bound to the test's `apiContext` (see `src/fixtures/auth.fixture.ts`).

## Contract & assertions

- Validate response bodies with `APIExpect.expectMatchSchema(schema)` against schemas in `src/schemas/*.schemas.ts` (`SchemaValidator`, no Joi/Zod dependency); keep types in `*.types.ts`.
- Assert the exact status (`expectStatus(200)`), never a generic "ok".
- Assert returned values against the request (ids, names, messages), not only types.
- Note when the API has no published contract (`NOTE:` in the schema file) — schemas then encode observed behavior.

## Coverage matrix (apply what the endpoint supports)

- Happy path: create / read / update / delete with full payload checks.
- Validation: missing, empty, boundary and malformed fields → exact error code and message.
- Auth: wrong or missing credentials; actions on deleted/nonexistent entities.
- Conflicts: duplicate creation on unique fields (e.g. email).

## Data & secrets

- Unique data per test from `faker` (`generateTestUser()`); create prerequisites through the API in fixtures, delete them in fixture teardown.
- Never hardcode tokens, passwords or API keys; credentials come from generated data or env.
- Attach request/response details only through `sanitizeObject` (`src/test-helpers/test.helpers.ts`) + `logJson` so secrets are masked in reports.
- Let HTTP failures surface with context; never swallow a rejected request.
