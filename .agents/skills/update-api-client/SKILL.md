---
name: update-api-client
description: Use when adding or changing an API client method in src/clients/ — BaseClient request helpers, expect* wrappers over APIExpect, SchemaValidator schemas and fixture wiring.
---

# Add or Update an API Client Method

## Before you start

- Find the endpoint contract: published docs, or observe real requests/responses (Playwright MCP network tab, a curl against the test environment). No contract → note it with `NOTE:` in the schema file.
- Rule: `api-testing`.

## Steps

1. **Client**: add to the suite client (`src/clients/<Suite>Client.ts extends BaseClient`) or create one. Use the protected helpers `get / post({ form | json }) / put / delete`; URLs are relative to the client's base URL, never built in tests.
2. **Raw method**: returns `Promise<APIResponse>` and takes typed input (`TestUser` from `src/schemas/<suite>.types.ts`).
3. **Schema**: add the validator map to `src/schemas/<suite>.schemas.ts` through `createAPISchema({...})` (wraps `SchemaValidator.validate`); add/extend types in `<suite>.types.ts`.
4. **Assertion method**: `async expect<Outcome>(response: APIResponse)` that builds `new APIExpect(response)` and calls `expectStatus(...)`, `expectMatchSchema(<Suite>Schemas.<name>)` and value checks (`expectRequiredFields`, `getData<T>()`).
5. **Fixture**: expose the client in the suite fixture bound to `apiContext` (see `authClient` in `src/fixtures/auth.fixture.ts`); if the call creates data, clean it up in fixture teardown.
6. **Verify**: use it in an API test, `npm run play api <suite>`, `npx eslint <files>`.

Done when: the method is reachable only through the fixture, validated by a schema, and an API test exercising it is green.
