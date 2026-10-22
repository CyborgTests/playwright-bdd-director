import { describe, expect, it } from 'vitest'

import type {
  CaseCoverage,
  CoverageMatrix,
  CoverageSummary
} from '@/framework/reporting/coverage-matrix'
import {
  formatSummary,
  renderConsole,
  renderHtml,
  renderMarkdown
} from '@/framework/reporting/coverage-renderers'

const SUMMARY: CoverageSummary = {
  totalCases: 2,
  automatedCases: 1,
  cyborgOnlyCases: 1,
  uncoveredCases: 0,
  automatedPercent: 50,
  cyborgSteps: { automated: 1, total: 4 }
}

const CASES: CaseCoverage[] = [
  {
    id: 'TC-01',
    ttl: 'Add <b>"item"</b> | cart',
    isBackground: false,
    tags: [],
    examples: 0,
    cells: {
      cyborg: 'implemented',
      api: 'missing',
      ui: 'implemented',
      e2e: 'missing',
      auto: 'missing'
    },
    cyborgSteps: { automated: 1, total: 2 }
  },
  {
    id: null,
    ttl: 'Checkout',
    isBackground: false,
    tags: [],
    examples: 0,
    cells: {
      cyborg: 'implemented',
      api: 'disabled',
      ui: 'skeleton',
      e2e: 'missing',
      auto: 'missing'
    },
    cyborgSteps: { automated: 0, total: 2 }
  }
]

const MATRIX: CoverageMatrix = {
  generatedAt: '2026-10-21T00:00:00.000Z',
  layers: ['cyborg', 'api', 'ui', 'e2e'],
  suites: [{ spec: 'test-suites/shop.md', suiteTtl: 'Shop', cases: CASES, summary: SUMMARY }],
  summary: SUMMARY,
  errors: []
}

const ESC = '\x1b['

describe('formatSummary', () => {
  it('should list counts, percent and cyborg steps', () => {
    expect(formatSummary(SUMMARY)).toBe(
      '2 cases · automated 1 (50%) · cyborg-only 1 · uncovered 0 · cyborg steps 1/4'
    )
  })

  it('should omit cyborg steps when there are none', () => {
    expect(formatSummary({ ...SUMMARY, cyborgSteps: { automated: 0, total: 0 } })).not.toContain(
      'cyborg steps'
    )
  })
})

describe('renderConsole', () => {
  const rowCells = (line: string) => line.trim().split(/\s{2,}/)

  it('should render suite header, column header, cells and totals without colors', () => {
    const output = renderConsole(MATRIX)
    const lines = output.split('\n')
    const header = lines.findIndex((line) => line.trim().startsWith('Test case'))

    expect(lines).toContain('  Shop  test-suites/shop.md')
    expect(lines).toContain(`  ${'█'.repeat(10)}${'░'.repeat(10)}  50% automated 1/2`)
    expect(rowCells(lines[header])).toEqual(['Test case', 'Cyborg', 'API', 'UI', 'E2E'])
    expect(rowCells(lines[header + 1]).slice(1)).toEqual(['✔ 1/2', '—', '✔', '—'])
    expect(rowCells(lines[header + 2])).toEqual(['Checkout', '✔ 0/2', '⊘', '○', '—'])
    expect(lines.some((line) => /^\s+Automated\s+█+░+\s+50% 1\/2$/.test(line))).toBe(true)
    expect(output).toContain('25% 1/4 without manualStep()')
    expect(output).not.toContain(ESC)
  })

  it('should colorize statuses only when color is on', () => {
    const output = renderConsole(MATRIX, { color: true })

    expect(output).toContain(`${ESC}32m✔`)
    expect(output).toContain(`${ESC}35m⊘`)
    expect(output).toContain(`${ESC}33m○`)
  })

  it('should show n/a for disabled cyborg layer', () => {
    const cyborgOff: CoverageMatrix = {
      ...MATRIX,
      suites: [
        {
          ...MATRIX.suites[0],
          cases: [{ ...CASES[1], cells: { ...CASES[1].cells, cyborg: 'n/a' }, cyborgSteps: null }]
        }
      ]
    }

    expect(renderConsole(cyborgOff)).toMatch(/Checkout\s+n\/a/)
  })
})

describe('renderMarkdown', () => {
  it('should render a table per suite and escape pipes', () => {
    const markdown = renderMarkdown(MATRIX)

    expect(markdown).toContain('## Shop')
    expect(markdown).toContain('| Test case | Cyborg | API | UI | E2E |')
    expect(markdown).toContain('| [TC-01] Add <b>"item"</b> \\| cart | ✅ 1/2 | — | ✅ | — |')
    expect(markdown).toContain('| Checkout | ✅ 0/2 | ⏸️ | 🟡 | — |')
  })
})

describe('renderHtml', () => {
  it('should escape case titles and include every case with its filter state', () => {
    const html = renderHtml(MATRIX)

    expect(html).toContain('[TC-01] Add &lt;b&gt;&quot;item&quot;&lt;/b&gt; | cart')
    expect(html).not.toContain('<b>"item"</b>')
    expect(html.match(/<tr data-state="automated">/g)).toHaveLength(1)
    expect(html.match(/<tr data-state="cyborg-only">/g)).toHaveLength(1)
  })

  it('should list parse errors', () => {
    const html = renderHtml({ ...MATRIX, errors: ['tests/x.ui.test.ts: No test.describe() found'] })

    expect(html).toContain('Could not parse')
    expect(html).toContain('No test.describe() found')
  })
})

describe('parametrized test cases', () => {
  it('should show examples count next to the title', () => {
    const matrix: CoverageMatrix = {
      ...MATRIX,
      suites: [{ ...MATRIX.suites[0], cases: [{ ...CASES[1], ttl: 'Pay as <card>', examples: 3 }] }]
    }

    expect(renderConsole(matrix)).toContain('Pay as <card> ×3')
    expect(renderMarkdown(matrix)).toContain('| Pay as <card> ×3 |')
    expect(renderHtml(matrix)).toContain('Pay as &lt;card&gt; ×3')
  })
})
