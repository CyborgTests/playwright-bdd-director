# 📋 No-Code Test Specs: Always in Sync

**Playwright Testing Framework where Markdown is the spec and your manual/auto/hybrid tests stay synchronized via automatic validation and scaffolding.**

> **⚠️ Important note about manual & hybrid tests**
>
> This repository makes full sense only when used together with **Cyborgtests** (`@cyborgtests/test`).
> Without Cyborgtests you can still run **automated** Playwright tests and the **MD ↔ code validator**,
> but you **cannot** create/run real **manual** or **hybrid** tests (because `manualStep()` and the manual runner come from Cyborgtests).
>
> **🎯 Main Idea**
>
> Write test documentation **once** in Markdown. Validator ensures MD and test code never drift apart.
>
> Same MD file → multiple implementations (manual, automated, hybrid) → always synchronized.

## 🚀 Quick Start

### 1. Install Node.JS

```bash
node --version
```

Use Node.js 18+ (Node.js 20+ recommended).

### 2. Clone repository

```bash
git clone <YOUR_REPO_URL>
cd md-test-framework
```

### 3. Install dependencies

```bash
npm install
```

### 4. Install Playwright browsers

```bash
npx playwright install
```

### 5. Create MD file

`test-cases/login.md`:

```markdown
# [TS01] Login Tests

## [TC01-01] User can login

### [01-01-01] Navigate to login page
### [01-01-02] Enter credentials
### [01-01-03] Click login button
### [01-01-04] Verify dashboard visible
```

### 6. Optional: Create test file

You can create tests manually, but the recommended path is auto-generation from MD.

`tests/manual/login.manual.test.ts`:

```typescript
import test from '@cyborgtests/test'

test.describe('[TS01] Login Tests', () => {
  test('[TC01-01] User can login', async ({ page, manualStep }) => {
    await manualStep('[01-01-01] Navigate to login page')
    await manualStep('[01-01-02] Enter credentials')
    await manualStep('[01-01-03] Click login button')
    await manualStep('[01-01-04] Verify dashboard visible')
  })
})
```

`tests/automated/login.auto.test.ts`:

```typescript
import { test } from '@playwright/test'

test.describe('[TS01] Login Tests', () => {
  test('[TC01-01-AUTO] User can login', async ({ page }) => {
    await test.step('[01-01-01] Navigate to login page', async () => {
      // TODO: Implement step logic
    })
    await test.step('[01-01-02] Enter credentials', async () => {
      // TODO: Implement step logic
    })
    await test.step('[01-01-03] Click login button', async () => {
      // TODO: Implement step logic
    })
    await test.step('[01-01-04] Verify dashboard visible', async () => {
      // TODO: Implement step logic
    })
  })
})
```

### 7. Generate missing files and validate

Run validation once. If tests are missing, it will auto-generate `*.manual.test.ts` and `*.auto.test.ts` from MD, then validate sync.

```bash
npm run validate
```

### 8. Run tests

```bash
npm run test:auto        # Run automated tests (headless, parallel)
npm run test:manual      # Run manual tests (headed, workers=1)
npm run test:hybrid      # Run hybrid tests (headed, workers=1)
```

## 💡 Why MD-first Tests (and what you get)

### ✅ Readable for non-tech teams

- Manual QA and management can read/review/update specs without touching TypeScript

### ✅ Easy to share

- MD specs fit naturally into existing documentation workflows (for example, Notion)

### ✅ One source of truth

- Write once in MD, keep manual/auto/hybrid tests synchronized, and catch drift early with validation

### ✅ Manual-first friendly

- If you only need manual testing, MD specs can be enough without writing automation code

### ✅ Automation-ready

- The same MD scales to pure Playwright (`test.describe`, `test`, `test.step`) with full TypeScript support

## 🎯 Core Concept

**1 MD file = 1 Test Suite**  
**Multiple implementations = always in sync**

Before validation:

- Parses MD structure (suite, test cases, steps) into a canonical model
- Parses test files the same way and aligns them to the MD spec
- Auto-generates missing `*.manual.test.ts` and `*.auto.test.ts` skeletons

Validation:

- Detects mismatches (counts, titles, ids, step structure) with fix suggestions
- Keeps manual, automated, and hybrid implementations consistent from one source
- Validator checks all three against todo.md

```text
┌──────────────────────────┐
│  todo.md                 │  ← Single Source of Truth
│  # TodoMVC Tests         │
│  ## [TC01-01] Add todo   │
│  ### [01-01-01] Navigate │
│  ### [01-01-02] Add      │
│  ### [01-01-03] Verify   │
└────────────┬─────────────┘
             │
             ├──→ todo.manual.test.ts
             ├──→ todo.auto.test.ts
             └──→ todo.hybrid.test.ts
             
```

## 📝 MD Format

### Structure

```markdown
# [TS01] Test Suite Title

## [TC01-01] Test Case title

### [01-01-01] Step Title

- Optional details
  - Test data
  - Expected results

### [01-01-02] Another Step
```

**Hierarchy:**

- `#` → Test Suite
- `##` → Test Case
- `###` → Test Step
- Lists (`-`) → Comments (ignored by validator)

