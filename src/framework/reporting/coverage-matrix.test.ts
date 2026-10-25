import { describe, expect, it } from 'vitest'

import type { GeneratedTest, Generation } from '@/framework/bdd/generator'
import { buildCoverageMatrix, filterCoverageByTags } from '@/framework/reporting/coverage-matrix'

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
  generatedTest({ title: 'Add to cart', tags: ['@smoke'], devices: 'all' }),
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
      steps: { automated: 5, total: 8 }
    })
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
  })
})
