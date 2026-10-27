import { describe, expect, it } from 'vitest'

import type {
  CoverageMatrix,
  CoverageSummary,
  TestCoverage
} from '@/framework/reporting/coverage-matrix'
import {
  formatSummary,
  renderConsole,
  renderHtml,
  renderMarkdown
} from '@/framework/reporting/coverage-renderers'

const SUMMARY: CoverageSummary = {
  totalTests: 4,
  automatedTests: 1,
  cyborgTests: 1,
  fixmeTests: 1,
  disabledTests: 1,
  automatedPercent: 25,
  steps: { automated: 5, total: 8 },
  run: { passed: 1, failed: 1, flaky: 0, skipped: 1, notRun: 1 }
}

const TESTS: TestCoverage[] = [
  {
    title: 'Add <b>"item"</b> | cart',
    layer: 'ui',
    devices: 'all',
    status: 'automated',
    tags: [],
    steps: { automated: 2, total: 2 },
    run: 'passed',
    runs: [
      { project: 'chrome', outcome: 'passed' },
      { project: 'firefox', outcome: 'passed' }
    ]
  },
  {
    title: 'Check colors',
    layer: 'e2e',
    devices: 'desktop',
    status: 'cyborg',
    tags: [],
    steps: { automated: 1, total: 3 },
    run: 'failed',
    runs: [{ project: 'cyborg', outcome: 'failed' }]
  },
  {
    title: 'Price API',
    layer: 'api',
    devices: 'none',
    status: 'fixme',
    tags: [],
    steps: { automated: 0, total: 1 },
    run: 'skipped',
    runs: [{ project: 'api', outcome: 'skipped' }]
  },
  {
    title: 'Old flow',
    layer: 'ui',
    devices: 'desktop',
    status: 'disabled',
    tags: [],
    steps: { automated: 2, total: 2 },
    run: 'notRun',
    runs: []
  }
]

const MATRIX: CoverageMatrix = {
  generatedAt: '2026-10-21T00:00:00.000Z',
  suites: [{ spec: 'test-suites/shop.md', suiteTtl: 'Shop', tests: TESTS, summary: SUMMARY }],
  summary: SUMMARY,
  tags: [
    {
      tag: '@smoke',
      summary: {
        ...SUMMARY,
        totalTests: 2,
        cyborgTests: 1,
        automatedPercent: 50,
        run: { passed: 1, failed: 1, flaky: 0, skipped: 0, notRun: 0 }
      }
    }
  ],
  lastRunAt: '2026-10-26T21:47:17.000Z',
  errors: []
}

const ESC = '\x1b['

describe('formatSummary', () => {
  it('should list counts, percent and automated steps', () => {
    expect(formatSummary(SUMMARY)).toBe(
      '4 tests · automated 1 (25%) · cyborg 1 · fixme 1 · disabled 1 · steps automated 5/8'
    )
  })
})

