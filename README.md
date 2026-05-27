# 📜 Script Stage: Write the Script, We'll Play the Show

You write the script in Markdown. The Director stages it - validates structure, generates test skeletons and keeps manual, automated, and hybrid tests performing the same script.

**One source of truth. No improvisation. Pure theater.**

## 🚀 Quick Start

### 1. Install Node.js

1. Open [Node.js Downloads](https://nodejs.org/en/download) in browser
2. Select your operating system and CPU architecture
3. Download the suggested version
4. Run the downloaded installer and follow the installation steps
5. Open a terminal and verify that Node.js was installed successfully

```bash
node --version
```

### 2. Download Script Stage

Clone with Git:

1. Open a terminal in the folder where you want to clone the repository
2. Run the commands below:

```bash
git clone https://github.com/AnPo73/script-stage
cd script-stage
```

or download ZIP:

1. Open the repository page on GitHub
2. Click **Code**
3. Click **Download ZIP**
4. Extract the archive to any folder
5. Open a terminal in the extracted folder

### 3. Install dependencies

```bash
npm install
```

### 4. Install Playwright browsers

```bash
npx playwright install
```

### 5. Create your first Markdown test suite

1. Open the `test-suites` folder inside the project
2. Create a file named `login.md`
3. Paste the following content into the file:

```markdown
## [] Login Tests

### User can login

#### Navigate to login page

#### Enter credentials

#### Click login button

#### Verify dashboard visible
```

### 6. Prepare your test suite for execution

This command validates structure, generates test files, and keeps everything in sync:

```bash
npm run stage
```

### 7. Run tests

Choose one of two ways - they are alternatives, not sequential steps:

**Option A - Visual UI** (recommended for most users):

```bash
npm run show
```

Opens the Playwright UI where you can browse all tests, filter by project (`manual`, `automated`, `hybrid`) or by name, and run any subset with a click. Results appear inline with step details and screenshots.

**Option B - Terminal CLI** (for engineers, CI pipelines, or faster runs without UI overhead):

```bash
npm run play manual              # all manual tests
npm run play auto                # all automated tests
npm run play hybrid              # all hybrid tests
npm run play api                 # all API tests
npm run play api auth            # API tests for auth suite only
npm run play api ui auth         # API + UI tests for auth suite
npm run play manual hybrid auth  # manual + hybrid auth tests
npm run play auth                # all auth tests regardless of type
```

Both options automatically run validation before executing tests.

### 8. View test results

After tests finish, close the Playwright UI window - the terminal will become available again. Then open the HTML report:

```bash
npm run review
```

**For manual and hybrid tests:** the Cyborgtests panel opens automatically during the run. Complete each step by clicking pass/fail/skip - the panel closes on its own when done. Then close the Playwright UI window and run `npm run review`.

## ⚡ Markdown-Driven Testing Platform

Script Stage is powered by Playwright and Cyborgtests.

It combines:

- Playwright for automated E2E, UI, and API testing
- Cyborgtests for manual and hybrid testing
- Markdown as the single source of truth

The same Markdown spec keeps manual, automated, and hybrid test files synchronized.

## 💡 Why Markdown-First Testing?

### 1. Readable beyond engineering

Manual QA, managers, and non-technical stakeholders can review and update test specifications without touching TypeScript.

### 2. One spec file, multiple test implementations

The Markdown file is the **specification** - it defines what needs to be tested. Based on it, Script Stage generates and keeps in sync:

- **Manual test files** - ready to run immediately via Cyborgtests
- **Automated test skeletons** - structure generated, logic implemented by you
- **Hybrid test files** - mix of automation and manual checkpoints

The MD file does not run tests - it keeps all implementations synchronized. When you change the spec, `npm run stage` propagates those changes across all test files automatically.

### 3. Works without automation

Script Stage already provides value for manual testing - automation can be added later if needed.

### 4. Built for Playwright

When automation is needed, the same Markdown structure scales naturally to Playwright E2E, UI, and API testing with full TypeScript support.

## 🤖 AI-Friendly by Design

Script Stage is designed to work naturally with AI coding assistants (GitHub Copilot, Cursor, Claude Code, etc.) inside your IDE.

The key advantage: **spec files and test files live in the same repository**. An AI assistant sees both at once - it can read `auth.md` and immediately understand what `auth.api.test.ts` is supposed to do, without any context switching.

This unlocks a practical workflow:

- **Write test cases with AI** - describe a feature, ask AI to generate the MD spec, run `npm run stage` to validate and generate test skeletons
- **Implement tests with AI** - AI reads the spec and the skeleton side by side, fills in the Playwright logic with full context
- **Review coverage with AI** - point AI at `test-suites/` and ask what scenarios are missing or which edge cases are not covered
- **Propagate spec changes with AI** - update the MD file with AI assistance, run `npm run stage`, and structural changes sync across all test files automatically

**Example workflow in Cursor or Copilot:**

```text
1. Ask AI to write test cases → saved directly to test-suites/auth.md
2. npm run stage → framework validates + generates test skeletons
3. Ask AI to implement steps → AI reads spec + skeleton, fills in the logic
4. npm run play auto → run tests
```

## 📐 Script Stage vs Cucumber vs Pure Playwright

| Feature            | Cucumber + PW | Pure Playwright | **Script Stage** |
| ------------------ | ------------- | --------------- | ---------------- |
| Main Runner        | Cucumber      | Playwright      | **Playwright**   |
| Native PW Features | Partial       | Full            | **Full**         |
| TypeScript Support | Medium        | Excellent       | **Excellent**    |
| Debugging          | Harder        | Excellent       | **Excellent**    |
| Readability        | High          | Medium          | **High**         |
| AI Friendliness    | Medium        | High            | **Very High**    |
| Runtime Complexity | High          | Low             | **Low**          |
| Performance        | Medium        | High            | **High**         |
| Maintenance Cost   | High          | Low             | Medium           |
| Flexibility        | Medium        | High            | **Very High**    |

**Script Stage** is a modern middle-ground:

- Keeps **readable human-friendly scenarios** like Cucumber
- Keeps **native Playwright runner** with full TypeScript support
- Removes Cucumber pain points: regex step matching, runtime complexity, shared context chaos, heavy abstraction layers
- Adds **AI-native workflow** on top

Best for: modern Playwright projects, AI-assisted automation, teams that want readable scenarios without Cucumber complexity.

## 👨‍💻 Commercial Automation Support

Need a full Playwright E2E/API automation ecosystem on top of Script Stage?

Commercial integration and automation services are available from the author:

- **[LinkedIn - Andrii Pohanovskyi](https://linkedin.com/in/andrii-pohanovskyi)**
- **[Email - poganovsky@gmail.com](mailto:poganovsky@gmail.com)**

## 🎯 Core Idea

**1 Markdown file = 1 test suite**  
**Multiple implementations = always synchronized**

The Director (`npm run stage`):

1. Auto-fixes MD formatting issues
2. Validates structure (duplicates, MD hierarchy, global IDs)
3. Generates missing test skeletons (manual + auto)
4. Archives orphaned tests (manual + empty auto)
5. Auto-fixes manual tests to match Markdown
6. Auto-fixes empty automated test skeletons (structure only, no logic yet)
7. Formats and lints test files

The Dress Rehearsal (`npm run dress`):

- Validates existing tests without modification
- Checks MD ↔ TS synchronization
- Reports all mismatches

```text
┌──────────────────────────┐
│  auth.md                 │  ← Single Source of Truth
│  ## [TS01] Auth Tests    │
│  ### [TC01-01] Register  │
│  #### Navigate           │
│  #### Fill form          │
│  #### Verify success     │
└────────────┬─────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
Manual Tests      Auto Skeletons
(auto-fixed)      (fill in logic)
    │                 │
    └─────────┬───────┘
              ▼
        Validation
     (tags, IDs, sync)
```

## 📝 MD Format

### 1. Structure

```text
## Test Suite Title

### Test Case title

#### Step Title

- Optional details
  - Test data
  - Expected results

#### Another Step
```

### 2. Hierarchy

```text
## → Test Suite
### → Test Case
#### → Test Step
Lists (-) → Comments (ignored by validator)
```

### 3. IDs - Optional but Powerful

IDs are optional. Tests work without them (validator matches by full titles).

**Why use IDs:**

- **Multiple implementations** - generate multiple tests from a single MD case
- **Stable matching** - titles can change, IDs remain constant
- **Avoid duplicates** - Markdown linters allow duplicate titles when IDs differ

**Suffix Support - Multiple Implementations:**

With IDs, you can create multiple test types for one MD test case. Suffix after ID is ignored during validation, allowing manual, auto, and hybrid implementations to match the same MD test case.

**ID Format (brackets only):**

✅ `### [TC01-01] Test Case title` - ID extracted, suffix support enabled  
✅ `### [] Test Case title` - empty ID, suffix-only support  
❌ `### TC01-01: Test Case title` - no ID, validates by full title  
❌ `### TC01-01 - Test Case title` - no ID, validates by full title

**Empty ID - Suffix Only:**

Use empty brackets `[]` when you only need suffixes to distinguish implementations:

```typescript
// One MD test case: ### [] User Registration

test('[MANUAL] User Registration', ...)  // Manual implementation (no dash)
test('[AUTO] User Registration', ...)    // Automated implementation (no dash)
test('[HYBRID] User Registration', ...)  // Hybrid implementation (no dash)
```

All three match `[]` from MD. Useful when you don't need numbered IDs, just implementation types.

**Without IDs:**

```markdown
### User Registration
```

Must match exactly in test file - no suffix support, no multiple implementations.

## ✅ Validation

### 1. What Validator Checks

```bash
npm run stage    # validate → generate → auto-fix → archive → format → lint
```

**Note:** Dress rehearsal (`npm run dress`) runs automatically before test execution to ensure synchronization.

Validator verifies:

1. **No duplicate MD base names** (e.g., two files named `auth.md`)
2. **Valid MD structure** (proper headings hierarchy, required sections)
3. **No duplicate IDs/titles** across all MD files (globally unique)
4. **MD ↔ TS synchronization** for each test file:
   - Suite title matches
   - Test case count and titles match
   - Step count and titles match per test case
   - IDs match (strict: MD is source of truth)
   - Tags match file type and basename

### 2. ID Validation Rules (Strict)

**MD is the source of truth:**

- If MD has ID → TS **must** have matching ID (error if missing)
- If MD has no ID → TS **must not** have ID (error if present)

**Brackets format with suffix support:**

Non-empty ID with dash before suffix:

- MD: `[TC01-01]` → Test: `[TC01-01]` ✅
- MD: `[TC01-01]` → Test: `[TC01-01-MANUAL]` ✅ (suffix with dash)
- MD: `[TC01-01]` → Test: `[TC01-01-AUTO]` ✅ (suffix with dash)
- MD: `[TC01-01]` → Test: `[TC01-02]` ❌ (different ID)
- MD: `[TC01-01]` → Test: no ID ❌ (missing ID)

Empty ID with suffix only (no dash):

- MD: `[]` → Test: `[MANUAL]` ✅ (suffix only, no dash)
- MD: `[]` → Test: `[AUTO]` ✅ (suffix only, no dash)
- MD: `[]` → Test: `[HYBRID]` ✅ (suffix only, no dash)
- MD: `[]` → Test: `[-MANUAL]` ❌ (dash not allowed with empty ID)
- MD: `[]` → Test: no ID ❌ (missing ID)

No ID:

- MD: no ID → Test: `[TC01-01]` ❌ (unexpected ID)

**Other formats** (`TC-001:`):

- Not recognized as IDs
- Validates full title only
- No suffix support

### 3. What Stage Auto-Fixes

**Automatically fixed:**

- MD formatting issues (trailing spaces, extra blank lines)
- Manual test structure (suite/test case/step titles)
- Missing test files (generates skeletons for manual + auto)

**Must fix manually:**

- Tags (file type, suite tags from basename)
- IDs (add/remove to match MD)
- Duplicate IDs/titles across MD files

### 4. Orphaned Test Archiving

When MD file is deleted:

- **Manual tests** → archived to `tests/archived/` (preserves valuable manual work)
- **Empty automated tests** (API, UI, E2E, AUTO) → archived (no implementation to lose)
- **Implemented automated tests** → left in place (can continue running)

Archive location: `tests/archived/<filename>`.

### 5. Multiple Implementations

**With non-empty ID (dash before suffix):**

```typescript
// MD: ### [TC01-01] User Registration
test('[TC01-01-MANUAL] User Registration', ...)  // ✅ Matches [TC01-01]
test('[TC01-01-AUTO] User Registration', ...)    // ✅ Matches [TC01-01]
test('[TC01-01-HYBRID] User Registration', ...)  // ✅ Matches [TC01-01]
```

**With empty ID (suffix only, no dash):**

```typescript
// MD: ### [] User Registration
test('[MANUAL] User Registration', ...)  // ✅ Matches []
test('[AUTO] User Registration', ...)    // ✅ Matches []
test('[HYBRID] User Registration', ...)  // ✅ Matches []
```

Validator checks each `test()` separately against MD. Same file or different files - both are valid.

## 📁 Project Structure

```text
script-stage/
├── test-suites/           # Markdown test suites (source of truth)
│   └── *.md               # Test specifications
├── tests/                 # Test implementations
│   ├── automated/         # Fully automated tests (API, UI, E2E)
│   │   ├── api/           # API tests
│   │   ├── ui/            # UI tests
│   │   └── e2e/           # E2E tests
│   ├── hybrid/            # Hybrid tests
│   └── archived/          # Orphaned tests (auto-created)
├── src/
│   ├── framework/         # Core framework code
│   │   ├── core/          # Parsers (md-parser, ts-parser, file-matcher)
│   │   ├── validation/    # Validators (sync-validator, md-validator, reporter)
│   │   ├── generation/    # Generators (test-generator, auto-fixer, test-archiver, tags-updater)
│   │   ├── reporting/     # Metrics and formatters (metrics, console-formatter)
│   │   ├── constants/     # Framework constants (markdown, test-files)
│   │   ├── errors/        # Error builders
│   │   ├── utils/         # Helpers (helpers, icons, ts-morph-helpers)
│   │   └── config.ts      # Framework configuration (env-overridable paths)
│   ├── clients/           # API clients (BaseClient, AuthClient)
│   ├── fixtures/          # Playwright fixtures (base, auth)
│   ├── pages/             # Page objects (BasePage, LoginPage, HomePage, SignupPage)
│   ├── schemas/           # API response schemas and types
│   ├── test-constants/    # Test tags
│   ├── test-helpers/      # Test-specific helpers (sanitize, playwright helpers)
│   └── test-utils/        # General test utilities (APIExpect, logger, schema-validator)
├── scripts/               # CLI tools
│   ├── play.ts            # Play CLI
│   ├── dress-rehearsal.ts # Validation script
│   └── md-ts-director.ts  # Staging pipeline
└── tests/
    └── unit/              # Framework unit tests (290+ tests)
```

## 📚 Working Example

Repository includes a complete authentication example demonstrating:

- `test-suites/auth.md` - test cases with IDs for API and UI flows
- `tests/automated/api/auth.api.test.ts` - automated API tests
- `tests/automated/ui/auth.ui.test.ts` - automated UI tests
- `tests/hybrid/auth.hybrid.test.ts` - automated actions + manual verification

All validate against the **same** `auth.md` - this demonstrates the framework.

**Run example:**

```bash
npm run stage             # Stage: validate → generate → auto-fix → archive → format → lint

# All tests (via Play CLI)
npm run play manual       # Play all manual tests (headed, workers=1)
npm run play auto         # Play all automated tests (headless, parallel)
npm run play api auth     # Play API auth tests only
npm run play ui auth      # Play UI auth tests only
npm run play hybrid       # Play all hybrid tests (headed, workers=1)
npm run show              # Open Playwright UI mode (visual runner)
```

**Note:** Play CLI automatically runs dress rehearsal (validation) before executing tests.

## ⚙️ Configuration

### 1. File Naming

- **MD:** `<name>.md` (e.g., `auth.md`) in `test-suites/`
- **Test:** `<name>.<TYPE>.test.ts` (framework extracts base name before first dot)
- **Examples:**
  - `auth.manual.test.ts` → `auth.md` ✅
  - `auth.api.test.ts` → `auth.md` ✅
  - `auth.ui.test.ts` → `auth.md` ✅
  - `auth.hybrid.test.ts` → `auth.md` ✅

**Base name extraction:** Uses `getTestFileBaseName()` helper (`fileName.split('.')[0]`).

**Important:**

- `test-suites/` - only Markdown files
- `tests/` - only test files (no helpers/utils)
- `tests/archived/` - orphaned tests (auto-created by Director)

### 2. Environment Variables

All paths support environment variable overrides via `src/framework/config.ts`:

| Variable             | Default          | Description                     |
| -------------------- | ---------------- | ------------------------------- |
| `TEST_SUITES_DIR`    | `test-suites`    | Markdown test suites directory  |
| `TESTS_DIR`          | `tests`          | Root tests directory            |
| `TESTS_AUTO_DIR`     | `tests/todo`     | Generated auto test skeletons   |
| `TESTS_MANUAL_DIR`   | `tests/manual`   | Generated manual test skeletons |
| `TESTS_ARCHIVED_DIR` | `tests/archived` | Archived orphaned tests         |
| `METRICS_ENABLED`    | `false`          | Enable metrics JSON output      |
| `METRICS_FILE`       | `.metrics.json`  | Metrics output file path        |

### 3. Playwright Config

**Projects** (`playwright.config.ts`):

- `automated` - headless, parallel, trace + screenshot on failure
- `hybrid` - headless: false, workers: 1
- `manual` - headless: false, workers: 1

Projects are selected dynamically based on the `--grep` tag argument.

### 4. Path Aliases

TypeScript path mapping configured in `tsconfig.json`:

```typescript
import { TAG } from '@/test-constants/tags'
import { AuthClient } from '@/clients/AuthClient'
```

`@/*` → `src/*` (use in tests, scripts, and framework code)

## 🧪 Development & Testing

### Unit Tests

The framework includes comprehensive unit tests for core components:

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once (CI mode)
npm run test:ui       # Open visual test UI
npm run test:coverage # Generate coverage report
```

**Test Coverage:**

- `md-parser.ts` - Markdown parsing logic
- `ts-parser.ts` - TypeScript AST parsing
- `file-matcher.ts` - MD ↔ TS validation
- `auto-fixer.ts` - Auto-fix logic
- `error-builders.ts` - Error message builders
- `icons.ts` - Console icons
- `sync-validator.ts` - Validation orchestration
- `tags-updater.ts` - Tag management

**Coverage Stats:**

- 290+ unit tests across 11 test files
- Critical modules: 90%+ coverage

### Play CLI

Unified command interface with built-in validation. Types and suites are freely combinable - specify any number of test types followed by any number of suite names:

```bash
npm run play <types...> [suites...]

# Single type
npm run play auto                   # All automated tests
npm run play manual                 # All manual tests
npm run play api                    # All API tests
npm run play hybrid                 # All hybrid tests

# Type + suite
npm run play manual auth            # Manual auth tests only
npm run play api auth               # API auth tests only
npm run play ui auth                # UI auth tests only

# Multiple types
npm run play api ui                 # All API + UI tests
npm run play manual hybrid          # All manual + hybrid tests

# Multiple types + suite
npm run play api ui auth            # API + UI tests for auth suite
npm run play manual hybrid auth     # Manual + hybrid auth tests

# Suite only (no type filter)
npm run play auth                   # All auth tests (any type)
npm run play auth todo              # All auth + todo tests (any type)
```

**Supported test types:** `auto`, `manual`, `hybrid`, `api`, `ui`, `e2e`

**Features:**

- Automatic dress rehearsal before tests
- Freely combinable types and suites
- Argument order validation (types before suites)
- Clean console output
- Sequential execution for manual/hybrid tests
- Help command: `npm run play -- --help`

**Console Output:**

```bash
✨  Running dress rehearsal...
✅  Validation passed

[Playwright test output]

✅  Curtain call!
```

### Staging Pipeline

The Director stages your tests with detailed feedback:

```bash
npm run stage
```

**Output:**

```bash
✨  Director staging the play...

🔧  Fixed formatting: test-suites/auth.md
✅  Generated: tests/manual/login.manual.test.ts
🔧  Auto-fixed: tests/manual/auth.manual.test.ts
    Test suite title: "[TS01] Old Title" → "[TS01] Authentication Tests"

📊  Director Metrics:
    Total files: 1
    Valid: 4, Invalid: 0

    Phases:
    • MD Formatting: 0/1 fixed (20ms)
    • Validation: 130ms
    • Generation: 1 manual, 0 auto (5ms)
    • Archiving: 0 manual, 0 auto (32ms)
    • Auto-fix: 0 manual, 0 auto (11ms)
    • Format & Lint: 4773ms

    Total execution: 4983ms

✅  Stage is set! 4 file(s) ready.
```

### Development Commands

```bash
npm run stage        # Full staging pipeline
npm run dress        # Validation only (no changes)
npm run show         # Open Playwright UI mode (visual, interactive runner)
npm run lint:fix     # ESLint fix
npm run format       # Prettier format
```

## 🔧 Framework Core

### 1. Director (`scripts/md-ts-director.ts`)

Full staging pipeline (7 phases):

1. **Fix MD formatting** - auto-corrects spacing, blank lines
2. **Validate (critical errors)** - checks duplicates, MD structure, global IDs
3. **Generate missing tests** - creates skeletons for manual + auto
4. **Archive orphaned tests** - moves manual + empty auto/api/ui/e2e tests to `tests/archived/` when MD is deleted
5. **Auto-fix manual tests** - syncs structure with MD
6. **Auto-fix empty automated tests** - updates auto tests without implementation (all steps are TODO/empty)
7. **Format and lint** - runs Prettier + ESLint before final validation

### 2. Core Components

**Parsers (`src/framework/core/`):**

- `md-parser.ts` - extracts structure from Markdown (headings, IDs); includes file cache and path traversal protection
- `ts-parser.ts` - extracts structure from TypeScript via AST (ts-morph)
- `file-matcher.ts` - compares individual MD ↔ TS files; validates tags, IDs, titles, steps

**Validators (`src/framework/validation/`):**

- `sync-validator.ts` - orchestrates 4-step validation (duplicates → structure → global IDs → MD-TS sync)
- `md-validator.ts` - validates MD structure hierarchy; auto-fixes formatting
- `reporter.ts` - formats and displays validation errors with actionable fix hints

**Generators (`src/framework/generation/`):**

- `test-generator.ts` - generates missing manual/auto test skeletons
- `auto-fixer.ts` - AST-based auto-fix of test structure to match MD; preserves `-AUTO`/`-MANUAL` suffixes
- `test-archiver.ts` - archives orphaned tests; detects all automated kinds (AUTO, API, UI, E2E)
- `tags-updater.ts` - adds new suite tags to `src/test-constants/tags.ts`

**Reporting (`src/framework/reporting/`):**

- `metrics.ts` - collects and formats staging metrics per phase
- `console-formatter.ts` - unified error group output with separators

**Utils (`src/framework/utils/`):**

- `helpers.ts` - `getTestFileBaseName`, `matchIDWithSuffix`, `hasAutomatedTestFile`, etc.
- `icons.ts` - emoji icons for console output
- `ts-morph-helpers.ts` - shared AST utilities (singleton Project, findDescribeCall, findTestCalls, findStepCalls)

**Test Utilities (`src/test-utils/`):**

- `APIExpect` - Playwright `APIResponse` wrapper with status, schema, and field assertions; lazy response parsing with caching
- `logger.ts` - attaches logs and files to Playwright test reports
- `schema-validator.ts` - lightweight Joi-like schema validator for API response validation; validates only required fields, zero runtime dependencies

**Test Helpers (`src/test-helpers/`):**

- `test.helpers.ts` - `sanitizeObject` for masking sensitive data (emails, passwords, tokens) in logs and reports; partial email masking preserves debuggability
- `playwright.helpers.ts` - `getProjectsFromGrep` for dynamic project selection based on `--grep` tags
- `object.helpers.ts` - `getNestedField` for safe deep property access

### 3. Supported Patterns

Handles:

- `test.describe()`, `test.describe.skip()`, custom fixture describes (`authTest.describe()`)
- `test()`, `test.only()`, `test.skip()`, `test.fixme()`
- `test.step()` and `manualStep()` (hybrid tests)
- ID suffix extraction (`[TC01-01-MANUAL]` matches `[TC01-01]`)
- Multiple implementations per MD test case (manual + auto + hybrid)
- Escape sequences in titles

## 🎓 Philosophy

### 1. MD is the source of truth

- **MD defines:** structure, titles, IDs, test case count
- **TS implements:** how to execute (manual/auto/hybrid)
- **Director ensures:** TS always follows MD (auto-fix for manual tests)
- **Validation is strict:** if MD has ID → TS must have it; if MD has no ID → TS must not have it

### 2. MD = what to test, code = how to test

- MD shows test structure (high-level, readable by anyone)
- Code shows implementation (details)
- Validator keeps them synchronized
- Auto-fixer updates manual tests automatically
- Manual work preserved via archiving

### 3. One MD file = One Test Suite

- Multiple test cases per file
- Multiple implementations per test case (manual, api, ui, e2e, hybrid)
- Logical grouping by feature/functionality

## 📊 Reports

### 1. View test results

```bash
npm run review    # Open Monocart HTML report (after test run)
npm run show      # Open Playwright UI mode (before/during test run)
```

### 2. Report includes

- Test execution summary
- Screenshots on failure
- Detailed step-by-step logs

### 3. Centralized Report Storage (Optional)

For teams needing centralized report storage, you can add:

- **[@cyborgtests/reporter-playwright-reports-server](https://www.npmjs.com/package/@cyborgtests/reporter-playwright-reports-server)** - Cyborgtests reporter integration
- **[Playwright Reports Server](https://github.com/CyborgTests/playwright-reports-server)** - Docker-based reports storage

## 📄 License

MIT

See also: `THIRD_PARTY_NOTICES.md` (licenses for dependencies like Cyborgtests and Monocart Reporter).
