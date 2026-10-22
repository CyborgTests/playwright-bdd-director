import {
  type CaseCoverage,
  type CellStatus,
  type CoverageLayer,
  type CoverageMatrix,
  type CoverageSummary,
  isCaseAutomated
} from './coverage-matrix'

const MAX_TITLE_WIDTH = 60

const CONSOLE_STATUS: Record<CellStatus, string> = {
  implemented: '✔',
  skeleton: '○',
  disabled: '⊘',
  missing: '—',
  'n/a': 'n/a'
}

const MD_STATUS: Record<CellStatus, string> = {
  implemented: '✅',
  skeleton: '🟡',
  disabled: '⏸️',
  missing: '—',
  'n/a': 'n/a'
}

const STATUS_LABEL: Record<CellStatus, string> = {
  implemented: 'implemented',
  skeleton: 'empty skeleton',
  disabled: 'skip / fixme / fail',
  missing: 'missing',
  'n/a': 'cyborg disabled for suite'
}

const LAYER_LABEL: Record<CoverageLayer, string> = {
  cyborg: 'Cyborg',
  api: 'API',
  ui: 'UI',
  e2e: 'E2E',
  bdd: 'BDD',
  auto: 'Auto'
}

const ANSI = { bold: 1, dim: 2, red: 31, green: 32, yellow: 33, magenta: 35, cyan: 36 } as const

type Paint = (style: keyof typeof ANSI, text: string) => string

const STATUS_STYLE: Record<CellStatus, keyof typeof ANSI> = {
  implemented: 'green',
  skeleton: 'yellow',
  disabled: 'magenta',
  missing: 'dim',
  'n/a': 'dim'
}

const BAR_WIDTH = 20

export interface ConsoleOptions {
  color?: boolean // ANSI colors - off for pipes, files and NO_COLOR
}

/**
 * Table per suite (own header and coverage bar) and summary block with bars - for terminal
 */
export function renderConsole(
  matrix: CoverageMatrix,
  { color = false }: ConsoleOptions = {}
): string {
  const paint: Paint = (style, text) => (color ? `\x1b[${ANSI[style]}m${text}\x1b[0m` : text)
  const titleWidth = Math.min(
    MAX_TITLE_WIDTH,
    Math.max(
      'Test case'.length,
      ...matrix.suites.flatMap((s) => s.cases.map((tc) => formatCaseTitle(tc).length))
    )
  )
  const columnWidths = matrix.layers.map((layer) =>
    Math.max(
      LAYER_LABEL[layer].length,
      ...matrix.suites.flatMap((s) => s.cases.map((tc) => formatConsoleCell(tc, layer).length))
    )
  )
  const row = (title: string, cells: string[]) =>
    `    ${title}  ${cells.map((cell, i) => cell.padEnd(columnWidths[i])).join('   ')}`.trimEnd()
  const lines = ['', paint('bold', 'Coverage Matrix'), '']

  for (const suite of matrix.suites) {
    lines.push(
      `  ${paint('bold', suite.suiteTtl)}  ${paint('dim', suite.spec)}`,
      `  ${formatBar(suite.summary.automatedPercent, paint)} automated ${suite.summary.automatedCases}/${suite.summary.totalCases}`,
      '',
      paint(
        'dim',
        row(
          'Test case'.padEnd(titleWidth),
          matrix.layers.map((layer) => LAYER_LABEL[layer])
        )
      )
    )
    for (const tc of suite.cases) {
      const title = truncate(formatCaseTitle(tc), titleWidth).padEnd(titleWidth)
      const cells = matrix.layers.map((layer, i) =>
        paint(STATUS_STYLE[tc.cells[layer]], formatConsoleCell(tc, layer).padEnd(columnWidths[i]))
      )
      lines.push(row(tc.isBackground ? paint('dim', title) : title, cells))
    }
    lines.push('')
  }

  const { summary } = matrix
  const share = (count: number, total: number) => (total ? Math.round((count / total) * 100) : 0)
  const totalLine = (
    label: string,
    count: number,
    total: number,
    style?: keyof typeof ANSI,
    suffix = ''
  ) =>
    `  ${label.padEnd(14)}${formatBar(share(count, total), paint, style)} ${count}/${total}${suffix}`

  lines.push(
    paint('dim', `  ${'─'.repeat(BAR_WIDTH + 30)}`),
    `  ${paint('bold', 'Total')}  ${summary.totalCases} test cases in ${matrix.suites.length} suite(s)`,
    totalLine('Automated', summary.automatedCases, summary.totalCases),
    totalLine('Cyborg only', summary.cyborgOnlyCases, summary.totalCases, 'yellow'),
    totalLine('Uncovered', summary.uncoveredCases, summary.totalCases, 'red'),
    totalLine(
      'Cyborg steps',
      summary.cyborgSteps.automated,
      summary.cyborgSteps.total,
      undefined,
      ' without manualStep()'
    ),
    '',
    paint(
      'dim',
      `  ${(['implemented', 'skeleton', 'disabled', 'missing'] as const)
        .map((status) => `${CONSOLE_STATUS[status]} ${STATUS_LABEL[status]}`)
        .join('   ')}   ✔ x/y cyborg steps automated`
    )
  )
  return lines.join('\n')
}

