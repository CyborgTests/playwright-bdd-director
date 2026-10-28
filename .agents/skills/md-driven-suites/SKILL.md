---
name: md-driven-suites
description: Use when creating, editing, renaming or deleting a spec in test-suites/ (Markdown or Gherkin) — format, layer tags, stage / dress, and which tests run as cyborg.
---

# Spec-Driven Suites

`test-suites/<base>.{md,feature}` + step definitions → tests generated on every run (`.director/tests/`); nothing else to write or sync.

## Before you start

- Rule: `md-specs` (format, layers, tags, IDs). The spec is the source of truth.
- Know the current state: `npm run dress` (changes no spec, step or test).

## Steps

1. **Write or edit the spec**: Markdown `@ui` (layer) above `## Suite`, `### Case`, `#### Step`, details as `- bullets`; or Gherkin with the layer tag above `Feature:`. Reuse the wording of existing steps when the meaning is the same - their definitions apply at once.
   From a Playwright test file built of `test.step`: `npm run migrate <file.spec.ts>` (spec + step file; then dress and run it before deleting the test file).
   Rewording a step everywhere: `npm run reword "<pattern or manual text>" "<new>"` (specs + definition pattern, parameters kept); then check its code still does what the words say.
   Moving a suite to the other format: `npm run adapt <suite>`, never by hand; after `.md` → `.feature` replace every `*` with Given (context) / When (action) / Then (outcome), `And` for repeats.
2. **Format**: `npm run stage` (Markdown spacing, `---` before every `###`).
3. **Check**: `npm run dress`. Fix every error at its source (invalid spec, missing or double layer, ambiguous step) and re-run until no errors. "To automate" lists the steps a person walks, by test.
4. **Run**: steps without definitions make the test cyborg - `npm run play cyborg <base>` (headed, one worker; the user confirms each manual step). Never run cyborg tests unattended.
5. **Automate**: steps without definitions → `md-to-automated` skill.
6. **Rename / delete a spec**: rename with `npm run rename <suite> <new-name>` (its step file follows; fix the hooks it lists, they name the old suite tag), delete the file itself - its generated test follows on the next run; then `npm run dress` for definitions left unused.

Done when: `npm run dress` reports no errors and the expected tests are listed as auto / cyborg.
