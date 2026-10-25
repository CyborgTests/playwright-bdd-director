import { describe, expect, it } from 'vitest'

import type { GeneratedTest, Generation } from '@/framework/bdd/generator'
import {
  buildDressReport,
  renderDressConsole,
  renderDressMarkdown,
  type RunProject
} from '@/framework/reporting/dress-report'

function generatedTest(overrides: Partial<GeneratedTest>): GeneratedTest {
  return {
    title: 'Test',
    layer: '@ui',
    kind: 'auto',
    fixme: false,
    tags: [],
    steps: { automated: 1, total: 1 },
    manual: [],
    devices: 'desktop',
    ...overrides
  }
}

function generation(specPath: string, tests: GeneratedTest[], extra: Partial<Generation> = {}) {
  return {
    specPath,
    testPath: `.director/tests/${specPath}.test.ts`,
    suiteTtl: 'Shop',
    content: '',
    tests,
    missing: [],
    pending: [],
    errors: [],
    used: new Set(),
    ...extra
  } as Generation
}

const PROJECTS: RunProject[] = [
  { name: 'cyborg', grep: /@cyborg(\s|$)/ },
  { name: 'api', grep: /(?=.*@auto(\s|$))(?=.*@api(\s|$))/ },
  { name: 'chrome', grep: /@auto(\s|$)/, grepInvert: /@api(\s|$)/ },
  { name: 'tablet', grep: /(?=.*@auto(\s|$))(?=.*@all-devices(\s|$))/, grepInvert: /@api(\s|$)/ }
]

const SHOP = generation(
  'test-suites/shop/cart.feature',
  [
    generatedTest({ title: 'Add to cart', tags: ['@all-devices', '@fail:tablet'] }),
    generatedTest({
      title: 'Check colors',
      layer: '@e2e',
      kind: 'cyborg',
      tags: ['@all-devices'],
      manual: ['Then colors match', 'And logo is sharp']
    }),
    generatedTest({ title: 'Old flow', tags: ['@skip'] })
  ],
  {
    missing: [
      { title: 'And logo is sharp', keyword: 'Then', expression: '', snippet: '' }
    ] as Generation['missing'],
    pending: [{ title: 'Then colors match', location: 'src/steps/cart.steps.ts:9' }]
  }
)

const API = generation('test-suites/prices.md', [
  generatedTest({ title: 'Prices', layer: '@api', devices: 'none' }),
  generatedTest({
    title: 'Discounts',
    layer: '@api',
    fixme: true,
    devices: 'none',
    manual: ['Verify discount']
  })
])

const REPORT = buildDressReport(
  { generations: [SHOP, API], errors: [], unused: [] },
  PROJECTS,
  'test-suites'
)

describe('buildDressReport', () => {
  it('should count tests per spec and the projects that pick them', () => {
    expect(REPORT.specs).toEqual([
      {
        spec: 'shop/cart.feature',
        layers: ['ui', 'e2e'],
        tests: 3,
        auto: 2,
        cyborg: 1,
        fixme: 0,
        runs: 4
      },
      { spec: 'prices.md', layers: ['api'], tests: 2, auto: 1, cyborg: 0, fixme: 1, runs: 2 }
    ])
    expect(REPORT.total).toEqual({ tests: 5, auto: 3, cyborg: 1, fixme: 1, runs: 6 })
    expect(REPORT.runs).toEqual([
      { project: 'cyborg', count: 1 },
      { project: 'api', count: 2 },
      { project: 'chrome', count: 2 },
      { project: 'tablet', count: 1 }
    ])
  })

  it('should list the steps a person walks per test, with or without a definition', () => {
    expect(REPORT.toAutomate).toEqual([
      {
        spec: 'shop/cart.feature',
        suite: 'cart',
        missing: true,
        tests: [
          {
            title: 'Check colors',
            status: 'cyborg',
            steps: [
              { title: 'Then colors match', location: 'src/steps/cart.steps.ts:9' },
              { title: 'And logo is sharp', location: undefined }
            ]
          }
        ]
      },
      {
        spec: 'prices.md',
        suite: 'prices',
        missing: false,
        tests: [
          {
            title: 'Discounts',
            status: 'fixme',
            steps: [{ title: 'Verify discount', location: undefined }]
          }
        ]
      }
    ])
  })

  it('should list disabled tests and known bugs, one device ones included', () => {
    expect(REPORT.disabled).toEqual([
      { spec: 'shop/cart.feature', title: 'Add to cart', tags: ['@fail:tablet'] },
      { spec: 'shop/cart.feature', title: 'Old flow', tags: ['@skip'] }
    ])
  })
})

describe('renderDressConsole', () => {
  it('should show the specs table, runs, steps to automate and disabled tests', () => {
    const text = renderDressConsole(REPORT)

    expect(text).toContain('  Spec               Layer    Tests  Auto  Cyborg  Fixme  Runs')
    expect(text).toContain('  shop/cart.feature  ui, e2e      3     2       1      -     4')
    expect(text).toContain('  Runs: cyborg 1 · api 2 · chrome 2 · tablet 1')
    expect(text).toContain('    Check colors (cyborg: a person walks these steps)')
    expect(text).toContain(
      '      • Then colors match - definition without code: src/steps/cart.steps.ts:9'
    )
    expect(text).toContain('      • And logo is sharp - no step definition')
    expect(text).toContain('    💡  Skeletons: npm run steps cart')
    expect(text).toContain('  shop/cart.feature › Add to cart  @fail:tablet')
  })
})

describe('renderDressMarkdown', () => {
  it('should write the same report with every spec row and the total', () => {
    const md = renderDressMarkdown(REPORT)

    expect(md).toContain('✅ Ready for the show: 5 tests, 6 runs')
    expect(md).toContain('| shop/cart.feature | ui, e2e | 3 | 2 | 1 | - | 4 |')
    expect(md).toContain('| prices.md | api | 2 | 1 | - | 1 | 2 |')
    expect(md).toContain('| **Total** |  | **5** | **3** | **1** | **1** | **6** |')
    expect(md).toContain(
      '- **Discounts** (fixme: an API test runs once all its steps are automated)'
    )
    expect(md).toContain('| `shop/cart.feature` | Old flow | `@skip` |')
    expect(md).not.toContain('## Errors')
  })

  it('should put errors first when the run would not start', () => {
    const md = renderDressMarkdown(
      buildDressReport(
        {
          generations: [],
          errors: [{ file: 'test-suites/a.md', errors: ['No layer\n  Fix: Tag it'] }],
          unused: []
        },
        PROJECTS
      )
    )

    expect(md).toContain('❌ Not ready for the show: 1 file(s) with errors')
    expect(md).toContain(
      '## Errors\n\n### `test-suites/a.md`\n\n```text\nNo layer\n  Fix: Tag it\n```'
    )
  })
})
