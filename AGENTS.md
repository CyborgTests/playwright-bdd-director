# Playwright BDD Director — AI Agent Instructions

Cross-tool source of truth for AI agents (Claude Code, Codex, Cursor, Devin). `CLAUDE.md` only imports this file — edit core instructions here.
Path-scoped conventions live in `.claude/rules/`, procedures in `.agents/skills/` (bridged to `.claude/skills/`), browser personas in `.claude/agents/`, automated guards in `scripts/hooks/` (single dispatcher).

## What this repo is

Spec-driven testing framework on top of the native Playwright runner. Specs in `test-suites/` (`*.md` or Gherkin `*.feature`) are the source of truth; every run generates their tests from step definitions (`src/steps/`).
A step with a definition is `autoStep`; a step without one (or with one without code) is `manualStep`, walked by a person (`@cyborgtests/test`).
A test with any manual step is `@cyborg` (UI/E2E only; API stays fixme), else `@auto`.

Three layers share the repo:

- **Framework** — `src/framework/**` + `scripts/*.ts`: parse specs, generate tests, step registry and runtime, coverage matrix, reports. Unit-tested with Vitest next to the modules (`*.test.ts`).
- **Director UI** — `packages/director/**` (React + Vite), embedded into Playwright UI through `scripts/patch-playwright.js` (postinstall) and forked Playwright packages in `packages/*`.
- **Example test layer** — `auth`, `auth-api`, `products-api`, `navigation`, `cart`, `products`, `contact-us` specs against automationexercise.com (README "Working Example" maps them to features): `src/{steps,pages,fixtures,clients,schemas,test-helpers,test-utils}`.

## Stack

- TypeScript strict, alias `@/*` → `src/*`; Node ≥ 18, scripts run via `tsx`.
- Playwright pinned to `1.60.0` — the patch and the forks depend on the exact version.
- Vitest, Cucumber Expressions / Gherkin parser, Monocart reporter, ESLint + Prettier + `simple-import-sort`.

## Commands

```bash
npm run dress                        # errors, runs per spec/project, steps a person walks, disabled tests (+ test-results/dress-rehearsal.md)
npm run steps <suite...>             # step definition skeletons into src/steps/<suite>.steps.ts
npm run stage                        # format Markdown specs (`---` before every ###)
npm run play <types...> [suites...] [@tags...] [devices...]  # types: auto|cyborg|api|ui|e2e; devices: chrome|firefox|tablet|mobile
npm run matrix [-- --html --json --md --min=80]  # coverage matrix: layer, auto/cyborg/fixme, automated steps
npm run ci                           # CI: dress → automated tests → matrix (CI_MIN_COVERAGE=80 optional)
npm run show | review                # Playwright UI mode with Director | Monocart report
npm run test:run                     # Vitest unit tests (framework)
npm run build                        # Director UI + trace-viewer, then re-patch Playwright
node scripts/spec-drift-audit.js     # AI specification integrity
```

Tests are generated into `.director/tests/` (gitignored) whenever `playwright.config.ts` loads; projects select them by tag: `api`, one per device (`chrome`, `firefox`; `tablet`, `mobile` for `@all-devices`), `cyborg`; `play` builds the `--grep`.

## Boundaries

- `test-suites/**/*.{md,feature}` — source of truth. Every test case has one layer tag (`@api`/`@ui`/`@e2e`, case overrides suite); never write `@auto`/`@cyborg`.
- `src/steps/**/*.steps.ts` — step definitions; a body without code keeps its step manual.
- `.director/tests/**` — generated on every run, never edit (blocked by hook).
- `node_modules/**` — never edit (blocked by hook); the Playwright patch lives in `scripts/patch-playwright.js`.
- `packages/{playwright,playwright-core,trace-viewer,web,…}` — forked Playwright: change only for Director integration, keep diffs minimal, rebuild with `npm run build`.

## Definition of done

- Framework code changed → `npm run test:run` green; new behavior covered by a unit test.
- Specs/steps changed → `npm run dress` without errors; affected tests green on the first attempt.
- Always → `npm run lint` and `npx tsc --noEmit` clean (both green on main; `packages/` has its own toolchain). Report failures as they are.

## Language

Code, comments, tests and `test-suites/*.md`: English only (non-English allowed as i18n test data). Local notes in `.local-docs/` (gitignored, never committed) may use any language.

## Communication style

- Short: 1–3 sentences or bullets, no filler; point to spec files instead of restating them.
- Clarifying questions: the minimum, in one block.

## Specification index

- Rules (`.claude/rules/`): `ai-spec-architecture`, `ai-spec-formats`, `typescript`, `playwright-tests`, `api-testing`, `md-specs`, `framework-code`.
- Key skills: `md-driven-suites`, `md-to-automated`, `run-tests`, `framework-change`, `pw-triager`, `ui-explorer`, `senior-aqa-reviewer` (run before handing off step definitions or test code).

## Operational restrictions

- No `git commit`, `push`, history rewrite or staging without explicit user approval (hook asks).
- No `Co-Authored-By` lines or other AI-attribution metadata in commits.

## Specification changes

Use the `spec-sync` skill. This file has a hard 100-line budget (hook + `scripts/spec-drift-audit.js`); growth is a trade — move details to a rule or skill.
