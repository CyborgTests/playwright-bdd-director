import path from 'path'

import type { BuildResult } from '../bdd/build'
import type { GeneratedTest } from '../bdd/generator'
import { CONFIG } from '../config'
import { KIND_TAGS } from '../constants/tags'
import { getMarkdownBaseName, toPosix } from '../utils/helpers'
import { getIcon } from '../utils/icons'

/** Playwright project as far as picking tests goes */
export interface RunProject {
  name?: string
  grep?: RegExp | RegExp[]
  grepInvert?: RegExp | RegExp[] | null
}

export interface SpecCounts {
  tests: number
  auto: number
  cyborg: number
  fixme: number
  runs: number // tests × the projects that pick them
}

export interface SpecRow extends SpecCounts {
  spec: string // path inside test-suites
  layers: string[] // 'ui', 'e2e'
}

export interface ManualStep {
  title: string
  location?: string // step definition without code; none - no step definition at all
}

export interface TestToAutomate {
  title: string
  status: 'cyborg' | 'fixme'
  steps: ManualStep[]
}

export interface SpecToAutomate {
  spec: string
  suite: string // npm run steps <suite>
  missing: boolean // some steps have no step definition - skeletons help
  tests: TestToAutomate[]
}

export interface DisabledTest {
  spec: string
  title: string
  tags: string[] // @skip, @fixme, @fail, also for one device (@fail:tablet)
}

/**
 * What `npm run dress` tells: will the run start (errors), what runs where (specs, runs per
 * project), what is left to do (steps a person walks, disabled tests, unused step definitions)
 */
export interface DressReport {
  specs: SpecRow[]
  total: SpecCounts
  runs: Array<{ project: string; count: number }>
  toAutomate: SpecToAutomate[]
  disabled: DisabledTest[]
  unused: Array<{ pattern: string; location: string }>
  errors: BuildResult['errors']
}

const DISABLING_TAG = /^@(skip|fixme|fail)(:.+)?$/

export function buildDressReport(
  { generations, errors, unused }: BuildResult,
  projects: RunProject[],
  testSuitesDir = CONFIG.paths.testSuites
): DressReport {
  const runs = new Map(projects.map((project) => [project.name ?? '', 0]))
  const specs: SpecRow[] = []
  const toAutomate: SpecToAutomate[] = []
  const disabled: DisabledTest[] = []

  for (const generation of generations) {
    const spec = toPosix(path.relative(testSuitesDir, generation.specPath))
    const { tests } = generation
    let specRuns = 0
    for (const test of tests) {
      for (const project of runningProjects(test, projects)) {
        runs.set(project, runs.get(project)! + 1)
        specRuns++
      }
      const disabling = test.tags.filter((tag) => DISABLING_TAG.test(tag))
      if (disabling.length > 0) disabled.push({ spec, title: test.title, tags: disabling })
    }
    specs.push({
      spec,
      layers: [...new Set(tests.map((test) => test.layer.slice(1)))],
      ...countTests(tests),
      runs: specRuns
    })

    const pending = new Map(generation.pending.map((step) => [step.title, step.location]))
    const manualTests = tests.filter((test) => test.manual.length > 0)
    if (manualTests.length > 0) {
      toAutomate.push({
        spec,
        suite: getMarkdownBaseName(generation.specPath),
        missing: generation.missing.length > 0,
        tests: manualTests.map((test) => ({
          title: test.title,
          status: test.fixme ? 'fixme' : 'cyborg',
          steps: test.manual.map((title) => ({ title, location: pending.get(title) }))
        }))
      })
    }
  }

  return {
    specs,
    total: {
      ...countTests(generations.flatMap((generation) => generation.tests)),
      runs: specs.reduce((sum, row) => sum + row.runs, 0)
    },
    runs: [...runs]
      .filter(([, count]) => count > 0)
      .map(([project, count]) => ({ project, count })),
    toAutomate,
    disabled,
    unused: unused.map((definition) => ({
      pattern: String(definition.pattern),
      location: definition.location
    })),
    errors
  }
}

/**
 * Projects whose grep / grepInvert pick the test - Playwright matches them against the title
 * with the tags, the projects match tags only
 */
/** Projects whose grep picks the test - one run each */
export function runningProjects(test: GeneratedTest, projects: RunProject[]): string[] {
  const text = [...test.tags, test.layer, KIND_TAGS[test.kind]].join(' ')
  const matches = (patterns?: RegExp | RegExp[] | null) =>
    [patterns ?? []].flat().some((pattern) => pattern.test(text))
  return projects
    .filter((project) => (!project.grep || matches(project.grep)) && !matches(project.grepInvert))
    .map((project) => project.name ?? '')
}

function countTests(tests: GeneratedTest[]): Omit<SpecCounts, 'runs'> {
  return {
    tests: tests.length,
    auto: tests.filter((test) => test.kind === 'auto' && !test.fixme).length,
    cyborg: tests.filter((test) => test.kind === 'cyborg').length,
    fixme: tests.filter((test) => test.fixme).length
  }
}

