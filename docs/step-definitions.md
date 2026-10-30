# Step Definitions

Every spec in `test-suites/` - Markdown or Gherkin - is automated by **step definitions**: each step is implemented once in TypeScript and reused by every test case that uses it. The tests themselves are generated from the specs on every run; nobody writes or edits them.

- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Markdown or Gherkin](#markdown-or-gherkin)
- [Layers](#layers)
- [Devices](#devices)
- [Steps](#steps)
- [Step context](#step-context)
- [Generated tests](#generated-tests)
- [Hooks](#hooks)
- [Special tags](#special-tags)
- [Reports](#reports)
- [Coverage matrix](#coverage-matrix)
- [Migrating from other tools](#migrating-from-other-tools)
- [Limitations](#limitations)

The example suites in `test-suites/` use these features on a real site - README "Working Example" maps each one to its spec and code.

## How it works

- A step **with** a step definition runs automatically: `autoStep('Open Home Page', { homePage })`.
- A step **without** one is walked by a person: `manualStep('Open Home Page')` - the Cyborg Tests control panel asks to do it and confirm.
- A definition **without code** (empty body or comments only, `// TODO` or not) counts as none: its step stays manual.
- A test whose steps are all automated is tagged **`@auto`** and runs in the automated projects - `api`, or one per browser and device (see [Devices](#devices)). A test with at least one manual step is a **cyborg test** (`@cyborg`) and runs in the `cyborg` project: headed, one at a time, no time limit.
- Automation is therefore a gradient, step by step: write a definition, and on the next run its step stops asking a person; when the last one is written, the test becomes `@auto` by itself. Nothing to keep in sync by hand.

`playwright.config.ts` generates the tests (`.director/tests/`, gitignored) every time Playwright loads it - `npm run play`, `npm run show`, the VS Code extension; in UI mode and the IDE they are regenerated on every change of a spec or `src/`. An invalid spec or an ambiguous step stops the run with the reason.

## Quick start

1. Write the spec with its layer tag - `test-suites/navigation.md`:

   ```markdown
   @ui
   ## Site Navigation

   ---

   ### Open "Signup / Login" Page from Header
   #### Click "Signup / Login" Button in Header
   #### Verify "Login to your account" Form is visible
   ```

2. `npm run play cyborg navigation` already works: no step has a definition, so a person walks the test.
3. `npm run dress` lists the steps a person walks, by test; `npm run steps navigation` writes a skeleton for each into `src/steps/navigation.steps.ts`:

   ```typescript
   import { Step } from './bdd'

   Step('Click {string} Button in Header', async ({}, _string: string) => {
     // TODO: implement step
   })
   ```

4. Implement them with Page Objects (a skeleton stays manual until it has code):

   ```typescript
   Step('Click {string} Button in Header', async ({ homePage }, button: string) => {
     await homePage.clickHeaderBtn(button)
   })
   ```

5. `npm run play auto navigation` - the test is `@auto` once all its steps are implemented.

## Markdown or Gherkin

Both formats generate the same kind of tests, share step definitions, hooks, tags, `npm run play`, the Director UI, the coverage matrix and the reports. The extension picks how the spec is written:

| Spec               | Steps                                                         | Fits when                                                        |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Markdown `.md`     | `#### Click "Login" Button` - plain sentences, details below  | the team wants readable test cases without Gherkin syntax        |
| Gherkin `.feature` | `When user clicks "Login" button` - keywords, Rules, Outlines | the team writes Gherkin or moves an existing Cucumber suite over |

- Markdown: `##` suite, `###` test case, `####` step, `@tags` lines above `##` / `###` headings (as in Gherkin), an examples table under a test case, `### Background`; bullet lines are notes for people. `npm run stage` formats the files as dense as Gherkin: no blank lines but around the `---` before every test case.
- Gherkin: anything the Gherkin parser accepts - Background, Rule (with its own Background), Scenario Outline with Examples (tagged too), DataTable, DocString, `# language:`.
- Markdown stays simple on purpose: tags go on the suite and the test case only. A group of cases with shared tags (Rule) becomes its own spec, tagged rows (several Examples) become separate test cases. A suite that needs more moves to Gherkin: `npm run adapt <suite>` converts it (and back, while it fits Markdown); its steps come out as `*`, so set Given / When / Then before using it.
- Markdown steps have no keyword - define them with `Step(…)`. Gherkin keywords do not affect matching either, so one definition can serve both formats only when the texts match; different wordings share code by calling one step function from another (`src/steps/cart.steps.ts`).

## Layers

Every test belongs to exactly one layer - `@api`, `@ui` or `@e2e` - written as a spec tag:

- on the suite (`@ui` above `## Suite` or `Feature:`) for all its test cases;
- on a test case (or Rule, Examples) to override it - the most specific level wins.

A test without a layer, or with two layer tags on one level, stops the run. **Cyborg tests are UI or E2E only**: an `@api` test with a step left without definition is generated as `test.fixme` (shown in `dress` and the matrix) until every step is automated. `@auto` and `@cyborg` are set by the Director - specs never write them.

## Devices

UI and E2E tests run on every desktop browser (`chrome`, `firefox`). **`@all-devices`** on any level - Feature, Rule, Scenario, Examples, a Markdown suite or test case - runs them on tablets and mobiles too (`tablet`, `mobile`):

```gherkin
@e2e @all-devices
Rule: Checkout
```

- API tests run once in the `api` project, without a browser; `@all-devices` on one stops the run.
- Which browsers and devices exist is Playwright configuration: `src/config/devices.ts` (desktop and handheld groups), projects built from it in `src/config/projects.ts`. Specs, steps and generated tests do not change when a device is added.
- `npm run play e2e mobile` runs on one device; the coverage matrix shows each test's devices (`desktop`, `all`, `-` for API).
- A page that differs on small screens: the fixture picks the Page Object by `testInfo.project.use.isMobile` - steps and specs stay the same. Cyborg tests are walked on a desktop browser.

## Steps

`src/steps/bdd.ts` binds the step functions to the project's Playwright `test` (`src/fixtures`, `CONFIG.bdd.fixtures`), so fixtures are typed:

```typescript
export const {
  Given,
  When,
  Then,
  Step,
  Before,
  After,
  BeforeAll,
  AfterAll,
  BeforeStep,
  AfterStep
} = createBdd(test)
```

- **Files**: `src/steps/**/*.steps.ts` (`CONFIG.bdd.steps`, `BDD_STEPS`); `npm run steps <suite>` appends to `src/steps/<suite>.steps.ts`.
- **Patterns**: [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions) (`{string}`, `{int}`, `{float}`, `{word}`, ...) or a RegExp. `/` separates alternatives and `( )` marks optional text in an expression - escape a literal one: `'Verify "Signup\\/Login" Page'`. Own parameter types: `defineParameterType({ name: 'color', regexp: /red|green/, transformer: (s) => s.toUpperCase() })` from `@/framework/bdd`.
- **Keyword**: does not affect matching - `Given X`, `When X` and `And X` all find `Then('X')`. `Step('X')` reads as keyword-neutral and fits Markdown steps.
- **Fixtures**: the first parameter destructures the Playwright fixtures the step needs (`async ({ homePage, loginPage }) =>`). The generated test requests exactly these, so list them explicitly - `...rest` is rejected. Fixtures are shared by all steps of a test: `testUser` of one step is `testUser` of the next.
- **Arguments**: expression parameters follow the fixtures in order; a Gherkin DataTable or DocString comes last.

  ```typescript
  Then('cart has:', async ({ cartPage }, table: DataTable) => {
    for (const { name, price } of table.hashes()) await cartPage.expectItem(name, price)
  })
  ```

  `DataTable`: `raw()` all rows, `rows()` without header, `hashes()` objects keyed by header, `rowsHash()` two columns as key-value. DocString is a `string`.

- **Step function**: `Given/When/Then/Step` return the function, typed - call it from another step with only the fixtures it uses, or register it under another wording (`Step('Add {string} to Cart', addToCart)`):

  ```typescript
  const addToCart = When(
    'user adds {string} to cart',
    async ({ productsPage }, product: string) => {
      await productsPage.addToCart(product)
    }
  )

  Given('cart has {string}', async ({ productsPage, cartPage }, product: string) => {
    await addToCart({ productsPage }, product)
    await cartPage.navigateToCart()

    await cartPage.expectInCart(product)
  })
  ```

- **No definition / no code** → the step is manual; `dress` lists it, `npm run steps <suite>` writes skeletons.
- **Ambiguous step** (several definitions match) → `dress` and the run fail, listing each definition with its `file:line`.
- **Unused definition** (no spec step matches it) → `dress` warns.

## Step context

`bdd` next to the fixtures gives a step or hook what Playwright fixtures do not know - it is supplied by the runtime, not requested as a fixture:

```typescript
Then('discount is shown', async ({ cartPage, bdd }) => {
  if (!bdd.tags.includes('@promo')) bdd.step?.skip('no promo in this scenario')
  await cartPage.expectDiscount()
})
```

| Field                  | What                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `bdd.tags`             | tags of the test: spec tags, its layer, `@auto` / `@cyborg` and the suite tag (`@<file>`) |
| `bdd.scenario`         | test title (an examples row with its values)                                              |
| `bdd.testInfo`         | Playwright `TestInfo`                                                                     |
| `bdd.step.title`       | step as the test shows it: `Then discount is shown`, Markdown `Verify Discount is shown`  |
| `bdd.step.skip(note?)` | marks the step skipped and stops it; the test goes on (a step or `BeforeStep`)            |
| `bdd.step.attach(…)`   | attachment of the step - shown under it in Playwright and Cucumber reports                |
| `bdd.step.error`       | `AfterStep`: error of the step, `undefined` when it passed                                |

`bdd` is a reserved name - do not name a fixture `bdd`.

## Generated tests

`test-suites/<path>.{md,feature}` → `.director/tests/<path>.test.ts` (`GENERATED_TESTS_DIR`), one file per spec:

| Spec                                   | Playwright                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| suite / Feature                        | `test.describe` tagged with the suite tag `@<file name>` and its spec tags                      |
| Background                             | `test.beforeEach('Background', …)`                                                              |
| Rule                                   | nested `test.describe`; its Background → `test.beforeEach('Background: <rule or own name>', …)` |
| test case / Scenario                   | `test` tagged `@auto` or `@cyborg`, its layer and its own tags                                  |
| examples table / Scenario Outline      | one `test` per row, title filled with the row values; Examples tags go to the row tests         |
| step with a definition                 | `await autoStep('Given …', { fixtures })` - a `test.step` titled as the spec step               |
| step without one (or one without code) | `await manualStep('Given …')`                                                                   |

Each generated file carries an inline source map to its spec: steps and Backgrounds point to their spec line (`cart.feature:29`) in traces, stacks and reports, a browser action inside a step to the code that runs it. Tests and describes stay in the generated file, so Playwright UI and the VS Code extension list and run them as usual.

- A manual Background step makes every test under it a cyborg test.
- **Languages**: a Gherkin spec may start with `# language: fr` (any [Gherkin dialect](https://cucumber.io/docs/gherkin/languages/)). Step titles keep the localized keyword and `autoStep` gets `{ language: 'fr' }`, so `Soit user opens …` finds `Given('user opens …')`. Step definitions stay the same for every language.
- Spec base names are unique across `test-suites/**` - the name is the suite tag (`npm run play auth`) and pairs reports with the spec.
- `autoStep` / `runHook` / `useStepHook` come from `@/framework/bdd/runtime` and exist for generated tests only - the public `@/framework/bdd` does not export them.
- The generated files are formatted with the project Prettier config, so a failure points to readable code; they are never committed.

## Hooks

Hooks come from the same `./bdd` import. The generator decides which hooks apply to each test by [tag expressions](https://github.com/cucumber/tag-expressions) and writes them into the generated test:

```typescript
Before({ name: 'Clear cart', tags: '@cart and not @api' }, async ({ cartPage }) => { ... })
After(async ({ page }) => { ... }) // no tags - every test
BeforeAll({ tags: '@shop' }, async ({ browser }) => { ... }) // worker fixtures only
AfterStep({ name: 'Screenshot', tags: '@ui' }, async ({ page, bdd }) => {
  await bdd.step?.attach('screenshot', { body: await page.screenshot(), contentType: 'image/png' })
})
```

- `Before` / `After` → `test.beforeEach` / `test.afterEach`. A test's tags include its suite, Rule and Examples tags, its layer, `@auto` / `@cyborg` and the suite tag - `Before({ tags: '@cyborg' }, …)` prepares only the tests a person walks. Tests with different hooks are grouped in anonymous `test.describe` blocks, so report titles do not change.
- A hook requesting `page` opens a browser - tag it `not @api` when API tests do not need one (`src/steps/hooks.steps.ts`).
- `BeforeStep` / `AfterStep` run inside every automated step of the matching tests, Background steps included. The generated test registers them first: `test.beforeEach('AfterStep: Screenshot', … useStepHook(…))`. `AfterStep` runs after a failed or skipped step too (`bdd.step.error`); a failing `AfterStep` fails the step.
- `BeforeStep` fits a concern of every step of some tests that the steps themselves should not know: prepare the page, measure, or leave out steps an environment cannot do. `bdd.step.skip()` marks the step skipped and the test goes on:

  ```typescript
  // Downloads are checked locally - the CI browser has no download folder
  BeforeStep({ name: 'No downloads in CI', tags: '@download' }, async ({ bdd }) => {
    if (process.env.CI && /download/i.test(bdd.step?.title ?? ''))
      bdd.step?.skip('no downloads in CI')
  })
  ```

  Skipping hides a check: prefer `@skip` on the whole test unless the rest of the test still proves something.

- Order: Before hooks → Background → steps (each wrapped by BeforeStep / AfterStep) → After hooks; After and AfterStep hooks in reverse definition order.
- `BeforeAll` / `AfterAll` → `test.beforeAll` / `test.afterAll` of the suite, matched against suite tags and the suite tag. Like any Playwright `beforeAll`, they run once per worker.
- Report title: `Before: <name>`; an unnamed hook is `<file>#<n>` (n-th hook of its kind in the file). Names are unique per kind.

## Special tags

They stay Playwright tags too, so `npm run play @slow` works. Written on a Feature, Rule, Scenario or Examples - the level decides which tests they cover.

| Tag                                                   | Generated                                                  | Use when                                                                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@skip`                                               | `test.skip(…)`                                             | the case does not apply here or yet: the feature is off on this environment, not built, out of scope for a release. Not for bugs - the reason is not a defect                      |
| `@fixme`                                              | `test.fixme(…)`                                            | a confirmed bug blocks the flow, so running the test proves nothing (it hangs, or fails before reaching what it checks). The test does not run; note the bug next to the tag       |
| `@fail`                                               | `test.fail(…)`                                             | a confirmed bug the test still reaches: it runs, must fail and counts as passed. Once the bug is fixed it fails - the reminder to drop the tag (`cart.feature`, quantity 0 and -2) |
| `@skip:<device>`, `@fixme:<device>`, `@fail:<device>` | the same modifier with a condition on the project          | the case or the bug concerns one device (`chrome`, `firefox`, `tablet`, `mobile`); the others run the test as usual (`cart.feature`: placing an order fails on a tablet)           |
| `@slow`                                               | `test.slow()` in the test                                  | the test is legitimately slow - triples its timeout                                                                                                                                |
| `@retries:N`                                          | `test.describe.configure({ retries })` on the tagged level | a dependency outside your control is unstable. A test that passes only on retry is not green - read the first attempt (`cart.feature`, placing an order)                           |
| `@timeout:N`                                          | `test.describe.configure({ timeout })` on the tagged level | a group needs a limit other than the project's (`cart.feature`, Rule Checkout: API registration, login and an order)                                                               |

`@skip`, `@fixme` and `@fail` on a Feature or Rule cover all its tests. Cyborg tests have no time limit, so `@slow` and `@timeout` do not change them. An invalid value (`@retries:abc`), two different values on one level, an unknown device (`@fail:tabet`) or a device the test never runs on (`@fail:tablet` without `@all-devices`) stop the run.

## Reports

Every run writes Cucumber reports of all tests, see README "Reports":

- `test-results/cucumber/<device>/cucumber-report.json` - Cucumber JSON for test management tools, one per device (Playwright project); manual steps, skipped steps and step attachments (`AfterStep` screenshots) included.
- `test-results/cucumber/<device>/cucumber-messages.ndjson` - Cucumber messages, the newer format; a Gherkin spec keeps its source (Rules, tables, language), Markdown specs get Gherkin written from the report.
- `test-results/cucumber/cucumber-report.html` - the standard Cucumber HTML report of all devices, a section per device and spec: a single file, opens offline.
- A known bug (`@fail`, `@fail:<device>`) stays failed with the tag in the message; a test that passes despite it fails.

## Coverage matrix

`npm run matrix` lists every generated test with its layer, status - `auto`, `cyborg`, `fixme` (API test waiting for definitions), `disabled` (`@skip` / `@fixme` / `@fail`) - and how many of its steps are automated. It generates the tests in memory, so it always reflects the current specs and step definitions. Next to that it shows the last run of every test on every device that runs it - one run per Playwright project, as `npm run dress` counts them (`test-results/last-run.json`, kept across partial runs) - and the same counts by spec tag.

## Migrating from other tools

Write new steps in step files with fixtures ([Steps](#steps)) - the one way this guide teaches. Two more styles exist only so that existing suites move over without rewriting their steps; convert them to step files when convenient.

| You know                                 | Here                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| features folder / glob in a config       | every `.feature` (and `.md`) in `test-suites/`                                            |
| step definitions glob                    | `src/steps/**/*.steps.ts` (`CONFIG.bdd.steps`, `BDD_STEPS`)                               |
| separate generate command                | none - tests are generated on every run; `npm run dress` checks without running           |
| missing steps fail or are skipped        | missing steps are walked by a person (cyborg test); API tests stay fixme                  |
| `Given/When/Then` with fixtures          | the same, from `createBdd(test)` in `src/steps/bdd.ts`; they return the step function     |
| `Before/After/BeforeAll/AfterAll` + tags | the same API: `Before({ tags, name }, fn)`                                                |
| `BeforeStep` / `AfterStep`               | the same API, with `bdd.step` (title, error, skip, attach)                                |
| World / `this` shared between steps      | migration: `createBdd(test, { world: 'world' })`; new code shares state through a fixture |
| step context fixtures (tags, step, info) | one `bdd` object next to the fixtures                                                     |
| decorators on Page Object methods        | migration: `@StepsFor('fixture', { tags })` + `@Given(…)`, subclasses chosen by tags      |
| `@only`                                  | `npm run play <suite> @tag` (`.only` is forbidden by lint)                                |
| Cucumber reports                         | JSON, messages (NDJSON) and HTML on every run, plus Monocart and the coverage matrix      |

Add a layer tag to every migrated feature (`@ui` above `Feature:`) - see [Layers](#layers).

### From plain Playwright tests

`npm run migrate tests/login.spec.ts` turns a Playwright test file into `test-suites/login.md` and `src/steps/login.steps.ts`:

- `test.describe` → `## suite`, each `test` → `### test case` (`{ tag }` → tags line, `test.skip` / `test.fixme` → `@skip` / `@fixme`)
- each `await test.step(title, fn)` → `#### title` and a step definition with the code of `fn` and only the fixtures it uses; the same title in several tests is one step definition
- layer: `@api` for tests with `request` and no `page`, else `@ui`; hooks → `Before` / `After` / `BeforeAll` / `AfterAll` of the suite tag; imports and other declarations go to the step file
- only tests made of `test.step` calls: the step titles are the spec. Code outside a step (codegen output), `testInfo`, `test.use`, nested describes, one step title with different code, a step matching an existing step definition - every such line is listed and nothing is written
- a value passed from one step to another needs a fixture (each step is its own function); step texts stay literal - turn values into `{string}` parameters by hand
- the test file stays: run `npm run dress` and the suite, then delete it

### From Cucumber: World style

Cucumber steps written on a shared `this` object run as they are - no rewrite into fixtures. The world is an ordinary fixture:

```typescript
export const test = base.extend<{ world: ShopWorld }>({
  world: async ({ page }, use) => use(new ShopWorld(page))
})

const { Given, Then, Before } = createBdd(test, { world: 'world' })

Given('user logs in as {string}', async function (email: string) {
  await this.loginPage.login(email)
})
```

- Steps get expression parameters only; `Before`, `After`, `BeforeStep`, `AfterStep` get `this` too. `BeforeAll` / `AfterAll` keep worker fixtures - there is no world per worker.
- Use `function`, not an arrow function - an arrow has no `this`.
- Both styles can be mixed in one project (two `createBdd` calls).

### From playwright-bdd: steps on Page Object methods

The migration path from playwright-bdd is built in: Page Objects with decorated step methods keep working - the generated test requests the fixture that creates the object:

```typescript
import { Given, StepsFor, When } from '@/framework/bdd'

@StepsFor('homePage')
export class HomePage extends BasePage {
  @Given('user opens the home page')
  async navigateToHome(): Promise<void> { ... }

  @When('user clicks {string} button in header')
  async clickHeaderBtn(name: string): Promise<void> { ... }
}
```

- Import the decorators from `@/framework/bdd`, not `./bdd` - Page Objects are imported by fixtures, the steps file imports fixtures, so `./bdd` would be an import cycle. The fixture name is not typed there: a wrong one fails `npx tsc` on the generated test and the run.
- Parameters are those of the expression, then DataTable / DocString; no fixtures object. A method without code is a step without definition, as anywhere.
- **Subclasses**: steps of a base class run on any subclass registered for a fixture - for a page that works differently in some tests (a mobile layout behind a menu button, a tenant with its own theme) while the specs stay the same.
  - `@StepsFor('mobileHomePage', { tags: '@mobile' })` - tests matching the tags use `mobileHomePage` for every step of `HomePage` (the most derived matching subclass wins; unrelated subclasses matching the same test stop the run).
  - Without tags, a subclass is used when another step of the same test already needs it - one object for the test steps (a Background picks its own).
  - An overridden method (`override async clickHeaderBtn`) runs the override; decorating it again with the same pattern is not a second step.
- Standard TypeScript decorators (no `experimentalDecorators`). The decorated classes must be loaded with the step files - they are, when fixtures used by the steps import them.
- Page Objects stay plain classes; the decorators only register steps.

#### Without decorators

The same steps as step files - a step calls the Page Object method, and the fixture picks the subclass by the test tags:

```typescript
When('user clicks {string} button in header', async ({ homePage }, name: string) => {
  await homePage.clickHeaderBtn(name)
})

// fixture
homePage: async ({ page }, use, testInfo) => {
  await use(testInfo.tags.includes('@mobile') ? new MobileHomePage(page) : new HomePage(page))
}
```

## Limitations

- Step and hook functions declare fixtures by destructuring the first parameter (read from the function source) - a step wrapped in another function loses them.
- "No code" is read from the function source as well: a body with any statement is code, a call to a helper included.
- Vitest does not compile decorator syntax - unit tests of decorated Page Objects need another runner; Playwright and `tsx` (generation) compile them.
