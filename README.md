# 📜 Markdown Play: Write the Script, We'll Play the Show

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

### 2. Download Markdown Play

Clone with Git:

1. Open a terminal in the folder where you want to clone the repository
2. Run the commands below:

```bash
git clone https://github.com/AnPo73/markdown-play
cd markdown-play
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
## [TS02] Login Tests

### [TC02-01] User can login

#### Navigate to login page

#### Enter credentials

#### Click login button

#### Verify dashboard visible
```

### 6. Prepare your test suite for execution

This command validates structure, generates test files, and creates npm scripts:

```bash
npm run stage
```

### 7. Run tests

The Play CLI provides a unified interface for running tests with automatic validation:

Run all manual tests:

```bash
npm run play manual
```

Run specific suite (e.g., login):

```bash
npm run play manual login
```

Run automated tests:

```bash
npm run play auto
```

Run hybrid tests:

```bash
npm run play hybrid
```

The Play CLI automatically runs validation (dress rehearsal) before executing tests.

### 8. Complete the test suite

After the Cyborgtests UI panel opens, complete the test suite by clicking step statuses (pass/fail/skip).

### 9. View test results

```bash
npm run review
```

## ⚡ Markdown-Driven Testing Platform

Markdown Play powered by Playwright and Cyborgtests

It combines:

- Playwright for automated E2E and API testing
- Cyborgtests for manual and hybrid testing
- Markdown as the single source of truth

The same Markdown script can drive manual, automated, and hybrid test flows.

## 💡 Why Markdown-First Testing?

### 1. Readable beyond engineering

Manual QA, managers, and non-technical stakeholders can review and update test specifications without touching TypeScript.

### 2. One script, multiple implementations

The same Markdown test suite can drive:

- manual tests
- automated tests
- hybrid tests

All implementations stay synchronized from a single source of truth.

### 3. Works without automation

Markdown Play already provides value for manual testing - automation can be added later if needed.

### 4. Built for Playwright

When automation is needed, the same Markdown structure scales naturally to Playwright E2E and API testing with full TypeScript support.

## 👨‍💻 Commercial Automation Support

Need a full Playwright E2E/API automation ecosystem on top of Markdown Play?

Commercial integration and automation services are available from the author:

