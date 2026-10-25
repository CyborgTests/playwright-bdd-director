import path from 'path'

import { type BuildResult, buildTests } from '../bdd/build'
import type { GeneratedTest } from '../bdd/generator'
import type { Devices } from '../constants/tags'

/**
 * - automated: every step has a step definition
 * - cyborg: a person walks the steps without one (UI / E2E)
 * - fixme: API test with a step without step definition - waits for automation
 * - disabled: @skip / @fixme / @fail in the spec
 */
export type TestStatus = 'automated' | 'cyborg' | 'fixme' | 'disabled'

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
}

export interface CoverageSummary {
  totalTests: number
  automatedTests: number
  cyborgTests: number
  fixmeTests: number
  disabledTests: number
  automatedPercent: number
  steps: StepCount
}

export interface SuiteCoverage {
  spec: string // `/`-separated path, e.g. "test-suites/e2e/checkout.md"
  suiteTtl: string
  tests: TestCoverage[]
  summary: CoverageSummary
}

export interface CoverageMatrix {
  generatedAt: string
  suites: SuiteCoverage[]
  summary: CoverageSummary
  errors: string[] // specs that could not be generated, problems that stop a run
}

/**
 * Coverage of every spec: each test generated from it (one per test case, one per examples row)
 * with its layer, whether a person still walks it and how many of its steps are automated
 */
export async function collectCoverageMatrix(): Promise<CoverageMatrix> {
  return buildCoverageMatrix(await buildTests())
}

export function buildCoverageMatrix({
  generations,
  errors
}: Pick<BuildResult, 'generations' | 'errors'>): CoverageMatrix {
  const suites = generations.map((generation): SuiteCoverage => {
    const tests = generation.tests.map(toTestCoverage)
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

  return { ...matrix, suites, summary: summarize(suites.flatMap((suite) => suite.tests)) }
}

function toTestCoverage(test: GeneratedTest): TestCoverage {
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
    steps: test.steps
  }
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
    steps: tests.reduce<StepCount>(
      (sum, test) => ({
        automated: sum.automated + test.steps.automated,
        total: sum.total + test.steps.total
      }),
      { automated: 0, total: 0 }
    )
  }
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
