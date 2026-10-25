---
description: Specs (test-suites/*.md and Gherkin *.feature), layers, tags and IDs, and how step definitions turn them into generated auto / cyborg tests.
paths:
  - 'test-suites/**/*.md'
  - 'test-suites/**/*.feature'
  - 'src/steps/**/*.ts'
---

# Specs & Generated Tests

## Format

- Markdown: `##` suite, `###` test case (`### Background` - steps before every case), `####` step. Bullet lines (`- …`) under any heading are notes for people, not part of the test. `npm run stage` formats the file as dense as Gherkin: no blank lines but around the `---` before every `###`.
- Gherkin `.feature`: anything the parser accepts - Background, Rule (own Background), Scenario Outline + Examples (tagged too), DataTable, DocString, `# language:`.
- Markdown is kept simple: no Rule, no tagged Examples, no step tags - never extend it; a suite that needs more moves to Gherkin.
- One spec file = one suite. Base name is unique across `test-suites/**` (`auth.md` and `auth.feature` cannot coexist) and becomes the suite tag `@auth`.
- Tags as in Gherkin: a line `@smoke @JIRA-1` right above the `##` / `###` heading; no other tag format.
- Suite tags hold for all its tests (layer; `@all-devices`, `@slow` only if true for every test); a test carries its exceptions. Order: layer → `@all-devices` → special tags → own tags.
- A Markdown table under a `###` heading makes the case parametrized: `<column>` placeholders in title/steps, one test per row; the title needs a unique-valued placeholder.
- Optional bracket IDs `## [TS01] …`, `### [TC01-01] …` stay in test titles; case IDs are unique within a spec, `[]` is an empty ID.
- English only; titles are human-readable actions/outcomes, no articles where avoidable, quotes for literal UI text (`Click "Signup" Button`).

## Layers

- Every test has exactly one layer tag `@api`, `@ui` or `@e2e`: on the suite, overridden by a case (Rule, Examples) tag. No layer or two on one level stops the run.
- `@auto` / `@cyborg` are set by the Director - specs never write them.
- UI / E2E tests run on desktop browsers; `@all-devices` on any level adds tablets and mobiles (never on `@api`).

## Generated tests

- Every run generates `.director/tests/<spec path>.test.ts` (gitignored) from the spec and the step definitions `src/steps/**/*.steps.ts`; never edit them, change the spec or the steps.
- A step with a definition → `autoStep`; without one, or with one without code (empty body or comments only, `// TODO` or not) → `manualStep` walked by a person.
- Any manual step → the test is `@cyborg` (UI/E2E only; an `@api` test stays `test.fixme`); all steps automated → `@auto`. A manual Background step makes every test under it cyborg.
- Steps: `Given/When/Then/Step` from `./bdd`, fixtures destructured in the first parameter; Markdown steps have no keyword (`Step(…)`); `/` and `( )` in Cucumber Expressions need escaping for literal text. Different wordings share code by passing one step function to another definition.
- Hooks, step context, special tags: `docs/step-definitions.md`. New steps go to step files with fixtures; World style and Page Object decorators are for migrated suites only (examples: `contact-us.steps.ts`, `ProductsPage`). `autoStep` is for generated tests only.

## Workflow

- `npm run dress` (changes no spec, step or test): invalid specs, missing layers, ambiguous steps (errors); tests and runs per spec and project; steps a person walks by test; disabled tests and known bugs; unused definitions. Same report in `test-results/dress-rehearsal.md`.
- `npm run steps <suite>` appends skeletons for steps without definition to `src/steps/<suite>.steps.ts`; implement them with Page Objects / clients.
- Changing what a test checks starts in the spec; step definitions follow. Never reword a spec just to match an existing definition when the meaning differs.