/**
 * `██████░░░░  60%` - by default green from 80%, yellow from 50%, red below (higher is better);
 * a fixed style suits shares where higher is worse (uncovered)
 */
function formatBar(percent: number, paint: Paint, fixedStyle?: keyof typeof ANSI): string {
  const filled = Math.round((percent / 100) * BAR_WIDTH)
  const style = fixedStyle ?? (percent >= 80 ? 'green' : percent >= 50 ? 'yellow' : 'red')
  return `${paint(style, '█'.repeat(filled))}${paint('dim', '░'.repeat(BAR_WIDTH - filled))} ${paint(style, `${percent}%`.padStart(4))}`
}

/**
 * Markdown table per suite with summary - for PR descriptions and wikis
 */
export function renderMarkdown(matrix: CoverageMatrix): string {
  const lines = ['# Coverage Matrix', '', `**Total:** ${formatSummary(matrix.summary)}`, '']

  for (const suite of matrix.suites) {
    lines.push(`## ${escapeMarkdown(suite.suiteTtl)}`, '')
    lines.push(`\`${suite.spec}\` · ${formatSummary(suite.summary)}`, '')
    lines.push(`| Test case | ${matrix.layers.map((layer) => LAYER_LABEL[layer]).join(' | ')} |`)
    lines.push(`| --- | ${matrix.layers.map(() => ':---:').join(' | ')} |`)
    for (const tc of suite.cases) {
      const cells = matrix.layers.map((layer) => formatMarkdownCell(tc, layer))
      lines.push(`| ${escapeMarkdown(formatCaseTitle(tc))} | ${cells.join(' | ')} |`)
    }
    lines.push('')
  }

  lines.push(
    `Legend: ${(['implemented', 'skeleton', 'disabled', 'missing'] as const)
      .map((status) => `${MD_STATUS[status]} ${STATUS_LABEL[status]}`)
      .join(' · ')} · cyborg ✔ x/y = automated/total steps`
  )
  return `${lines.join('\n')}\n`
}

/**
 * Self-contained HTML page (inline CSS/JS): collapsible suites, filters, light and dark theme
 */
