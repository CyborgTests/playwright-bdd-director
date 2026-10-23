# Playwright BDD Director — AI Agent Instructions

Cross-tool source of truth for AI agents (Claude Code, Codex, Cursor, Devin). `CLAUDE.md` only imports this file — edit core instructions here.
Path-scoped conventions live in `.claude/rules/`, procedures in `.agents/skills/` (bridged to `.claude/skills/`), browser personas in `.claude/agents/`, automated guards in `scripts/hooks/` (single dispatcher).

## What this repo is

Markdown-driven testing framework on top of the native Playwright runner. `test-suites/*.md` is the source of truth; the Director keeps cyborg (human-in-the-loop, `@cyborgtests/test`) and automated tests in sync with it. Three layers share the repo:

- **Framework** — `src/framework/**` + `scripts/*.ts`: parse MD/TS (ts-morph), validate, generate, auto-fix, archive. Unit-tested with Vitest in `tests/unit/**`.
- **Director UI** — `packages/director/**` (React + Vite), embedded into Playwright UI through `scripts/patch-playwright.js` (postinstall) and forked Playwright packages in `packages/*`.
- **Example test layer** — `auth` suite against automationexercise.com: `src/{pages,fixtures,clients,schemas,test-constants,test-helpers,test-utils}`, `tests/{automated,cyborg}`.

## Stack

- TypeScript strict, alias `@/*` → `src/*`; Node ≥ 18, scripts run via `tsx`.
- Playwright pinned to `1.60.0` — the patch and the forks depend on the exact version.
- Vitest, ts-morph, Monocart reporter, ESLint + Prettier + `simple-import-sort`.

## Commands

```bash
npm run stage                        # validate → generate → auto-fix → archive → format → lint (writes files)
npm run dress                        # read-only MD ↔ TS sync check
npm run play <types...> [suites...] [@tags...]  # dress + run; types: auto|cyborg|api|ui|e2e|bdd, e.g. `npm run play api auth @smoke`
npm run autogen [-- --dry-run]       # AUTO skeletons into tests/automated/todo for MDs without automation
npm run matrix [-- --html --json --md --min=80]  # spec ↔ tests coverage matrix (static, no run)
npm run ci                           # CI: dress → automated tests → matrix (CI_MIN_COVERAGE=80 optional)
npm run show | review                # Playwright UI mode with Director | Monocart report
npm run test:run                     # Vitest unit tests (framework)
npm run build                        # Director UI + trace-viewer, then re-patch Playwright
node scripts/spec-drift-audit.js     # AI specification integrity
```

Selection works only through tags (`--grep`) — `play` builds the pattern and `playwright.config.ts` picks the `automated`/`cyborg` project from it.

## Boundaries

- `test-suites/*.md` — source of truth. Change behavior/wording here, never only in tests.
- `tests/cyborg/**` titles and steps, and empty skeletons in `tests/automated/todo/**`, are rewritten by `stage`. Step bodies (fixture calls, `manualStep`) are hand-written.
- `src/test-constants/tags.ts` → `TAG.SUITE` is filled by `stage` from MD file names.
- `tests/archived/**` — orphans moved there by `stage`; never runs, don't edit.
- `node_modules/**` — never edit (blocked by hook); the Playwright patch lives in `scripts/patch-playwright.js`.
- `packages/{playwright,playwright-core,trace-viewer,web,…}` — forked Playwright: change only for Director integration, keep diffs minimal, rebuild with `npm run build`.

## Definition of done

- Framework code changed → `npm run test:run` green; new behavior covered by a unit test.
- Specs/tests changed → `npm run dress` clean; affected tests green on the first attempt.
- Always → `npm run lint` and `npx tsc --noEmit` clean (both green on main; `packages/` has its own toolchain). Report failures as they are.

## Language

Code, comments, tests and `test-suites/*.md`: English only (non-English allowed as i18n test data). Local notes in `.local-docs/` (gitignored, never committed) may use any language.

## Communication style

- Short: 1–3 sentences or bullets, no filler; point to spec files instead of restating them.
- Clarifying questions: the minimum, in one block.

## Specification index

- Rules (`.claude/rules/`): `ai-spec-architecture`, `ai-spec-formats`, `typescript`, `playwright-tests`, `api-testing`, `md-specs`, `framework-code`.
- Key skills: `md-driven-suites`, `md-to-automated`, `add-test`, `run-tests`, `framework-change`, `pw-triager`, `ui-explorer`, `senior-aqa-reviewer` (run before handing off test code).

## Operational restrictions

- No `git commit`, `push`, history rewrite or staging without explicit user approval (hook asks).
- No `Co-Authored-By` lines or other AI-attribution metadata in commits.

## Specification changes

Use the `spec-sync` skill. This file has a hard 100-line budget (hook + `scripts/spec-drift-audit.js`); growth is a trade — move details to a rule or skill.
