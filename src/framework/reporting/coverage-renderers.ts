import type { Devices } from '../constants/tags'
import type { CoverageMatrix, CoverageSummary, StepCount, TestStatus } from './coverage-matrix'

const MAX_TITLE_WIDTH = 60

const DEVICES_LABEL: Record<Devices, string> = { none: '-', desktop: 'desktop', all: 'all' }

const CONSOLE_STATUS: Record<TestStatus, string> = {
  automated: '✔ auto',
  cyborg: '✋ cyborg',
  fixme: '○ fixme',
  disabled: '⊘ disabled'
}

const MD_STATUS: Record<TestStatus, string> = {
  automated: '✅ auto',
  cyborg: '✋ cyborg',
  fixme: '🟡 fixme',
  disabled: '⏸️ disabled'
}

const STATUS_LABEL: Record<TestStatus, string> = {
  automated: 'every step automated',
  cyborg: 'a person walks the steps without step definition',
  fixme: 'API test waiting for step definitions',
  disabled: '@skip / @fixme / @fail in the spec'
}

const ANSI = { bold: 1, dim: 2, red: 31, green: 32, yellow: 33, magenta: 35, cyan: 36 } as const

type Paint = (style: keyof typeof ANSI, text: string) => string

const STATUS_STYLE: Record<TestStatus, keyof typeof ANSI> = {
  automated: 'green',
  cyborg: 'cyan',
  fixme: 'yellow',
  disabled: 'magenta'
}

const BAR_WIDTH = 20
const STATUSES: TestStatus[] = ['automated', 'cyborg', 'fixme', 'disabled']

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
    Math.max('Test'.length, ...matrix.suites.flatMap((s) => s.tests.map((t) => t.title.length)))
  )
  const statusWidth = Math.max(...Object.values(CONSOLE_STATUS).map((label) => label.length))
  const row = (title: string, layer: string, devices: string, status: string, steps: string) =>
    `    ${title}  ${layer.padEnd(5)}  ${devices.padEnd(7)}  ${status}  ${steps}`.trimEnd()
  const lines = ['', paint('bold', 'Coverage Matrix'), '']

  for (const suite of matrix.suites) {
    lines.push(
      `  ${paint('bold', suite.suiteTtl)}  ${paint('dim', suite.spec)}`,
      `  ${formatBar(suite.summary.automatedPercent, paint)} automated ${suite.summary.automatedTests}/${suite.summary.totalTests}`,
      '',
      paint(
        'dim',
        row(
          'Test'.padEnd(titleWidth),
          'Layer',
          'Devices',
          'Status'.padEnd(statusWidth),
          'Steps auto'
        )
      )
    )
    for (const test of suite.tests) {
      lines.push(
        row(
          truncate(test.title, titleWidth).padEnd(titleWidth),
          test.layer.toUpperCase(),
          DEVICES_LABEL[test.devices],
          paint(STATUS_STYLE[test.status], CONSOLE_STATUS[test.status].padEnd(statusWidth)),
          formatSteps(test.steps)
        )
      )
    }
    lines.push('')
  }

  const { summary } = matrix
  const share = (count: number, total: number) => (total ? Math.round((count / total) * 100) : 0)
  const totalLine = (label: string, count: number, total: number, style?: keyof typeof ANSI) =>
    `  ${label.padEnd(16)}${formatBar(share(count, total), paint, style)} ${count}/${total}`

  lines.push(
    paint('dim', `  ${'─'.repeat(BAR_WIDTH + 30)}`),
    `  ${paint('bold', 'Total')}  ${summary.totalTests} tests in ${matrix.suites.length} suite(s)`,
    totalLine('Automated', summary.automatedTests, summary.totalTests),
    totalLine('Cyborg', summary.cyborgTests, summary.totalTests, 'cyan'),
    totalLine('Fixme (API)', summary.fixmeTests, summary.totalTests, 'yellow'),
    totalLine('Disabled', summary.disabledTests, summary.totalTests, 'magenta'),
    totalLine('Steps automated', summary.steps.automated, summary.steps.total),
    '',
    paint(
      'dim',
      `  ${STATUSES.map((status) => `${CONSOLE_STATUS[status]}: ${STATUS_LABEL[status]}`).join('   ')}`
    )
  )
  return lines.join('\n')
}