describe('renderConsole', () => {
  const rowCells = (line: string) => line.trim().split(/\s{2,}/)

  it('should render suite header, column header, rows and totals without colors', () => {
    const output = renderConsole(MATRIX)
    const lines = output.split('\n')
    const header = lines.findIndex((line) => line.trim().startsWith('Test '))

    expect(lines).toContain('  Shop  test-suites/shop.md')
    expect(lines).toContain(`  ${'█'.repeat(5)}${'░'.repeat(15)}  25% automated 1/4`)
    expect(rowCells(lines[header])).toEqual([
      'Test',
      'Layer',
      'Devices',
      'Status',
      'Steps auto',
      'Last run'
    ])
    expect(rowCells(lines[header + 1]).at(-1)).toBe('✔ passed 2/2')
    expect(rowCells(lines[header + 2])).toEqual([
      'Check colors',
      'E2E',
      'desktop',
      '✋ cyborg',
      '1/3',
      '✘ failed 0/1 (cyborg)'
    ])
    expect(rowCells(lines[header + 3])).toEqual([
      'Price API',
      'API',
      '-',
      '○ fixme',
      '0/1',
      '⊘ skipped'
    ])
    expect(lines.some((line) => /^\s+Steps automated\s?█+░+\s+63% 5\/8$/.test(line))).toBe(true)
    expect(lines).toContain(
      '  Last run        passed 1 · failed 1 · flaky 0 · skipped 1 · not run 1 · 2026-10-26 21:47 UTC'
    )
    const byTag = lines.indexOf('  By tag')
    expect(rowCells(lines[byTag + 2])).toEqual(['Tag', 'Tests', 'Automated', 'Cyborg', 'Last run'])
    expect(rowCells(lines[byTag + 3])).toEqual([
      '@smoke',
      '2',
      '50% 1/2',
      '1',
      'passed 1/2 · failed 1'
    ])
    expect(output).not.toContain(ESC)
  })

  it('should colorize statuses only when color is on', () => {
    const output = renderConsole(MATRIX, { color: true })

    expect(output).toContain(`${ESC}32m✔ auto`)
    expect(output).toContain(`${ESC}36m✋ cyborg`)
    expect(output).toContain(`${ESC}33m○ fixme`)
    expect(output).toContain(`${ESC}31m✘ failed 0/1 (cyborg)`)
  })
})

describe('renderMarkdown', () => {
  it('should render a table per suite and escape pipes', () => {
    const markdown = renderMarkdown(MATRIX)

    expect(markdown).toContain('## Shop')
    expect(markdown).toContain('| Test | Layer | Devices | Status | Steps automated | Last run |')
    expect(markdown).toContain(
      '| Add <b>"item"</b> \\| cart | UI | all | ✅ auto | 2/2 | ✅ passed 2/2 |'
    )
    expect(markdown).toContain(
      '| Check colors | E2E | desktop | ✋ cyborg | 1/3 | ❌ failed 0/1 (cyborg) |'
    )
    expect(markdown).toContain('| Old flow | UI | desktop | ⏸️ disabled | 2/2 | — not run |')
    expect(markdown).toContain(
      '**Last run:** passed 1 · failed 1 · flaky 0 · skipped 1 · not run 1 · 2026-10-26 21:47 UTC'
    )
    expect(markdown).toContain('| @smoke | 2 | 50% 1/2 | 1 | 1 | 1 | passed 1/2 · failed 1 |')
  })

  it('should leave out the tag table when no test has a tag', () => {
    expect(renderMarkdown({ ...MATRIX, tags: [] })).not.toContain('## By tag')
  })

  it('should say when no test has run yet', () => {
    expect(renderMarkdown({ ...MATRIX, lastRunAt: null })).toContain(
      '**Last run:** no results yet - run the tests (npm run play)'
    )
  })
})

describe('renderHtml', () => {
  it('should escape titles and give every row its filter state', () => {
    const html = renderHtml(MATRIX)

    expect(html).toContain('Add &lt;b&gt;&quot;item&quot;&lt;/b&gt; | cart')
    expect(html).not.toContain('<b>"item"</b>')
    for (const status of ['automated', 'cyborg', 'fixme', 'disabled']) {
      expect(html.match(new RegExp(`<tr data-state="${status}">`, 'g'))).toHaveLength(1)
      expect(html).toContain(`data-filter="${status}"`)
    }
    expect(html).toContain('<td class="cell run-failed">✘ failed 0/1 (cyborg)</td>')
    expect(html).toContain(
      '<tr><th scope="row">@smoke</th><td>2</td><td>50% 1/2</td><td>1</td><td>1</td><td>1</td><td class="run-failed">passed 1/2 · failed 1</td></tr>'
    )
  })

  it('should list specs that could not be generated', () => {
    const html = renderHtml({ ...MATRIX, errors: ['test-suites/x.md: Test "A" has no layer'] })

    expect(html).toContain('Not generated')
    expect(html).toContain('Test &quot;A&quot; has no layer')
  })
})
