import { type BuildResult, buildTests } from '../bdd/build'
import type { GeneratedTest } from '../bdd/generator'
import { type Devices, isRunSettingTag } from '../constants/tags'
import { toPosix, toProjectPath } from '../utils/helpers'
import { runningProjects, type RunProject } from './dress-report'
import { type LastRunEntry, readLastRun, type RunOutcome } from './last-run'

/**
 * - automated: every step has a step definition
 * - cyborg: a person walks the steps without one (UI / E2E)
 * - fixme: API test with a step without step definition - waits for automation
 * - disabled: @skip / @fixme / @fail in the spec
 */
export type TestStatus = 'automated' | 'cyborg' | 'fixme' | 'disabled'

/**
 * Last run of a test on one project, or over all its projects: any failed → failed, any flaky →
 * flaky, none ran → notRun, the ones that ran skipped → skipped, else passed
 */
export type RunState = RunOutcome | 'notRun'

export interface ProjectRun {
  project: string
  outcome: RunState
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
  runs: ProjectRun[] // one per project that picks the test (device), latest result or notRun
}

export interface CoverageSummary {
  totalTests: number
  automatedTests: number
  cyborgTests: number
  fixmeTests: number
  disabledTests: number
  automatedPercent: number
  steps: StepCount
  runs: number // tests × the projects that pick them, as a full run has them
  run: Record<RunState, number> // those runs by last result
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
  untagged: CoverageSummary // tests in no tag group; a test with several tags is in each of them
  lastRunAt: string | null // end of the latest run among the tests shown
  errors: string[] // specs that could not be generated, problems that stop a run
}

/**
 * Coverage of every spec: each test generated from it (one per test case, one per examples row)
 * with its layer, whether a person still walks it, how many of its steps are automated and its
 * last run on every project (device) that picks it
 */
export async function collectCoverageMatrix(projects: RunProject[]): Promise<CoverageMatrix> {
  return buildCoverageMatrix(await buildTests(), readLastRun(), projects)
}

/**
 * @param lastRun - results of the last-run reporter, matched by generated test file and title
 * @param projects - Playwright projects; without them a test has the runs it was reported with
 */
export function buildCoverageMatrix(
  { generations, errors }: Pick<BuildResult, 'generations' | 'errors'>,
  lastRun: LastRunEntry[] = [],
  projects: RunProject[] = []
): CoverageMatrix {
  const matched: LastRunEntry[] = []
  const suites = generations.map((generation): SuiteCoverage => {
    const file = toProjectPath(generation.testPath)
    const tests = generation.tests.map((test) => {
      const entries = lastRun.filter((entry) => entry.file === file && entry.title === test.title)
      matched.push(...entries)
      const expected =
        projects.length > 0
          ? runningProjects(test, projects)
          : [...new Set(entries.map((entry) => entry.project))]
      return toTestCoverage(test, entries, expected)
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
    ...groupByTag(suites),
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
    ...groupByTag(suites)
  }
}

function groupByTag(suites: SuiteCoverage[]): Pick<CoverageMatrix, 'tags' | 'untagged'> {
  const tests = suites.flatMap((suite) => suite.tests)
  const groupTags = (test: TestCoverage) => test.tags.filter((tag) => !isRunSettingTag(tag))
  const tags = [...new Set(tests.flatMap(groupTags))]
    .map((tag) => ({ tag, summary: summarize(tests.filter((test) => test.tags.includes(tag))) }))
    .sort((a, b) => b.summary.totalTests - a.summary.totalTests || a.tag.localeCompare(b.tag))
  return { tags, untagged: summarize(tests.filter((test) => groupTags(test).length === 0)) }
}

function toTestCoverage(
  test: GeneratedTest,
  entries: LastRunEntry[],
  projects: string[]
): TestCoverage {
  const status: TestStatus = test.fixme
    ? 'fixme'
    : test.modifier
      ? 'disabled'
      : test.kind === 'cyborg'
        ? 'cyborg'
        : 'automated'
  const runs = projects.map(
    (project): ProjectRun => ({
      project,
      outcome: entries.find((entry) => entry.project === project)?.outcome ?? 'notRun'
    })
  )
  return {
    title: test.title,
    layer: test.layer.slice(1),
    devices: test.devices,
    status,
    tags: test.tags,
    steps: test.steps,
    run: runState(runs.map((run) => run.outcome)),
    runs
  }
}

function runState(outcomes: RunState[]): RunState {
  const ran = outcomes.filter((outcome) => outcome !== 'notRun')
  if (ran.length === 0) return 'notRun'
  if (ran.includes('failed')) return 'failed'
  if (ran.includes('flaky')) return 'flaky'
  return ran.every((outcome) => outcome === 'skipped') ? 'skipped' : 'passed'
}

function summarize(tests: TestCoverage[]): CoverageSummary {
  const count = (status: TestStatus) => tests.filter((test) => test.status === status).length
  const automatedTests = count('automated')
  const runs = tests.flatMap((test) => test.runs.map((run) => run.outcome))
  return {
    totalTests: tests.length,
    automatedTests,
    cyborgTests: count('cyborg'),
    fixmeTests: count('fixme'),
    disabledTests: count('disabled'),
    automatedPercent: tests.length ? Math.round((automatedTests / tests.length) * 100) : 0,
    runs: runs.length,
    run: {
      passed: runs.filter((outcome) => outcome === 'passed').length,
      failed: runs.filter((outcome) => outcome === 'failed').length,
      flaky: runs.filter((outcome) => outcome === 'flaky').length,
      skipped: runs.filter((outcome) => outcome === 'skipped').length,
      notRun: runs.filter((outcome) => outcome === 'notRun').length
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
