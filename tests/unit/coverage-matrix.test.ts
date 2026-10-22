import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildCoverageMatrix,
  type CoverageMatrix,
  filterCoverageByTags
} from '@/framework/reporting/coverage-matrix'
import { resetSharedProject } from '@/framework/utils/ts-morph-helpers'

let testDir: string
let suitesDir: string

beforeEach(() => {
  resetSharedProject()
  testDir = path.join(process.cwd(), `.test-tmp-matrix-${crypto.randomBytes(4).toString('hex')}`)
  suitesDir = path.join(testDir, 'test-suites')
  fs.mkdirSync(suitesDir, { recursive: true })
})

afterEach(() => {
  resetSharedProject()
  try {
    fs.rmSync(testDir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors - directory is unique, won't conflict with other tests
  }
})

function writeFile(relativePath: string, content: string): string {
  const filePath = path.join(testDir, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

const SPEC = `## Shop

### [TC-01] Add to cart
1. Open product
2. Click "Add"

### Checkout
1. Open cart
2. Pay
`

function testFile(describe: string, body: string): string {
  return `import { test } from '@playwright/test'\n\n${describe}('Shop', () => {\n${body}\n})\n`
}

const CYBORG = testFile(
  'test.describe',
  `  test('[TC-01-CYBORG] Add to cart', async ({ page, manualStep }) => {
    await test.step('Open product', async () => {
      await page.goto('/product')
    })
    await manualStep('Click "Add"')
  })
  test('Checkout', async ({ manualStep }) => {
    await manualStep('Open cart')
    await manualStep('Pay')
  })`
)

function build(specs: string[], tests: string[], noCyborg: readonly string[] = []): CoverageMatrix {
  return buildCoverageMatrix(specs, tests, { noCyborg, testSuitesDir: suitesDir })
}

describe('buildCoverageMatrix', () => {
  it('should match cases by ID with suffix and by title, counting automated cyborg steps', () => {
    const spec = writeFile('test-suites/shop.md', SPEC)
    const cyborg = writeFile('tests/cyborg/shop.cyborg.test.ts', CYBORG)
    const ui = writeFile(
      'tests/automated/ui/shop.ui.test.ts',
      testFile(
        'test.describe',
        `  test('[TC-01] Add to cart', async ({ page }) => {
    await test.step('Open product', async () => {
      await page.goto('/product')
    })
  })`
      )
    )

    const [suite] = build([spec], [cyborg, ui]).suites
    const [addToCart, checkout] = suite.cases

    expect(addToCart.cells).toMatchObject({
      cyborg: 'implemented',
      ui: 'implemented',
      api: 'missing'
    })
    expect(addToCart.cyborgSteps).toEqual({ automated: 1, total: 2 })
    expect(checkout.cells).toMatchObject({ cyborg: 'implemented', ui: 'missing' })
    expect(checkout.cyborgSteps).toEqual({ automated: 0, total: 2 })
    expect(suite.summary).toEqual({
      totalCases: 2,
      automatedCases: 1,
      cyborgOnlyCases: 1,
      uncoveredCases: 0,
      automatedPercent: 50,
      cyborgSteps: { automated: 1, total: 4 }
    })
  })

  it('should tell skeleton and disabled tests from implemented ones', () => {
    const spec = writeFile('test-suites/shop.md', SPEC)
    const skeleton = writeFile(
      'tests/automated/todo/shop.auto.test.ts',
      testFile(
        'test.describe.fixme',
        `  test('[TC-01-AUTO] Add to cart', async () => {
    await test.step('Open product', async () => { /* TODO: Implement step logic */ })
  })`
      )
    )
    const api = writeFile(
      'tests/automated/api/shop.api.test.ts',
      testFile(
        'test.describe',
        `  test.fixme('Checkout', async ({ request }) => {
    await request.get('/cart')
  })`
      )
    )

    const matrix = build([spec], [skeleton, api])
    const [addToCart, checkout] = matrix.suites[0].cases

    expect(addToCart.cells.auto).toBe('skeleton')
    expect(checkout.cells.api).toBe('disabled')
    expect(matrix.layers).toContain('auto')
    expect(matrix.summary).toMatchObject({ automatedCases: 0, uncoveredCases: 2 })
  })

  it('should hide auto layer when no suite has AUTO tests', () => {
    const spec = writeFile('test-suites/shop.md', SPEC)

    expect(build([spec], []).layers).toEqual(['cyborg', 'api', 'ui', 'e2e'])
  })

  it('should mark cyborg as n/a for suites listed in noCyborg', () => {
    const spec = writeFile('test-suites/api/shop.md', SPEC)
    const cyborg = writeFile('tests/cyborg/api/shop.cyborg.test.ts', CYBORG)

    const [addToCart] = build([spec], [cyborg], ['api']).suites[0].cases

    expect(addToCart.cells.cyborg).toBe('n/a')
    expect(addToCart.cyborgSteps).toBeNull()
  })

  it('should read Gherkin specs and leave Background out of summary', () => {
    const spec = writeFile(
      'test-suites/nav.feature',
      `Feature: Nav

  Background:
    Given home page is open

  Scenario: Open login
    When user clicks "Login"
`
    )
    const ui = writeFile(
      'tests/automated/ui/nav.ui.test.ts',
      testFile(
        'test.describe',
        `  test.beforeEach('Background', async ({ page }) => {
    await test.step('Given home page is open', async () => {
      await page.goto('/')
    })
  })
  test('Open login', async ({ page }) => {
    await test.step('When user clicks "Login"', async () => {
      await page.click('text=Login')
    })
  })`
      )
    )

    const [suite] = build([spec], [ui]).suites

    expect(suite.cases.map((tc) => [tc.ttl, tc.isBackground, tc.cells.ui])).toEqual([
      ['Background', true, 'implemented'],
      ['Open login', false, 'implemented']
    ])
    expect(suite.summary).toMatchObject({ totalCases: 1, automatedCases: 1, automatedPercent: 100 })
  })

  it('should collect unparsable files as errors and keep going', () => {
    const broken = writeFile('test-suites/broken.md', 'no suite heading here\n')
    const spec = writeFile('test-suites/shop.md', SPEC)
    const badTest = writeFile('tests/automated/ui/shop.ui.test.ts', `export const x = 1\n`)

    const matrix = build([broken, spec], [badTest])

    expect(matrix.suites.map((s) => s.suiteTtl)).toEqual(['Shop'])
    expect(matrix.errors).toHaveLength(2)
    expect(matrix.errors[0]).toContain('shop.ui.test.ts')
    expect(matrix.errors[1]).toContain('broken.md')
  })

  it('should report 0% for no cases instead of NaN', () => {
    expect(build([], []).summary.automatedPercent).toBe(0)
  })
})

describe('filterCoverageByTags', () => {
  it('should keep tagged cases with their Background and recount summaries', () => {
    const spec = writeFile(
      'test-suites/nav.feature',
      `@nav
Feature: Nav

  Background:
    Given home page is open

  @smoke
  Scenario: Open login
    When user clicks "Login"

  Scenario: Open cart
    When user clicks "Cart"
`
    )
    const other = writeFile('test-suites/shop.md', SPEC)

    const matrix = build([spec, other], [])
    const filtered = filterCoverageByTags(matrix, ['@smoke'])

    expect(matrix.suites[0].cases.map((tc) => tc.tags)).toEqual([
      ['@nav'],
      ['@nav', '@smoke'],
      ['@nav']
    ])
    expect(filtered.suites.map((s) => s.cases.map((tc) => tc.ttl))).toEqual([
      ['Background', 'Open login']
    ])
    expect(filtered.summary.totalCases).toBe(1)
  })
})

describe('buildCoverageMatrix - examples', () => {
  it('should count examples rows of parametrized test case', () => {
    const spec = writeFile(
      'test-suites/login.md',
      `## Login

### Login as <role>

| role  |
| ----- |
| admin |
| guest |

#### Log in
`
    )

    expect(build([spec], []).suites[0].cases[0].examples).toBe(2)
  })
})
