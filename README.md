# 📜 Markdown Play: Write the Script, We'll Play the Show

**You write the script in Markdown. The Director stages it - validates structure, generates test skeletons and keeps manual, automated, and hybrid tests performing the same script. One source of truth. No improvisation. Pure theater.**

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

Download ZIP:

1. Open the repository page on GitHub
2. Click **Code**
3. Click **Download ZIP**
4. Extract the archive to any folder

Or clone with Git:

1. Open a terminal
2. Run the commands below:

```bash
git clone <YOUR_REPO_URL>
cd markdown-play
```

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
# [TS01] Login Tests

## [TC01-01] User can login

### Navigate to login page

### Enter credentials

### Click login button

### Verify dashboard visible
```

### 6. Prepare your test suite for execution

This command validates structure, generates test files, and creates npm scripts:

```bash
npm run stage
```

### 7. Run suite

Run specific suite with auto-generated command (created by `npm run stage`):

```bash
npm run play:manual-login
```

Or run all manual tests:

```bash
npm run play:manual
```

### 8. View test results

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

### Readable beyond engineering

Manual QA, managers, and non-technical stakeholders can review and update test specifications without touching TypeScript.

### One script, multiple implementations

The same Markdown test suite can drive:

- manual tests
- automated tests
- hybrid tests

All implementations stay synchronized from a single source of truth.

### Works without automation

Markdown Play already provides value for manual testing - automation can be added later if needed.

### Built for Playwright

When automation is needed, the same Markdown structure scales naturally to Playwright E2E and API testing with full TypeScript support.

## 👨‍💻 Commercial Automation Support

Need a full Playwright E2E/API automation ecosystem on top of Markdown Play?

Commercial integration and automation services are available from the author:

[LinkedIn - Andrii Pohanovskyi](https://linkedin.com/in/andrii-pohanovskyi)
[Email - pognovsky@gmail.com](mailto:poganovsky@gmail.com)

## 🎯 Core Idea

**1 Markdown file = 1 test suite**  
**Multiple implementations = always synchronized**

The Director (`npm run stage`):

1. Validates Markdown structure
2. Generates missing test skeletons (manual + auto)
3. Auto-fixes manual tests to match Markdown
4. Archives orphaned manual tests
5. Validates final synchronization
6. Formats and lints test files

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

### Structure

```text
# Test Suite Title

## Test Case title

### Step Title

- Optional details
  - Test data
  - Expected results

### Another Step
```

### Hierarchy

```text
# → Test Suite
## → Test Case
### → Test Step
Lists (-) → Comments (ignored by validator)
```

### IDs - Optional but Powerful

IDs are optional. Tests work without them (validator matches by full titles).

**Why use IDs:**

- **Multiple implementations** - generate multiple tests from a single MD case
- **Stable matching** - titles can change, IDs remain constant
- **Avoid duplicates** - Markdown linters allow duplicate titles when IDs differ

**Suffix Support - Multiple Implementations:**

With IDs, you can create multiple test types for one MD test case. Suffix after ID is ignored during validation, allowing manual, auto, and hybrid implementations to match the same MD test case.

**ID Format (brackets only):**

✅ `## [TC01-01] Test Case title` - ID extracted, suffix support enabled  
✅ `## [] Test Case title` - empty ID, suffix-only support  
❌ `## TC01-01: Test Case title` - no ID, validates by full title  
❌ `## TC01-01 - Test Case title` - no ID, validates by full title

**Empty ID - Suffix Only:**

Use empty brackets `[]` when you only need suffixes to distinguish implementations:

```typescript
// One MD test case: ## [] Add todo

test('[MANUAL] Add todo', ...)  // Manual implementation (no dash)
test('[AUTO] Add todo', ...)    // Automated implementation (no dash)
test('[HYBRID] Add todo', ...)  // Hybrid implementation (no dash)
```

All three match `[]` from MD. Useful when you don't need numbered IDs, just implementation types.

**Without IDs:**

```markdown
## Add todo
```

Must match exactly in test file - no suffix support, no multiple implementations.

## ✅ Validation

### What Validator Checks

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

### ID Validation Rules (Strict)

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

### What Stage Auto-Fixes

**Automatically fixed:**

- MD formatting issues (trailing spaces, blank lines)
- Manual test structure (suite/test case/step titles and counts)
- Missing test files (generates skeletons for manual + auto)
- Missing npm scripts (creates `play:manual-<basename>` commands for manual tests only)

**Must fix manually:**

- Tags (file type, suite tags from basename)
- IDs (add/remove to match MD)
- Duplicate IDs/titles across MD files

### Orphaned Test Archiving

When MD file is deleted:

- **Manual tests** → archived to `tests/archived/` (preserves valuable manual work)
- **Auto/hybrid tests** → left in place (not archived)
  - Can continue running without corresponding MD file
  - Useful for tests that need single implementation only