### IDs Are Optional

**With IDs (recommended):**

Only **brackets format** `[ID]` is recognized as id:

- `## [TC01-01] Test Case title` → ID: `TC01-01`, Title: `Test Case title`
- Enables suffix support in tests: `[TC01-01-MANUAL]`, `[TC01-01-AUTO]` match `[TC01-01]`
- Avoids MD linter duplicate heading errors

**Without IDs (simpler):**

Everything else is treated as plain text title:

- `## Add todo` → Title: `Add todo`
- `## TC01-01: Test Case title` → Title: `TC01-01: Test Case title` (no ID, full text)
- `## TC01-01 - Test Case title` → Title: `TC01-01 - Test Case title` (no ID, full text)

Only brackets `[]` enable ID extraction and suffix support!

## ✅ Validation

### What Validator Checks

```bash
npm run validate
```

Validator verifies:

1. Suite title matches
2. Test case count and titles match
3. Step count and titles match per test case
4. ids match (if using ids)

### ID Validation Rules

**Brackets format `[TC01-01]`:**

- MD: `[TC01-01]` → Test: `[TC01-01]` ✅
- MD: `[TC01-01]` → Test: `[TC01-01-MANUAL]` ✅ (suffix allowed)
- MD: `[TC01-01]` → Test: `[TC01-01-AUTO-UI]` ✅
- MD: `[TC01-01]` → Test: `[TC01-02]` ❌ (different ID)

**Other formats** (`TC-001:`):

- Cannot extract ID
- Validates full title only
- No suffix support

### Multiple Implementations

You can create multiple test types for same MD test case:

```typescript
// Same file or different files - both valid
test('[TC01-01-MANUAL] Add todo', ...)  // ✅ Matches [TC01-01]
test('[TC01-01-AUTO] Add todo', ...)    // ✅ Matches [TC01-01]
test('[TC01-01-HYBRID] Add todo', ...)  // ✅ Matches [TC01-01]
```

Validator checks each `test()` separately against MD.

## 📚 Working Example

Repository includes complete TodoMVC example demonstrating:

- **`test-cases/todo.md`** — 5 test cases with ids and comments
- **`tests/manual/todo.manual.test.ts`** — manual steps (with one automated `goto()` step)
- **`tests/automated/todo.auto.test.ts`** — fully automated
- **`tests/hybrid/todo.hybrid.test.ts`** — automated actions + manual verification

All three validate against **same** `todo.md` — this demonstrates the framework.

**Run example:**

```bash
npm run validate         # Validate all tests
npm run test:manual      # Run manual tests (headed, workers=1)
npm run test:auto        # Run automated tests (headless, parallel)
npm run test:hybrid      # Run hybrid tests (headed, workers=1)
```

## ⚙️ Configuration

### Playwright Config

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: 'https://demo.playwright.dev/todomvc'
  },
  projects: [
    {
      name: 'manual',
      testMatch: /.*\.manual\.test\.ts$/,
      timeout: 0,
      fullyParallel: false,
      use: { headless: false }
    },
    {
      name: 'hybrid',
      testMatch: /.*\.hybrid\.test\.ts$/,
      timeout: 0,
      fullyParallel: false,
      use: { headless: false }
    },
    {
      name: 'automated',
      testMatch: /.*\.auto\.test\.ts$/,
      use: { headless: true }
    }
  ]
})
```

### File Naming

- MD: `<name>.md` (e.g., `todo.md`)
- Test: `<name>.<anything>.ts` (framework extracts base name before first dot)
- Examples:
  - `todo.manual.test.ts` → `todo.md` ✅
  - `todo.auto.test.ts` → `todo.md` ✅

**Important:** `tests/` should contain only test files (no helpers/utils).

## 🔧 Framework Core

### Validator (`scripts/validate-md-sync.ts`)

Parses MD files and test files, compares structure:

- Extracts test suites, test cases, steps
- Supports ids in brackets `[TC01-01]` with suffix detection
- Validates each `test()` separately
- Reports mismatches with actionable fixes

### Parser (`src/framework/`)

Extracts test structure from:

- **MD files:** Headings (`#`, `##`, `###`) and ids in brackets
- **Test files:** `test.describe()`, `test()`, `manualStep()`, `test.step()`

Handles:

- Escape sequences in titles
- Multiple test patterns (`test.skip()`, `test.only()`, `test.fixme()`)
- ID suffix extraction

## 🎓 Philosophy

### MD = what to test, code = how to test

- MD shows test structure (high-level)
- Code shows implementation (details)
- Validator keeps them synchronized

### 1 MD file = 1 Test Suite

- Multiple test cases per file
- Multiple implementations per test case
- Logical grouping

## 🔧 Optional: Hooks & Linters

**Git Hooks:**

```bash
npm install --save-dev husky
npx husky init
echo "npm run validate" > .husky/pre-commit
```

**MD Linter:**

If not using ids, disable MD024 (duplicate headings):

```json
{ "MD024": false }
```

## 📄 License

MIT

See also: `THIRD_PARTY_NOTICES.md` (licenses for dependencies like Playwright and Cyborgtests).