- **[LinkedIn - Andrii Pohanovskyi](https://linkedin.com/in/andrii-pohanovskyi)**
- **[Email - pognovsky@gmail.com](mailto:poganovsky@gmail.com)**

## 🎯 Core Idea

**1 Markdown file = 1 test suite**  
**Multiple implementations = always synchronized**

The Director (`npm run stage`):

1. Validates Markdown structure
2. Generates missing test skeletons (manual + auto)
3. Auto-fixes manual tests to match Markdown
4. Auto-fixes empty automated tests (no implementation yet)
5. Archives orphaned tests (manual + empty auto)
6. Validates final synchronization
7. Formats and lints test files

The Dress Rehearsal (`npm run dress`):

- Validates existing tests without modification
- Checks MD ↔ TS synchronization
- Reports all mismatches

```text
┌──────────────────────────┐
│  todo.md                 │  ← Single Source of Truth
│  # [TS01] TodoMVC Tests  │
│  ## [TC01-01] Add todo   │
│  ### Navigate            │
│  ### Add new todo        │
│  ### Verify created      │
└────────────┬─────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
Manual Tests      Auto Tests
(auto-fixed)      (TODO stubs)
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
// One MD test case: ### [] Add todo

test('[MANUAL] Add todo', ...)  // Manual implementation (no dash)
test('[AUTO] Add todo', ...)    // Automated implementation (no dash)
test('[HYBRID] Add todo', ...)  // Hybrid implementation (no dash)
```

All three match `[]` from MD. Useful when you don't need numbered IDs, just implementation types.

**Without IDs:**

```markdown
### Add todo
```

Must match exactly in test file - no suffix support, no multiple implementations.

## ✅ Validation

### 1. What Validator Checks

```bash
npm run stage    # validate → generate → auto-fix → archive → format → lint
```

**Note:** Dress rehearsal (`npm run dress`) runs automatically before test execution to ensure synchronization.

Validator verifies:

1. **No duplicate MD base names** (e.g., two files named `todo.md`)
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

No ID validation:

- MD: no ID → Test: `[TC01-01]` ❌ (unexpected ID)

**Other formats** (`TC-001:`):

- Not recognized as IDs
- Validates full title only
- No suffix support

### 3. What Stage Auto-Fixes

**Automatically fixed:**

- MD formatting issues (trailing spaces, blank lines)
- Manual test structure (suite/test case/step titles and counts)
- Missing test files (generates skeletons for manual + auto)
- Missing npm scripts (creates `play:manual-<basename>` commands for manual tests only)

**Must fix manually:**

- Tags (file type, suite tags from basename)
- IDs (add/remove to match MD)
- Duplicate IDs/titles across MD files

### 4. Orphaned Test Archiving

When MD file is deleted:

- **Manual tests** → archived to `tests/archived/` (preserves valuable manual work)
- **Auto/hybrid tests** → left in place (not archived)
  - Can continue running without corresponding MD file
  - Useful for tests that need single implementation only

Archive location: `tests/archived/<filename>`.

### 5. Multiple Implementations

**With non-empty ID (dash before suffix):**

```typescript
// MD: ### [TC01-01] Add todo
test('[TC01-01-MANUAL] Add todo', ...)  // ✅ Matches [TC01-01]
test('[TC01-01-AUTO] Add todo', ...)    // ✅ Matches [TC01-01]
test('[TC01-01-HYBRID] Add todo', ...)  // ✅ Matches [TC01-01]
```

**With empty ID (suffix only, no dash):**

```typescript
// MD: ### [] Add todo
test('[MANUAL] Add todo', ...)  // ✅ Matches []
test('[AUTO] Add todo', ...)    // ✅ Matches []
test('[HYBRID] Add todo', ...)  // ✅ Matches []
```

Validator checks each `test()` separately against MD. Same file or different files - both are valid.

## 📁 Project Structure

```text
markdown-play/
├── test-suites/           # Markdown test suites (source of truth)
│   └── *.md               # Test specifications
├── tests/                 # Test implementations
│   ├── automated/         # Fully automated tests
│   ├── manual/            # Manual and hybrid tests
│   └── archived/          # Orphaned tests (auto-created)
├── src/
│   ├── framework/         # Core framework code
│   │   ├── core/          # Parsers (MD, TS)
│   │   ├── validation/    # Validators and matchers
│   │   ├── generation/    # Generators and fixers
│   │   ├── reporting/     # Metrics and formatters
│   │   └── utils/         # Helpers and utilities
│   ├── constants/         # Tags and paths
│   └── config/            # Playwright configuration
├── scripts/               # CLI tools
│   ├── play.ts            # Play CLI
│   ├── dress-rehearsal.ts # Validation script
│   └── md-ts-director.ts  # Staging pipeline
├── .local-docs/           # Local documentation (gitignored)
└── coverage/              # Test coverage reports (gitignored)
```

## 📚 Working Example

Repository includes complete TodoMVC example demonstrating:

- `**test-suites/todo.md**` - 5 test cases with IDs and comments
- `**tests/manual/todo.manual.test.ts**` - manual steps + automated `goto()` step
- `**tests/automated/todo.auto.test.ts**` - fully automated
- `**tests/hybrid/todo.hybrid.test.ts**` - automated actions + manual verification

All three validate against **same** `todo.md` - this demonstrates the framework.

**Run example:**

```bash
npm run stage             # Stage: validate → generate → auto-fix → archive → format → lint

# All tests (via Play CLI)
npm run play manual       # Play all manual tests (headed, workers=1)
npm run play auto         # Play all automated tests (headless, parallel)
npm run play hybrid       # Play all hybrid tests (headed, workers=1)

# Suite-specific
npm run play manual todo  # Play only todo manual tests
```

**Note:** Play CLI automatically runs dress rehearsal (validation) before executing tests.

## ⚙️ Configuration

### 1. File Naming

- **MD:** `<name>.md` (e.g., `todo.md`) in `test-suites/`
- **Test:** `<name>.<anything>.ts` (framework extracts base name before first dot)
- **Examples:**
  - `todo.manual.test.ts` → `todo.md` ✅
  - `todo.auto.test.ts` → `todo.md` ✅
  - `todo.hybrid.test.ts` → `todo.md` ✅

**Base name extraction:** Uses `getTestFileBaseName()` helper (`fileName.split('.')[0]`).

**Important:**

- `test-suites/` - only Markdown files
- `tests/` - only test files (no helpers/utils)
- `tests/archived/` - orphaned manual tests (auto-created by Director)

### 2. Playwright Config

**Projects** (`src/config/projects.ts`):

- `manual` - headless: false, timeout: unlimited, workers: 1
- `hybrid` - headless: false, timeout: unlimited, workers: 1
- `automated` - headless: true (default), parallel, trace + video on failure

**Test URL:** Set `baseURL` in `playwright.config.ts` (default: TodoMVC demo)

### 3. Path Aliases

TypeScript path mapping configured in `tsconfig.json`:

```typescript
import { TAG } from '@/constants/tags'
import { TodoPage } from '@/pages/TodoPage'
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

**Coverage Stats:**

- Overall: ~48% lines
- Critical modules: 90%+ coverage
- 210+ unit tests

### Play CLI

Unified command interface with built-in validation:

```bash
npm run play <type> [suite]

# Examples:
npm run play auto           # All automated tests
npm run play manual         # All manual tests
npm run play manual todo    # Specific suite
npm run play hybrid         # All hybrid tests
```

**Features:**

- Automatic dress rehearsal before tests
- Clean console output (no debug noise)
- Error handling and validation
- Sequential execution for manual/hybrid tests
- Help command: `npm run play -- --help`

**Console Output:**

```bash
✨  Running dress rehearsal...
✅  Validation passed

[Playwright test output]

✅  Tests completed!
```

### Staging Pipeline

The Director stages your tests with detailed feedback:

```bash
npm run stage
```

**Output:**

```bash
✨  Director staging the play...

🔧  Fixed formatting: test-suites/todo.md
✅  Generated: tests/manual/login.manual.test.ts
🔧  Auto-fixed: tests/manual/todo.manual.test.ts
    Test suite title: "[TS01] Old Title" → "[TS01] TodoMVC Tests"

📊 Director Metrics:
   Total files: 2
   Valid: 5, Invalid: 0

   Phases:
   • MD Formatting: 1/2 fixed (45ms)
   • Validation: 120ms
   • Generation: 1 manual, 0 auto (95ms)
   • Archiving: 0 manual, 0 auto (12ms)
   • Auto-fix: 1 manual, 0 auto (185ms)
   • Format & Lint: 2864ms

   Total execution: 3321ms

✅  Stage is set! 5 file(s) ready.
```

### Development Commands

```bash
npm run stage        # Full staging pipeline
npm run dress        # Validation only (no changes)
npm run lint:fix     # ESLint fix
npm run format:write # Prettier format
```

## 🔧 Framework Core

### 1. Director (`scripts/md-ts-director.ts`)

Full staging pipeline (7 steps):

1. **Fix MD formatting** - auto-corrects trailing spaces, blank lines
2. **Validate (critical errors)** - checks duplicates, MD structure, global IDs
3. **Generate missing tests** - creates skeletons for manual + auto, generates npm scripts for manual tests
4. **Archive orphaned tests** - moves manual + empty auto tests to `tests/archived/` when MD is deleted
5. **Auto-fix manual tests** - syncs structure with MD
6. **Auto-fix empty automated tests** - updates auto tests without implementation (all steps are TODO/empty)
7. **Format and lint** - runs Prettier + ESLint before final validation

Invoked via `npm run stage` - like a theatrical director preparing the stage and ensuring every actor (test) follows the script (MD).

### 2. Core Components

**Parsers (`src/framework/`):**

- `md-parser.ts` - extracts structure from Markdown (headings, IDs)
- `ts-parser.ts` - extracts structure from TypeScript (test blocks)

**Validators:**

- `sync-validator.ts` - orchestrates 4-step validation (duplicates → structure → global IDs → MD-TS sync)
- `file-matcher.ts` - compares individual MD ↔ TS files
- `md-validator.ts` - validates MD structure and formatting

**Auto-Fixers:**

- `auto-fixer.ts` - fixes manual test structure to match MD
- `md-validator.ts` - fixes MD formatting issues

**Generators:**

- `test-generator.ts` - generates missing manual/auto test skeletons

**Support:**

- `test-archiver.ts` - archives orphaned manual tests
- `tags-updater.ts` - updates tags in `src/constants/tags.ts`
- `validation-reporter.ts` - formats and displays validation errors
- `console-formatter.ts` - unified error output formatting
- `metrics.ts` - collects and formats staging metrics
- `helpers.ts` - shared utilities (`getTestFileBaseName`, `testIDsMatch`, etc.)
- `icons.ts` - emoji icons for console output
- `ts-morph-helpers.ts` - TypeScript AST manipulation utilities

**Scripts:**

- `play.ts` - Play CLI for running tests with validation
- `dress-rehearsal.ts` - Validation-only script
- `md-ts-director.ts` - Full staging pipeline orchestrator

### 3. Supported Patterns

Handles:

- Escape sequences in titles
- Multiple test patterns (`test.skip()`, `test.only()`, `test.fixme()`)
- ID suffix extraction (`[TC01-01-MANUAL]` matches `[TC01-01]`)
- Duplicate test implementations (manual + auto + hybrid for same MD test case)

## 🎓 Philosophy

### 1. MD is the source of truth

- **MD defines:** structure, titles, IDs, test case count
- **TS implements:** how to execute (manual/auto/hybrid)
- **Director ensures:** TS always follows MD (auto-fix for manual tests)
- **Validation is strict:** if MD has ID → TS must have it; if MD has no ID → TS must not have it

### 2. MD = what to test, code = how to test

- MD shows test structure (high-level)
- Code shows implementation (details)
- Validator keeps them synchronized
- Auto-fixer updates manual tests automatically
- Manual work preserved via archiving

### 3. One MD file = One Test Suite

- Multiple test cases per file
- Multiple implementations per test case (manual, auto, hybrid)
- Logical grouping by feature/functionality

## 📊 Reports

### 1. View test results

```bash
npm run review    # Open Monocart HTML report
```

### 2. Report includes

- Test execution summary
- Screenshots and traces on failure
- Detailed step-by-step logs

### 3.Centralized Report Storage (Optional)

For teams needing centralized report storage, you can add:

- **[@cyborgtests/reporter-playwright-reports-server](https://www.npmjs.com/package/@cyborgtests/reporter-playwright-reports-server)** - Cyborgtests reporter integration
- **[Playwright Reports Server](https://github.com/CyborgTests/playwright-reports-server)** - Docker-based reports storage

**Note:** You can add this integration yourself right now if needed. If there's demand from users, we'll include it in the project by default. Either way, you'll need to deploy and run the Docker container yourself.

## 📄 License

MIT

See also: `THIRD_PARTY_NOTICES.md` (licenses for dependencies like Cyborgtests and Monocart Reporter).