Archive location: `tests/archived/<filename>`.

### Multiple Implementations

**With non-empty ID (dash before suffix):**

```typescript
// MD: ## [TC01-01] Add todo
test('[TC01-01-MANUAL] Add todo', ...)  // ✅ Matches [TC01-01]
test('[TC01-01-AUTO] Add todo', ...)    // ✅ Matches [TC01-01]
test('[TC01-01-HYBRID] Add todo', ...)  // ✅ Matches [TC01-01]
```

**With empty ID (suffix only, no dash):**

```typescript
// MD: ## [] Add todo
test('[MANUAL] Add todo', ...)  // ✅ Matches []
test('[AUTO] Add todo', ...)    // ✅ Matches []
test('[HYBRID] Add todo', ...)  // ✅ Matches []
```

Validator checks each `test()` separately against MD. Same file or different files - both are valid.

## 📚 Working Example

Repository includes complete TodoMVC example demonstrating:

- `**test-suites/todo.md**` - 5 test cases with IDs and comments
- `**tests/manual/todo.manual.test.ts**` - manual steps + automated `goto()` step
- `**tests/automated/todo.auto.test.ts**` - fully automated
- `**tests/hybrid/todo.hybrid.test.ts**` - automated actions + manual verification

All three validate against **same** `todo.md` - this demonstrates the framework.

**Run example:**

```bash
npm run stage                 # Stage: validate → generate → auto-fix → archive → format → lint

# All tests
npm run play:manual           # Play all manual tests (headed, workers=1)
npm run play:auto             # Play all automated tests (headless, parallel)
npm run play:hybrid           # Play all hybrid tests (headed, workers=1)

# Suite-specific (auto-generated for manual tests only)
npm run play:manual-todo      # Play only todo manual tests
```

**Notes:**

- Base command `npm run play:manual` runs all manual tests from all suites
- Suite-specific commands (`play:manual-<basename>`) are automatically created by `npm run stage` to run individual suites only

**Note:** Dress rehearsal validates synchronization automatically before each test run.

## ⚙️ Configuration

### File Naming

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

## 🔧 Framework Core

### Director (`scripts/md-ts-director.ts`)

Full staging pipeline (6 steps):

1. **Fix MD formatting** - auto-corrects trailing spaces, blank lines
2. **Validate (critical errors)** - checks duplicates, MD structure, global IDs
3. **Generate missing tests** - creates skeletons for manual + auto, generates npm scripts for manual tests
4. **Archive orphaned manual tests** - moves to `tests/archived/`
5. **Auto-fix manual tests** - syncs structure with MD
6. **Format and lint** - runs Prettier + ESLint before final validation

Invoked via `npm run stage` - like a theatrical director preparing the stage and ensuring every actor (test) follows the script (MD).

### Core Components

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
- `helpers.ts` - shared utilities (`getTestFileBaseName`, `testIDsMatch`, etc.)
- `icons.ts` - emoji icons for console output

### Supported Patterns

Handles:

- Escape sequences in titles
- Multiple test patterns (`test.skip()`, `test.only()`, `test.fixme()`)
- ID suffix extraction (`[TC01-01-MANUAL]` matches `[TC01-01]`)
- Duplicate test implementations (manual + auto + hybrid for same MD test case)

## 🎓 Philosophy

### MD is the source of truth

- **MD defines:** structure, titles, IDs, test case count
- **TS implements:** how to execute (manual/auto/hybrid)
- **Director ensures:** TS always follows MD (auto-fix for manual tests)
- **Validation is strict:** if MD has ID → TS must have it; if MD has no ID → TS must not have it

### MD = what to test, code = how to test

- MD shows test structure (high-level)
- Code shows implementation (details)
- Validator keeps them synchronized
- Auto-fixer updates manual tests automatically
- Manual work preserved via archiving

### 1 MD file = 1 Test Suite

- Multiple test cases per file
- Multiple implementations per test case (manual, auto, hybrid)
- Logical grouping by feature/functionality

## 📊 Reports

View test results:

```bash
npm run review    # Open Monocart HTML report
```

Report includes:

- Test execution summary
- Screenshots and traces on failure
- Detailed step-by-step logs

### Optional: Centralized Report Storage

For teams needing centralized report storage, you can add:

- **[@cyborgtests/reporter-playwright-reports-server](https://www.npmjs.com/package/@cyborgtests/reporter-playwright-reports-server)** - Cyborgtests reporter integration
- **[Playwright Reports Server](https://github.com/CyborgTests/playwright-reports-server)** - Docker-based reports storage

**Note:** You can add this integration yourself right now if needed. If there's demand from users, we'll include it in the project by default. Either way, you'll need to deploy and run the Docker container yourself.

## 📄 License

MIT

See also: `THIRD_PARTY_NOTICES.md` (licenses for dependencies like Cyborgtests and Monocart Reporter).
