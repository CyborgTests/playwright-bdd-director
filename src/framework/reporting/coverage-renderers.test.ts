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
  steps: { automated: 5, total: 8 }
}

const TESTS: TestCoverage[] = [
  {
    title: 'Add <b>"item"</b> | cart',
    layer: 'ui',
    status: 'automated',
    tags: [],
    steps: { automated: 2, total: 2 }
  },
  {
    title: 'Check colors',
    layer: 'e2e',
    status: 'cyborg',
    tags: [],
    steps: { automated: 1, total: 3 }
  },
  {
    title: 'Price API',
    layer: 'api',
    status: 'fixme',
    tags: [],
    steps: { automated: 0, total: 1 }
  },
  {
    title: 'Old flow',
    layer: 'ui',
    status: 'disabled',
    tags: [],
    steps: { automated: 2, total: 2 }
  }
]

const MATRIX: CoverageMatrix = {
  generatedAt: '2026-10-21T00:00:00.000Z',
  suites: [{ spec: 'test-suites/shop.md', suiteTtl: 'Shop', tests: TESTS, summary: SUMMARY }],
  summary: SUMMARY,
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
    expect(rowCells(lines[header])).toEqual(['Test', 'Layer', 'Status', 'Steps auto'])
    expect(rowCells(lines[header + 2])).toEqual(['Check colors', 'E2E', '✋ cyborg', '1/3'])
    expect(rowCells(lines[header + 3])).toEqual(['Price API', 'API', '○ fixme', '0/1'])
    expect(lines.some((line) => /^\s+Steps automated\s?█+░+\s+63% 5\/8$/.test(line))).toBe(true)
    expect(output).not.toContain(ESC)
  })

  it('should colorize statuses only when color is on', () => {
    const output = renderConsole(MATRIX, { color: true })

    expect(output).toContain(`${ESC}32m✔ auto`)
    expect(output).toContain(`${ESC}36m✋ cyborg`)
    expect(output).toContain(`${ESC}33m○ fixme`)
  })
})

describe('renderMarkdown', () => {
  it('should render a table per suite and escape pipes', () => {
    const markdown = renderMarkdown(MATRIX)

    expect(markdown).toContain('## Shop')
    expect(markdown).toContain('| Test | Layer | Status | Steps automated |')
    expect(markdown).toContain('| Add <b>"item"</b> \\| cart | UI | ✅ auto | 2/2 |')
    expect(markdown).toContain('| Check colors | E2E | ✋ cyborg | 1/3 |')
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
  })

  it('should list specs that could not be generated', () => {
    const html = renderHtml({ ...MATRIX, errors: ['test-suites/x.md: Test "A" has no layer'] })

    expect(html).toContain('Not generated')
    expect(html).toContain('Test &quot;A&quot; has no layer')
  })
})
