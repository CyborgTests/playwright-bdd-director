# Step Definitions Style

Gherkin specs in `test-suites/bdd/` are automated by **step definitions**: each step is implemented once in TypeScript and reused by every scenario that uses it. `npm run stage` generates the Playwright test of each spec - nobody edits it. The same steps can be called from hand-written cyborg tests with `runStep`.

- [When to use it](#when-to-use-it)
- [Quick start](#quick-start)
- [Steps](#steps)
- [Generated tests](#generated-tests)
- [Hooks](#hooks)
- [Special tags](#special-tags)
- [runStep in cyborg tests](#runstep-in-cyborg-tests)
- [Coverage matrix](#coverage-matrix)
- [Coming from Cucumber-style tools](#coming-from-cucumber-style-tools)
- [Limitations](#limitations)

## When to use it

| Spec style                                            | Who writes the test code                            | Fits when                                                                  |
| ----------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Markdown / Gherkin in `test-suites/`                  | test authors, per case (`test.step` + Page Objects) | cases differ a lot, steps are rarely reused                                |
| **Gherkin in `test-suites/bdd/`** (`CONFIG.bdd.dirs`) | nobody - `stage` generates it from step definitions | the team writes Gherkin, steps repeat across scenarios, specs change often |

Both styles live in one repo, share tags, `npm run play`, the Director UI and the coverage matrix. A spec moves between them by moving the file.

## Quick start

1. Write the spec: `test-suites/bdd/header-navigation.feature`

   ```gherkin
   Feature: Header Navigation With Step Definitions
     Background:
       Given user opens the home page

     Scenario: Go back home from "Signup / Login" page
       Given user clicks "Signup / Login" button in header
       When user clicks "Home" button in header
       Then home page is shown
   ```

2. Run `npm run stage`. Steps without a definition make their scenario `test.fixme`, and `stage` prints a snippet for each:

   ```typescript
   When('user clicks {string} button in header', async ({ page }, string: string) => {
     // TODO: implement step
   })
   ```

3. Paste the snippets into a step file (`src/steps/**/*.steps.ts`, `CONFIG.bdd.steps`) and implement them with Page Objects:

   ```typescript
   import { Given, When } from './bdd'

   When('user clicks {string} button in header', async ({ homePage }, button: string) => {
     ...
   })
   ```

4. Run `npm run stage` again, then `npm run play bdd`.

## Steps

`src/steps/bdd.ts` binds the step functions to the project's Playwright `test`, so fixtures are typed:

```typescript
export const { Given, When, Then, Step, Before, After, BeforeAll, AfterAll } = createBdd(test)
```

- **Patterns**: [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions) (`{string}`, `{int}`, `{float}`, `{word}`, ...) or a RegExp. Own parameter types: `defineParameterType({ name: 'color', regexp: /red|green/, transformer: (s) => s.toUpperCase() })` from `@/framework/bdd`.
- **Keyword**: does not affect matching - `Given X`, `When X` and `And X` all find `Then('X')`. `Step('X')` reads as keyword-neutral.
- **Fixtures**: the first parameter destructures the Playwright fixtures the step needs (`async ({ homePage, loginPage }) =>`). The generated test requests exactly these, so list them explicitly - `...rest` is rejected.
- **Arguments**: expression parameters follow the fixtures in order; a Gherkin DataTable or DocString comes last.

  ```typescript
  Then('cart has:', async ({ cartPage }, table: DataTable) => {
    for (const { name, price } of table.hashes()) await cartPage.expectItem(name, price)
  })
  ```

  `DataTable`: `raw()` all rows, `rows()` without header, `hashes()` objects keyed by header, `rowsHash()` two columns as key-value. DocString is a `string`.

- **Missing step** → its scenario is generated as `test.fixme`; `stage` prints a snippet, `dress` warns.
- **Ambiguous step** (several definitions match) → `stage` and `dress` fail, listing each definition with its `file:line`.

## Generated tests

`test-suites/bdd/<path>.feature` → `tests/bdd/<path>.bdd.test.ts` (`TESTS_BDD_DIR`):

| Gherkin          | Playwright                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Feature          | `test.describe` with `TAG.TEST.AUTO`, `TAG.TYPE.BDD`, `TAG.SUITE.*` and Feature tags                                       |
| Background       | `test.beforeEach('Background', …)`                                                                                         |
| Rule             | nested `test.describe`; its Background → `test.beforeEach('Background: <rule or own name>', …)`, run after the Feature one |
| Scenario         | `test` with its tags                                                                                                       |
| Scenario Outline | one `test` per Examples row, title filled with the row values; Examples tags go to the row tests                           |
| step             | `await runStep('Given …', { fixtures })` - a `test.step` titled as the spec step                                           |

- The file imports the step files it uses and is formatted with the project Prettier config.
- **Languages**: a spec may start with `# language: uk` (any [Gherkin dialect](https://cucumber.io/docs/gherkin/languages/)). Step titles keep the localized keyword and the generated `runStep` gets `{ language: 'uk' }`, so `Припустимо, що user opens …` finds `Given('user opens …')`. Step definitions stay the same for every language.
- `dress` regenerates every test in memory and fails when a file is outdated; `stage` rewrites it and deletes generated tests whose spec is gone.
- The spec also gets a cyborg test like any other (`CONFIG.noCyborg` turns it off). There a Rule Background has no hook of its own - its steps lead each scenario of the Rule - and Examples tags tag the whole Outline (one test loops over all rows); the coverage matrix counts them the same way.

## Hooks

Hooks come from the same `./bdd` import. `stage` decides which hooks apply to each scenario by [tag expressions](https://github.com/cucumber/tag-expressions) and writes them into the generated test:

```typescript
Before({ name: 'Clear cart', tags: '@cart and not @api' }, async ({ cartPage }) => { ... })
After(async ({ page }) => { ... }) // no tags - every scenario
BeforeAll({ tags: '@shop' }, async ({ browser }) => { ... }) // worker fixtures only
```

- `Before` / `After` → `test.beforeEach` / `test.afterEach`. A scenario's tags include its Feature, Rule and Examples tags. Scenarios with different hooks are grouped in anonymous `test.describe` blocks, so report titles do not change.
- Order: Before hooks → Background → steps → After hooks (in reverse definition order).
- `BeforeAll` / `AfterAll` → `test.beforeAll` / `test.afterAll` of the feature, matched against Feature tags. Like any Playwright `beforeAll`, they run once per worker.
- Report title: `Before: <name>`; an unnamed hook is `<file>#<n>` (n-th hook of its kind in the file). Names are unique per kind.
- Test details (status, attachments) come from `test.info()`. Example - `src/steps/hooks.steps.ts` attaches the page URL when a scenario fails.
- Hooks run only in generated tests, never in cyborg or other hand-written tests.

## Special tags

They stay Playwright tags too, so `npm run play bdd @slow` works.

| Tag                        | Generated                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| `@skip`, `@fixme`, `@fail` | `test.skip(…)`, `test.fixme(…)`, `test.fail(…)` - also when set on Feature/Rule |
| `@slow`                    | `test.slow()` in the test                                                       |
| `@retries:N`, `@timeout:N` | `test.describe.configure({ retries, timeout })` on the level the tag is written |

An invalid value (`@retries:abc`) or two different values on one level fail `stage`.

## runStep in cyborg tests

A cyborg test can run any step definition instead of asking a person - mixed walkthroughs where navigation is automated and checks stay manual:

```typescript
import '@/steps/navigation.steps'

import { test } from '@/fixtures/base.fixture'
import { runStep } from '@/framework/bdd'

test('Go back home from "Signup / Login" page', async ({ homePage, manualStep }) => {
  await runStep('Given user clicks "Signup / Login" button in header', { homePage })
  await runStep('When user clicks "Home" button in header', { homePage })
  await manualStep('Then home page is shown')
})
```

- Works in cyborg tests of any spec (Markdown too) and in automated tests: a definition matches the step text, the keyword is ignored.
- `runStep` counts as a step with that title for `dress` / `stage` sync, and as an automated step in the matrix (`✔ 2/3`).
- **`stage` never edits it** - new spec steps go into cyborg tests as `manualStep`, and you decide what to automate. `dress` (and `stage`) fail with the exact fix when a call would not work:
  - no definition or several definitions match;
  - the fixtures object misses one the definition destructures (`Fix: await runStep('…', { homePage })`), or is not an object literal;
  - a passed fixture is not declared in the test (`Fix: Add to the test parameters: async ({ homePage, ... }) =>`);
  - the step file is not imported (`Fix: import '@/steps/navigation.steps'`) or `runStep` is not imported;
  - the title is not checkable statically - use a string or `${example.<column>}` of the examples loop;
  - a non-English title has no `{ language: '<code>' }` third argument (the hint gives the `# language:` code of the spec);
  - `test.step` wraps a `runStep` with the same title (the step would be reported twice).
- Fixtures need the project `test` (`@/fixtures/base.fixture`), not the plain `@cyborgtests/test` of a fresh cyborg file.
- In `beforeAll` / `afterAll`, only worker fixtures are available (`browser`, not `page` or Page Objects) - Playwright reports it when a step needs more.

## Coverage matrix

`npm run matrix` shows a `BDD` column once any spec has a generated test: ✔ for a runnable scenario, ⊘ for `test.fixme` (missing steps) and `@skip` / `@fixme` / `@fail`. An Outline is matched row by row. BDD counts as an automated layer.

The matrix reads files as they are - run `npm run dress` first (`npm run play` does) so generated tests are up to date.

## Coming from Cucumber-style tools

| You know                                 | Here                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| features folder / glob in a config       | `test-suites/bdd/` (`CONFIG.bdd.dirs`)                                                          |
| step definitions glob                    | `src/steps/**/*.steps.ts` (`CONFIG.bdd.steps`, `BDD_STEPS`)                                     |
| separate generate command                | `npm run stage` (also formats and validates everything else)                                    |
| generated tests in a hidden folder       | `tests/bdd/` - committed, reviewed in pull requests, checked by `dress`                         |
| `Given/When/Then` with fixtures          | the same, from `createBdd(test)` in `src/steps/bdd.ts`                                          |
| `Before/After/BeforeAll/AfterAll` + tags | the same API: `Before({ tags, name }, fn)`                                                      |
| World / `this` shared between steps      | Playwright fixtures: share state through a fixture or a Page Object                             |
| step context fixtures (test info, tags)  | `test.info()` inside a step or hook                                                             |
| `BeforeStep` / `AfterStep`               | not available - put the logic into the step, a Page Object or a fixture                         |
| `@only`                                  | `npm run play bdd @tag` (`.only` is forbidden by lint)                                          |
| Cucumber reports                         | Cucumber JSON on every run (`test-results/cucumber-report.json`), Monocart, the coverage matrix |

## Limitations

- Step and hook functions declare fixtures by destructuring the first parameter (read from the function source) - a step wrapped in another function loses them.
- Hooks run only in generated tests.