/**
 * `██████░░░░  60%` - by default green from 80%, yellow from 50%, red below (higher is better);
 * a fixed style suits shares that are neither good nor bad
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
    lines.push(
      '| Test | Layer | Devices | Status | Steps automated |',
      '| --- | :---: | :---: | :---: | :---: |'
    )
    for (const test of suite.tests) {
      lines.push(
        `| ${escapeMarkdown(test.title)} | ${test.layer.toUpperCase()} | ${DEVICES_LABEL[test.devices]} | ${MD_STATUS[test.status]} | ${formatSteps(test.steps)} |`
      )
    }
    lines.push('')
  }

  lines.push(
    `Legend: ${STATUSES.map((status) => `${MD_STATUS[status]} ${STATUS_LABEL[status]}`).join(' · ')}`
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
      const rows = suite.tests
        .map(
          (test) =>
            `<tr data-state="${test.status}"><th scope="row">${escapeHtml(test.title)}</th><td>${test.layer.toUpperCase()}</td><td>${DEVICES_LABEL[test.devices]}</td><td class="cell ${test.status}" title="${escapeHtml(STATUS_LABEL[test.status])}">${escapeHtml(CONSOLE_STATUS[test.status])}</td><td>${formatSteps(test.steps)}</td></tr>`
        )
        .join('\n')
      return `<details open>
<summary><span class="suite">${escapeHtml(suite.suiteTtl)}</span> <code>${escapeHtml(suite.spec)}</code> <span class="pct">${suite.summary.automatedPercent}%</span></summary>
<table>
<thead><tr><th scope="col">Test</th><th scope="col">Layer</th><th scope="col">Devices</th><th scope="col">Status</th><th scope="col">Steps automated</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</details>`
    })
    .join('\n')

  const errors = matrix.errors.length
    ? `<section class="errors"><h2>Not generated</h2><ul>${matrix.errors.map((e) => `<li><pre>${escapeHtml(e)}</pre></li>`).join('')}</ul></section>`
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
  --off: #8250df; --off-bg: #f1e8ff; --person: #0b6e99; --person-bg: #ddf4ff; --accent: #0969da;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d1117; --surface: #161b22; --text: #e6edf3; --muted: #8d96a0; --border: #30363d;
    --ok: #3fb950; --ok-bg: #12261e; --warn: #d29922; --warn-bg: #2b2111;
    --off: #a371f7; --off-bg: #221a33; --person: #58a6ff; --person-bg: #102a43; --accent: #4493f8;
  }
}
:root[data-theme="dark"] {
  --bg: #0d1117; --surface: #161b22; --text: #e6edf3; --muted: #8d96a0; --border: #30363d;
  --ok: #3fb950; --ok-bg: #12261e; --warn: #d29922; --warn-bg: #2b2111;
  --off: #a371f7; --off-bg: #221a33; --person: #58a6ff; --person-bg: #102a43; --accent: #4493f8;
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
thead th:first-child { width: 55%; }
th, td { padding: 6px 10px; border-top: 1px solid var(--border); text-align: center; white-space: nowrap; }
th[scope="row"], thead th:first-child { text-align: left; font-weight: 400; white-space: normal; }
thead th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; }
td { font-variant-numeric: tabular-nums; }
.automated { color: var(--ok); background: var(--ok-bg); }
.cyborg { color: var(--person); background: var(--person-bg); }
.fixme { color: var(--warn); background: var(--warn-bg); }
.disabled { color: var(--off); background: var(--off-bg); }
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
<div class="card"><b>${summary.automatedTests}/${summary.totalTests}</b><span>tests automated</span></div>
<div class="card"><b>${summary.cyborgTests}</b><span>cyborg</span></div>
<div class="card"><b>${summary.fixmeTests}</b><span>fixme (API)</span></div>
<div class="card"><b>${formatSteps(summary.steps)}</b><span>steps automated</span></div>
</div>
<div class="filters" role="group" aria-label="Filter tests">
<button type="button" data-filter="all" aria-pressed="true">All</button>
${STATUSES.map((status) => `<button type="button" data-filter="${status}" aria-pressed="false">${status[0].toUpperCase()}${status.slice(1)}</button>`).join('\n')}
</div>
${suites}
<p class="empty hidden">No tests match this filter.</p>
<p class="legend">${STATUSES.map((status) => `${escapeHtml(CONSOLE_STATUS[status])}: ${escapeHtml(STATUS_LABEL[status])}`).join(' · ')}. Steps automated include Background steps.</p>
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
      row.classList.toggle('hidden', filter !== 'all' && row.dataset.state !== filter)
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
  return (
    `${summary.totalTests} tests · automated ${summary.automatedTests} (${summary.automatedPercent}%)` +
    ` · cyborg ${summary.cyborgTests} · fixme ${summary.fixmeTests} · disabled ${summary.disabledTests}` +
    ` · steps automated ${formatSteps(summary.steps)}`
  )
}

function formatSteps({ automated, total }: StepCount): string {
  return `${automated}/${total}`
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
