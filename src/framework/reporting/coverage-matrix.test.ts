import { describe, expect, it } from 'vitest'

import type { GeneratedTest, Generation } from '@/framework/bdd/generator'
import { buildCoverageMatrix, filterCoverageByTags } from '@/framework/reporting/coverage-matrix'
import type { RunOutcome } from '@/framework/reporting/last-run'

const EARLIER = '2026-10-26T10:00:00.000Z'
const LATER = '2026-10-26T12:00:00.000Z'

function generatedTest(overrides: Partial<GeneratedTest>): GeneratedTest {
  return {
    title: 'Test',
    layer: '@ui',
    kind: 'auto',
    fixme: false,
    tags: [],
    steps: { automated: 2, total: 2 },
    manual: [],
    devices: 'desktop',
    ...overrides
  }
}

function generation(specPath: string, tests: GeneratedTest[]): Generation {
  return {
    specPath,
    testPath: `.director/tests/${specPath}.test.ts`,
    suiteTtl: 'Shop',
    content: '',
    tests,
    missing: [],
    pending: [],
    errors: [],
    used: new Set()
  }
}

const SHOP = generation('test-suites/shop.md', [
  generatedTest({ title: 'Add to cart', tags: ['@smoke', '@retries:1'], devices: 'all' }),
  generatedTest({ title: 'Check colors', kind: 'cyborg', steps: { automated: 1, total: 3 } }),
  generatedTest({
    title: 'Price API',
    layer: '@api',
    fixme: true,
    modifier: 'fixme',
    steps: { automated: 0, total: 1 },
    devices: 'none'
  }),
  generatedTest({ title: 'Old flow', modifier: 'skip', tags: ['@smoke'] })
])

describe('buildCoverageMatrix', () => {
  it('should give every generated test its layer, devices, status and automated steps', () => {
    const matrix = buildCoverageMatrix({ generations: [SHOP], errors: [] })

    expect(matrix.suites[0].tests.map((t) => [t.title, t.layer, t.devices, t.status])).toEqual([
      ['Add to cart', 'ui', 'all', 'automated'],
      ['Check colors', 'ui', 'desktop', 'cyborg'],
      ['Price API', 'api', 'none', 'fixme'],
      ['Old flow', 'ui', 'desktop', 'disabled']
    ])
    expect(matrix.summary).toEqual({
      totalTests: 4,
      automatedTests: 1,
      cyborgTests: 1,
      fixmeTests: 1,
      disabledTests: 1,
      automatedPercent: 25,
      steps: { automated: 5, total: 8 },
      runs: 0,
      run: { passed: 0, failed: 0, flaky: 0, skipped: 0, notRun: 0 }
    })
    expect(matrix.lastRunAt).toBeNull()
  })

  it('should give every test its last run on each project, matched by test file and title', () => {
    const entry = (title: string, project: string, outcome: RunOutcome, finishedAt = EARLIER) => ({
      file: '.director/tests/test-suites/shop.md.test.ts',
      title,
      project,
      outcome,
      finishedAt
    })
    const matrix = buildCoverageMatrix({ generations: [SHOP], errors: [] }, [
      entry('Add to cart', 'chrome', 'passed'),
      entry('Add to cart', 'firefox', 'flaky', LATER),
      entry('Check colors', 'cyborg', 'failed'),
      entry('Price API', 'api', 'skipped'),
      { ...entry('Old flow', 'chrome', 'passed', '2026-10-27T00:00:00.000Z'), file: 'other.ts' }
    ])

    expect(matrix.suites[0].tests.map((t) => [t.title, t.run, t.runs.length])).toEqual([
      ['Add to cart', 'flaky', 2],
      ['Check colors', 'failed', 1],
      ['Price API', 'skipped', 1],
      ['Old flow', 'notRun', 0]
    ])
    expect(matrix.summary.run).toEqual({ passed: 1, failed: 1, flaky: 1, skipped: 1, notRun: 0 })
    expect(matrix.lastRunAt).toBe(LATER)
  })

  it('should give a test one run per project that picks it, not run until it ran there', () => {
    const projects = [
      { name: 'api', grep: /@api/ },
      { name: 'chrome', grep: /@ui/, grepInvert: /@cyborg/ },
      { name: 'cyborg', grep: /@cyborg/ }
    ]
    const entry = (title: string, project: string) => ({
      file: '.director/tests/test-suites/shop.md.test.ts',
      title,
      project,
      outcome: 'passed' as const,
      finishedAt: EARLIER
    })
    const matrix = buildCoverageMatrix(
      { generations: [SHOP], errors: [] },
      [entry('Add to cart', 'chrome'), entry('Add to cart', 'firefox')],
      projects
    )

    expect(matrix.suites[0].tests.map((t) => [t.title, t.run, t.runs])).toEqual([
      ['Add to cart', 'passed', [{ project: 'chrome', outcome: 'passed' }]],
      ['Check colors', 'notRun', [{ project: 'cyborg', outcome: 'notRun' }]],
      ['Price API', 'notRun', [{ project: 'api', outcome: 'notRun' }]],
      ['Old flow', 'notRun', [{ project: 'chrome', outcome: 'notRun' }]]
    ])
    expect(matrix.summary).toMatchObject({
      runs: 4,
      run: { passed: 1, failed: 0, flaky: 0, skipped: 0, notRun: 3 }
    })
  })

  it('should group tests by spec tag, most tests first, without run settings', () => {
    const other = generation('test-suites/other.md', [
      generatedTest({ title: 'Pay', tags: ['@smoke', '@checkout'] })
    ])
    const matrix = buildCoverageMatrix({ generations: [SHOP, other], errors: [] })

    expect(matrix.tags.map(({ tag, summary }) => [tag, summary.totalTests])).toEqual([
      ['@smoke', 3],
      ['@checkout', 1]
    ])
    expect(matrix.tags[0].summary).toMatchObject({ automatedTests: 2, disabledTests: 1 })
    expect(matrix.untagged.totalTests).toBe(2) // Check colors, Price API
  })

  it('should list generation errors with their spec', () => {
    const matrix = buildCoverageMatrix({
      generations: [],
      errors: [{ file: 'test-suites/x.md', errors: ['Test "A" has no layer'] }]
    })

    expect(matrix.errors).toEqual(['test-suites/x.md: Test "A" has no layer'])
    expect(matrix.summary.automatedPercent).toBe(0)
  })
})

describe('filterCoverageByTags', () => {
  it('should keep tests with any of the tags and recount summaries', () => {
    const other = generation('test-suites/other.md', [generatedTest({ title: 'Untagged' })])
    const matrix = filterCoverageByTags(
      buildCoverageMatrix({ generations: [SHOP, other], errors: [] }),
      ['@smoke']
    )

    expect(matrix.suites).toHaveLength(1)
    expect(matrix.suites[0].tests.map((t) => t.title)).toEqual(['Add to cart', 'Old flow'])
    expect(matrix.summary).toMatchObject({ totalTests: 2, automatedTests: 1, automatedPercent: 50 })
    expect(matrix.tags.map(({ tag }) => tag)).toEqual(['@smoke'])
  })
})
