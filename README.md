# MD Test Framework

Playwright test framework with **Markdown as single source of truth** and **automatic validation**.

> **🎯 Main Idea**
>
> Write test documentation **once** in Markdown. Validator ensures MD and test code never drift apart.
>
> Same MD file → multiple implementations (manual, automated, hybrid) → always synchronized.

## 🎯 Core Concept

**1 MD file = 1 test suite**  
**Multiple implementations = always in sync**

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
             
Validator checks all three against todo.md
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

Only **brackets format** `[ID]` is recognized as ID:

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
4. IDs match (if using IDs)

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

## 🚀 Quick Start

### 1. Install

```bash
npm install
```

### 2. Create MD file

`test-cases/login.md`:

```markdown
# [TS01] Login Tests

## [TC01-01] User can login

### [01-01-01] Navigate to login page
### [01-01-02] Enter credentials
### [01-01-03] Click login button
### [01-01-04] Verify dashboard visible
```

### 3. Create test file

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

### 4. Validate

```bash
npm run validate
# ✅ All 1 file(s) are in sync with MD!
```

## 📚 Working Example

Repository includes complete TodoMVC example demonstrating:

- **`test-cases/todo.md`** — 5 test cases with IDs and comments
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

## 📊 Benefits

### ✅ Single Source of Truth

- Write documentation once in MD
- Multiple implementations always synchronized
- Validator prevents drift

### ✅ Flexibility

- IDs are optional
- Suffix support for test types
- Works with any ID format in brackets

### ✅ Pure Playwright

- Standard `test.describe()`, `test()`, `test.step()`
- Supports `test.skip()`, `test.only()`, `test.fixme()`
- No custom abstractions
- Full TypeScript support

### ✅ Manual + Automated Support

- Same MD for all test types
- `manualStep()` for manual steps
- `test.step()` for automated steps
- Mix both in any combination (hybrid)

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
- Supports IDs in brackets `[TC01-01]` with suffix detection
- Validates each `test()` separately
- Reports mismatches with actionable fixes

### Parser (`src/framework/`)

Extracts test structure from:

- **MD files:** Headings (`#`, `##`, `###`) and IDs in brackets
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

If not using IDs, disable MD024 (duplicate headings):

```json
{ "MD024": false }
```

## 📄 License

MIT