export function renderHtml(matrix: CoverageMatrix): string {
  const { summary } = matrix
  const suites = matrix.suites
    .map((suite) => {
      const rows = suite.cases
        .map((tc) => {
          const state = isCaseAutomated(tc)
            ? 'automated'
            : tc.cells.cyborg === 'implemented'
              ? 'cyborg-only'
              : 'uncovered'
          const cells = matrix.layers
            .map((layer) => {
              const status = tc.cells[layer]
              return `<td class="cell ${status === 'n/a' ? 'na' : status}" title="${escapeHtml(`${layer}: ${STATUS_LABEL[status]}`)}">${escapeHtml(formatConsoleCell(tc, layer))}</td>`
            })
            .join('')
          return `<tr data-state="${tc.isBackground ? 'background' : state}"><th scope="row">${escapeHtml(formatCaseTitle(tc))}</th>${cells}</tr>`
        })
        .join('\n')
      return `<details open>
<summary><span class="suite">${escapeHtml(suite.suiteTtl)}</span> <code>${escapeHtml(suite.spec)}</code> <span class="pct">${suite.summary.automatedPercent}%</span></summary>
<table>
<thead><tr><th scope="col">Test case</th>${matrix.layers.map((layer) => `<th scope="col">${layer}</th>`).join('')}</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</details>`
    })
    .join('\n')

  const errors = matrix.errors.length
    ? `<section class="errors"><h2>Could not parse</h2><ul>${matrix.errors.map((e) => `<li><pre>${escapeHtml(e)}</pre></li>`).join('')}</ul></section>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coverage Matrix</title>
<link rel="icon" href="data:,">
<style>
:root {
  --bg: #ffffff; --surface: #f5f6f8; --text: #1b1f24; --muted: #5d6673; --border: #d8dce2;
  --ok: #1a7f37; --ok-bg: #dafbe1; --warn: #9a6700; --warn-bg: #fff4d4;
  --off: #8250df; --off-bg: #f1e8ff; --miss: #8c959f; --accent: #0969da;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d1117; --surface: #161b22; --text: #e6edf3; --muted: #8d96a0; --border: #30363d;
    --ok: #3fb950; --ok-bg: #12261e; --warn: #d29922; --warn-bg: #2b2111;
    --off: #a371f7; --off-bg: #221a33; --miss: #6e7681; --accent: #4493f8;
  }
}
:root[data-theme="dark"] {
  --bg: #0d1117; --surface: #161b22; --text: #e6edf3; --muted: #8d96a0; --border: #30363d;
  --ok: #3fb950; --ok-bg: #12261e; --warn: #d29922; --warn-bg: #2b2111;
  --off: #a371f7; --off-bg: #221a33; --miss: #6e7681; --accent: #4493f8;
}
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--text);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1100px; margin: 0 auto; }
h1 { margin: 0 0 4px; font-size: 22px; }
.meta { color: var(--muted); margin: 0 0 20px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
.card b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; }
.card span { color: var(--muted); }
.filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.filters button { font: inherit; padding: 6px 12px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--border); background: var(--surface); color: var(--text); }
.filters button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
details { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow-x: auto; }
summary { cursor: pointer; padding: 10px 14px; background: var(--surface); }
summary code { color: var(--muted); font-size: 12px; }
.suite { font-weight: 600; }
.pct { float: right; font-variant-numeric: tabular-nums; color: var(--muted); }
table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 480px; }
thead th:first-child { width: 50%; }
th, td { padding: 6px 10px; border-top: 1px solid var(--border); text-align: center; white-space: nowrap; }
th[scope="row"], thead th:first-child { text-align: left; font-weight: 400; white-space: normal; }
thead th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; }
tr[data-state="background"] th[scope="row"] { color: var(--muted); font-style: italic; }
.cell { font-variant-numeric: tabular-nums; }
.implemented { color: var(--ok); background: var(--ok-bg); }
.skeleton { color: var(--warn); background: var(--warn-bg); }
.disabled { color: var(--off); background: var(--off-bg); }
.missing, .na { color: var(--miss); }
.legend { color: var(--muted); margin-top: 16px; }
.empty { color: var(--muted); padding: 16px 0; }
.errors pre { white-space: pre-wrap; margin: 0; }
.hidden { display: none; }
</style>
</head>
<body>
<main>
<h1>Coverage Matrix</h1>
<p class="meta">Generated ${escapeHtml(matrix.generatedAt)}</p>
<div class="cards">
<div class="card"><b>${summary.automatedPercent}%</b><span>automated</span></div>
<div class="card"><b>${summary.automatedCases}/${summary.totalCases}</b><span>cases automated</span></div>
<div class="card"><b>${summary.cyborgOnlyCases}</b><span>cyborg only</span></div>
<div class="card"><b>${summary.uncoveredCases}</b><span>uncovered</span></div>
<div class="card"><b>${summary.cyborgSteps.automated}/${summary.cyborgSteps.total}</b><span>cyborg steps automated</span></div>
</div>
<div class="filters" role="group" aria-label="Filter test cases">
<button type="button" data-filter="all" aria-pressed="true">All</button>
<button type="button" data-filter="not-automated" aria-pressed="false">Not automated</button>
<button type="button" data-filter="cyborg-only" aria-pressed="false">Cyborg only</button>
<button type="button" data-filter="uncovered" aria-pressed="false">Uncovered</button>
</div>
${suites}
<p class="empty hidden">No test cases match this filter.</p>
<p class="legend">Cells: ✔ implemented · ○ empty skeleton · ⊘ skip / fixme / fail · — missing · cyborg ✔ x/y = automated/total steps. Background is shown but not counted.</p>
${errors}
</main>
<script>
document.querySelectorAll('[data-filter]').forEach(function (button) {
  button.addEventListener('click', function () {
    var filter = button.dataset.filter
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b === button))
    })
    document.querySelectorAll('tbody tr').forEach(function (row) {
      var state = row.dataset.state
      var visible = filter === 'all' ||
        (filter === 'not-automated' && (state === 'cyborg-only' || state === 'uncovered')) ||
        state === filter
      row.classList.toggle('hidden', !visible)
    })
    document.querySelectorAll('details').forEach(function (suite) {
      suite.classList.toggle('hidden', !suite.querySelector('tbody tr:not(.hidden)'))
    })
    document.querySelector('.empty').classList.toggle('hidden', !!document.querySelector('details:not(.hidden)'))
  })
})
</script>
</body>
</html>
`
}