const STATUS_NOTE: Record<TestToAutomate['status'], string> = {
  cyborg: 'cyborg: a person walks these steps',
  fixme: 'fixme: an API test runs once all its steps are automated'
}

const TABLE_HEADER = ['Spec', 'Layer', 'Tests', 'Auto', 'Cyborg', 'Fixme', 'Runs']

function tableRows(report: DressReport): string[][] {
  const cells = (counts: SpecCounts) =>
    [counts.tests, counts.auto, counts.cyborg, counts.fixme, counts.runs].map((n) =>
      n === 0 ? '-' : String(n)
    )
  return [
    ...report.specs.map((row) => [row.spec, row.layers.join(', '), ...cells(row)]),
    ['Total', '', ...cells(report.total)]
  ]
}

function stepNote(step: ManualStep): string {
  return step.location ? `definition without code: ${step.location}` : 'no step definition'
}

function runsLine(report: DressReport): string {
  return report.runs.map(({ project, count }) => `${project} ${count}`).join(' · ')
}

export function summaryLine(report: DressReport): string {
  return report.errors.length > 0
    ? `Not ready for the show: ${report.errors.length} file(s) with errors`
    : `Ready for the show: ${report.total.tests} tests, ${report.total.runs} runs`
}

/**
 * Terminal text; errors are printed apart (console-formatter), here only their count
 */
export function renderDressConsole(report: DressReport): string {
  const rows = [TABLE_HEADER, ...tableRows(report)]
  const widths = TABLE_HEADER.map((_, column) => Math.max(...rows.map((row) => row[column].length)))
  const lines = rows.map((row) =>
    `  ${row.map((cell, column) => (column < 2 ? cell.padEnd(widths[column]) : cell.padStart(widths[column]))).join('  ')}`.trimEnd()
  )
  lines.push('', `  Runs: ${runsLine(report)}`, '')

  if (report.toAutomate.length > 0) {
    lines.push('✋  To automate')
    for (const spec of report.toAutomate) {
      lines.push(`  ${spec.spec}`)
      for (const test of spec.tests) {
        lines.push(`    ${test.title} (${STATUS_NOTE[test.status]})`)
        test.steps.forEach((step) => lines.push(`      • ${step.title} - ${stepNote(step)}`))
      }
      if (spec.missing) lines.push(`    💡  Skeletons: npm run steps ${spec.suite}`)
    }
    lines.push('')
  }

  if (report.disabled.length > 0) {
    lines.push('💤  Disabled and known bugs')
    const width = Math.max(...report.disabled.map((test) => `${test.spec} › ${test.title}`.length))
    report.disabled.forEach((test) =>
      lines.push(`  ${`${test.spec} › ${test.title}`.padEnd(width)}  ${test.tags.join(' ')}`)
    )
    lines.push('')
  }

  if (report.unused.length > 0) {
    lines.push(`${getIcon('warning')}  Step definitions no spec uses`)
    report.unused.forEach((definition) =>
      lines.push(`  • ${definition.pattern} - ${definition.location}`)
    )
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * The same report as a Markdown file, errors included
 */
export function renderDressMarkdown(report: DressReport): string {
  const ok = report.errors.length === 0
  const lines = ['# Dress Rehearsal', '', `${ok ? '✅' : '❌'} ${summaryLine(report)}`, '']

  if (!ok) {
    lines.push('## Errors', '')
    for (const { file, errors } of report.errors) {
      lines.push(`### \`${file}\``, '', '```text', ...errors, '```', '')
    }
  }

  const md = (row: string[]) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`
  const rows = tableRows(report)
  const total = rows.pop()!
  lines.push(
    '## Specs',
    '',
    md(TABLE_HEADER),
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(md),
    md(total.map((cell) => (cell ? `**${cell}**` : ''))),
    '',
    `Runs: ${runsLine(report)}`,
    ''
  )

  if (report.toAutomate.length > 0) {
    lines.push('## To Automate', '')
    for (const spec of report.toAutomate) {
      lines.push(`### \`${spec.spec}\``, '')
      for (const test of spec.tests) {
        lines.push(`- **${test.title}** (${STATUS_NOTE[test.status]})`)
        test.steps.forEach((step) => lines.push(`  - ${step.title} - ${stepNote(step)}`))
      }
      if (spec.missing) lines.push('', `Skeletons: \`npm run steps ${spec.suite}\``)
      lines.push('')
    }
  }

  if (report.disabled.length > 0) {
    lines.push('## Disabled and Known Bugs', '', '| Spec | Test | Tags |', '| --- | --- | --- |')
    report.disabled.forEach((test) =>
      lines.push(md([`\`${test.spec}\``, test.title, `\`${test.tags.join(' ')}\``]))
    )
    lines.push('')
  }

  if (report.unused.length > 0) {
    lines.push('## Step Definitions No Spec Uses', '')
    report.unused.forEach((definition) =>
      lines.push(`- \`${definition.pattern}\` - ${definition.location}`)
    )
    lines.push('')
  }

  return `${lines.join('\n').trimEnd()}\n`
}
