import { type BuildResult, buildTests } from '../bdd/build'
import type { GeneratedTest } from '../bdd/generator'
import { type Devices, isRunSettingTag } from '../constants/tags'
import { toPosix, toProjectPath } from '../utils/helpers'
import { type LastRunEntry, readLastRun, type RunOutcome } from './last-run'

/**
 * - automated: every step has a step definition
 * - cyborg: a person walks the steps without one (UI / E2E)
 * - fixme: API test with a step without step definition - waits for automation
 * - disabled: @skip / @fixme / @fail in the spec
 */
export type TestStatus = 'automated' | 'cyborg' | 'fixme' | 'disabled'

/** Last run of a test over its projects: any failed → failed, any flaky → flaky, all skipped → skipped */
export type RunState = RunOutcome | 'notRun'

export interface ProjectRun {
  project: string
  outcome: RunOutcome
}

export interface StepCount {
  automated: number
  total: number
}

export interface TestCoverage {
  title: string
  layer: string // api | ui | e2e
  devices: Devices // none (API) | desktop | all - desktops, tablets and mobiles
  status: TestStatus
  tags: string[] // spec tags of suite, rule and test case (layer excluded)
  steps: StepCount // Background steps included
  run: RunState
  runs: ProjectRun[] // latest result per project, none when the test has not run
}

export interface CoverageSummary {
  totalTests: number
  automatedTests: number
  cyborgTests: number
  fixmeTests: number
  disabledTests: number
  automatedPercent: number
  steps: StepCount
  run: Record<RunState, number> // tests by last run
}

export interface SuiteCoverage {
  spec: string // `/`-separated path, e.g. "test-suites/e2e/checkout.md"
  suiteTtl: string
  tests: TestCoverage[]
  summary: CoverageSummary
}

/** Tests of one spec tag across suites */
export interface TagCoverage {
  tag: string
  summary: CoverageSummary
}

export interface CoverageMatrix {
  generatedAt: string
  suites: SuiteCoverage[]
  summary: CoverageSummary
  tags: TagCoverage[] // most tests first; layers and run settings (@retries:2) have no group
  lastRunAt: string | null // end of the latest run among the tests shown
  errors: string[] // specs that could not be generated, problems that stop a run
}

/**
 * Coverage of every spec: each test generated from it (one per test case, one per examples row)
 * with its layer, whether a person still walks it and how many of its steps are automated
 */
export async function collectCoverageMatrix(): Promise<CoverageMatrix> {
  return buildCoverageMatrix(await buildTests(), readLastRun())
}

/** @param lastRun - results of the last-run reporter, matched by generated test file and title */
export function buildCoverageMatrix(
  { generations, errors }: Pick<BuildResult, 'generations' | 'errors'>,
  lastRun: LastRunEntry[] = []
): CoverageMatrix {
  const matched: LastRunEntry[] = []
  const suites = generations.map((generation): SuiteCoverage => {
    const file = toProjectPath(generation.testPath)
    const tests = generation.tests.map((test) => {
      const entries = lastRun.filter((entry) => entry.file === file && entry.title === test.title)
      matched.push(...entries)
      return toTestCoverage(test, entries)
    })
    return {
      spec: toPosix(generation.specPath),
      suiteTtl: generation.suiteTtl,
      tests,
      summary: summarize(tests)
    }
  })
  return {
    generatedAt: new Date().toISOString(),
    suites,
    summary: summarize(suites.flatMap((suite) => suite.tests)),
    tags: groupByTag(suites),
    lastRunAt:
      matched
        .map((entry) => entry.finishedAt)
        .sort()
        .at(-1) ?? null,
    errors: errors.flatMap(({ file, errors: messages }) =>
      messages.map((message) => `${toPosix(file)}: ${message}`)
    )
  }
}

/**
 * Keep tests with any of the spec tags; suites without such tests are dropped, summaries recounted
 */
export function filterCoverageByTags(matrix: CoverageMatrix, tags: string[]): CoverageMatrix {
  const suites = matrix.suites
    .map((suite) => {
      const tests = suite.tests.filter((test) => test.tags.some((tag) => tags.includes(tag)))
      return { ...suite, tests, summary: summarize(tests) }
    })
    .filter((suite) => suite.tests.length > 0)

  return {
    ...matrix,
    suites,
    summary: summarize(suites.flatMap((suite) => suite.tests)),
    tags: groupByTag(suites)
  }
}

function groupByTag(suites: SuiteCoverage[]): TagCoverage[] {
  const tests = suites.flatMap((suite) => suite.tests)
  const tags = [...new Set(tests.flatMap((test) => test.tags))].filter(
    (tag) => !isRunSettingTag(tag)
  )
  return tags
    .map((tag) => ({ tag, summary: summarize(tests.filter((test) => test.tags.includes(tag))) }))
    .sort((a, b) => b.summary.totalTests - a.summary.totalTests || a.tag.localeCompare(b.tag))
}

function toTestCoverage(test: GeneratedTest, entries: LastRunEntry[]): TestCoverage {
  const status: TestStatus = test.fixme
    ? 'fixme'
    : test.modifier
      ? 'disabled'
      : test.kind === 'cyborg'
        ? 'cyborg'
        : 'automated'
  return {
    title: test.title,
    layer: test.layer.slice(1),
    devices: test.devices,
    status,
    tags: test.tags,
    steps: test.steps,
    run: runState(entries.map((entry) => entry.outcome)),
    runs: entries.map(({ project, outcome }) => ({ project, outcome }))
  }
}

function runState(outcomes: RunOutcome[]): RunState {
  if (outcomes.length === 0) return 'notRun'
  if (outcomes.includes('failed')) return 'failed'
  if (outcomes.includes('flaky')) return 'flaky'
  return outcomes.every((outcome) => outcome === 'skipped') ? 'skipped' : 'passed'
}

function summarize(tests: TestCoverage[]): CoverageSummary {
  const count = (status: TestStatus) => tests.filter((test) => test.status === status).length
  const automatedTests = count('automated')
  return {
    totalTests: tests.length,
    automatedTests,
    cyborgTests: count('cyborg'),
    fixmeTests: count('fixme'),
    disabledTests: count('disabled'),
    automatedPercent: tests.length ? Math.round((automatedTests / tests.length) * 100) : 0,
    run: {
      passed: tests.filter((test) => test.run === 'passed').length,
      failed: tests.filter((test) => test.run === 'failed').length,
      flaky: tests.filter((test) => test.run === 'flaky').length,
      skipped: tests.filter((test) => test.run === 'skipped').length,
      notRun: tests.filter((test) => test.run === 'notRun').length
    },
    steps: tests.reduce<StepCount>(
      (sum, test) => ({
        automated: sum.automated + test.steps.automated,
        total: sum.total + test.steps.total
      }),
      { automated: 0, total: 0 }
    )
  }
}