export function formatSummary(summary: CoverageSummary): string {
  const steps = summary.cyborgSteps.total
    ? ` · cyborg steps ${summary.cyborgSteps.automated}/${summary.cyborgSteps.total}`
    : ''
  return (
    `${summary.totalCases} cases · automated ${summary.automatedCases} (${summary.automatedPercent}%)` +
    ` · cyborg-only ${summary.cyborgOnlyCases} · uncovered ${summary.uncoveredCases}${steps}`
  )
}

/**
 * Parametrized test case gets its examples count: `Login as <role> ×3`
 */
function formatCaseTitle(tc: CaseCoverage): string {
  const title = tc.id ? `[${tc.id}] ${tc.ttl}` : tc.ttl
  return tc.examples > 0 ? `${title} ×${tc.examples}` : title
}

/**
 * Implemented cyborg cell shows automated/total steps instead of a status mark
 */
function formatCyborgSteps(tc: CaseCoverage, layer: CoverageLayer): string | null {
  if (layer !== 'cyborg' || tc.cells.cyborg !== 'implemented' || !tc.cyborgSteps) return null
  return `${tc.cyborgSteps.automated}/${tc.cyborgSteps.total}`
}

function formatConsoleCell(tc: CaseCoverage, layer: CoverageLayer): string {
  const steps = formatCyborgSteps(tc, layer)
  return steps ? `${CONSOLE_STATUS.implemented} ${steps}` : CONSOLE_STATUS[tc.cells[layer]]
}

function formatMarkdownCell(tc: CaseCoverage, layer: CoverageLayer): string {
  const steps = formatCyborgSteps(tc, layer)
  return steps ? `${MD_STATUS.implemented} ${steps}` : MD_STATUS[tc.cells[layer]]
}

function truncate(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
