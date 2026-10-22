import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '../config'
import { SPEC_FILE_GLOB } from '../constants/markdown'
import { parseMDFile } from '../core/md-parser'
import { type ParsedTestCase, parseTestFile } from '../core/ts-parser'
import {
  getErrorMessage,
  getMarkdownBaseName,
  getTestFileBaseName,
  isBackgroundTitle,
  isCyborgDisabledFor,
  matchIDWithSuffix
} from '../utils/helpers'

export const COVERAGE_LAYERS = ['cyborg', 'api', 'ui', 'e2e', 'bdd', 'auto'] as const
export const AUTOMATED_LAYERS = ['api', 'ui', 'e2e', 'bdd', 'auto'] as const

/** Layers listed only when some suite has tests in them */
const OPTIONAL_LAYERS: readonly CoverageLayer[] = ['bdd', 'auto']

export type CoverageLayer = (typeof COVERAGE_LAYERS)[number]

/**
 * - implemented: test exists and does something
 * - skeleton: test exists with empty steps only (autogen / AUTO skeleton)
 * - disabled: test.skip/fixme/fail or inside describe.skip/fixme (bdd: scenario with missing steps)
 * - missing: no test for the case in this layer
 * - n/a: cyborg layer of a suite listed in CONFIG.noCyborg
 */
export type CellStatus = 'implemented' | 'skeleton' | 'disabled' | 'missing' | 'n/a'

export interface StepCount {
  automated: number
  total: number
}

export interface CaseCoverage {
  id: string | null
  ttl: string
  isBackground: boolean // shown, but not counted in summary
  tags: string[] // spec tags of suite and test case
  examples: number // rows of examples table, 0 for a plain test case
  cells: Record<CoverageLayer, CellStatus>
  cyborgSteps: StepCount | null // steps of cyborg test without manualStep()
}

export interface CoverageSummary {
  totalCases: number
  automatedCases: number // implemented in at least one automated layer
  cyborgOnlyCases: number // not automated, but walked by cyborg test
  uncoveredCases: number
  automatedPercent: number
  cyborgSteps: StepCount
}

export interface SuiteCoverage {
  spec: string // `/`-separated path, e.g. "test-suites/e2e/checkout.md"
  suiteTtl: string
  cases: CaseCoverage[]
  summary: CoverageSummary
}

export interface CoverageMatrix {
  generatedAt: string
  layers: CoverageLayer[] // `bdd` / `auto` are listed only when some suite has such tests
  suites: SuiteCoverage[]
  summary: CoverageSummary
  errors: string[] // specs / tests that could not be parsed
}

const STATUS_RANK: Record<CellStatus, number> = {
  'n/a': 0,
  missing: 0,
  skeleton: 1,
  disabled: 2,
  implemented: 3
}

/**
 * Build coverage matrix of all specs in CONFIG.paths.testSuites against tests in CONFIG.paths.testsDir
 */
export function collectCoverageMatrix(): CoverageMatrix {
  const specFiles = glob.sync(`${CONFIG.paths.testSuites}/${SPEC_FILE_GLOB}`).sort()
  const testFiles = glob.sync(`${CONFIG.paths.testsDir}/**/*.test.ts`, {
    nodir: true,
    ignore: [`${CONFIG.paths.testsArchived}/**`]
  })
  return buildCoverageMatrix(specFiles, testFiles)
}

export interface CoverageOptions {
  noCyborg?: readonly string[]
  testSuitesDir?: string
}

/**
 * Pair spec files with test files by base name (`<base>.<layer>.test.ts`) and match test cases
 * by ID (with suffix) or, for cases without ID, by title
 */
export function buildCoverageMatrix(
  specFiles: string[],
  testFiles: string[],
  { noCyborg = CONFIG.noCyborg, testSuitesDir = CONFIG.paths.testSuites }: CoverageOptions = {}
): CoverageMatrix {
  const errors: string[] = []
  const testsByBaseName = groupTestFiles(testFiles, errors)
  const suites: SuiteCoverage[] = []

  for (const specFile of specFiles) {
    let parsed
    try {
      parsed = parseMDFile(specFile)
    } catch (error: unknown) {
      errors.push(`${toPosix(specFile)}: ${getErrorMessage(error)}`)
      continue
    }

    const testsByLayer = testsByBaseName.get(getMarkdownBaseName(specFile)) ?? new Map()
    const cyborgDisabled = isCyborgDisabledFor(specFile, noCyborg, testSuitesDir)

    const cases = parsed.testCases.map((mdCase): CaseCoverage => {
      // Generated (bdd) tests run one test per examples row, titles filled with the row values
      const rowTitles = new Set(
        mdCase.examples?.rows.map((row) =>
          mdCase.ttl.replace(/<([^<>\n]+)>/g, (match, column: string) => {
            const index = mdCase.examples!.columns.indexOf(column)
            return index < 0 ? match : row[index]
          })
        )
      )
      const matchesCase = (tsCase: ParsedTestCase): boolean =>
        mdCase.id
          ? tsCase.id !== null && matchIDWithSuffix(mdCase.id, tsCase.id)
          : tsCase.ttl === mdCase.ttl || rowTitles.has(tsCase.ttl)
      const matchesByLayer = new Map(
        COVERAGE_LAYERS.map((layer) => [layer, (testsByLayer.get(layer) ?? []).filter(matchesCase)])
      )

      const cells = Object.fromEntries(
        COVERAGE_LAYERS.map((layer) => [
          layer,
          layer === 'cyborg' && cyborgDisabled
            ? 'n/a'
            : getCellStatus(matchesByLayer.get(layer) ?? [], layer)
        ])
      ) as Record<CoverageLayer, CellStatus>

      const cyborgCase = cyborgDisabled ? undefined : matchesByLayer.get('cyborg')?.[0]
      return {
        id: mdCase.id,
        ttl: mdCase.ttl,
        isBackground: isBackgroundTitle(mdCase.ttl),
        tags: [...new Set([...parsed.suiteTags, ...mdCase.tags])],
        examples: mdCase.examples?.rows.length ?? 0,
        cells,
        cyborgSteps: cyborgCase ? countAutomatedSteps(cyborgCase) : null
      }
    })

    suites.push({
      spec: toPosix(specFile),
      suiteTtl: parsed.suiteTtl,
      cases,
      summary: summarize(cases)
    })
  }

  const isUsed = (layer: CoverageLayer) =>
    suites.some((suite) => suite.cases.some((tc) => tc.cells[layer] !== 'missing'))
  return {
    generatedAt: new Date().toISOString(),
    layers: COVERAGE_LAYERS.filter((layer) => !OPTIONAL_LAYERS.includes(layer) || isUsed(layer)),
    suites,
    summary: summarize(suites.flatMap((suite) => suite.cases)),
    errors
  }
}

/**
 * Keep test cases with any of the spec tags (Background stays with the suite cases it serves);
 * suites without such cases are dropped, summaries recounted
 */
export function filterCoverageByTags(matrix: CoverageMatrix, tags: string[]): CoverageMatrix {
  const suites = matrix.suites
    .map((suite) => {
      const cases = suite.cases.filter((tc) => tc.tags.some((tag) => tags.includes(tag)))
      const background = cases.length > 0 ? suite.cases.filter((tc) => tc.isBackground) : []
      const kept = suite.cases.filter((tc) => cases.includes(tc) || background.includes(tc))
      return { ...suite, cases: kept, summary: summarize(kept) }
    })
    .filter((suite) => suite.cases.length > 0)

  return { ...matrix, suites, summary: summarize(suites.flatMap((suite) => suite.cases)) }
}

/**
 * Case is automated when an automated layer has it implemented
 */
export function isCaseAutomated(testCase: CaseCoverage): boolean {
  return AUTOMATED_LAYERS.some((layer) => testCase.cells[layer] === 'implemented')
}

/**
 * Parsed test cases by spec base name and layer (layer = segment of file name)
 */
function groupTestFiles(
  testFiles: string[],
  errors: string[]
): Map<string, Map<CoverageLayer, ParsedTestCase[]>> {
  const result = new Map<string, Map<CoverageLayer, ParsedTestCase[]>>()

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile)
    const segments = fileName.toLowerCase().split('.')
    const layer = COVERAGE_LAYERS.find((candidate) => segments.slice(1).includes(candidate))
    if (!layer) continue

    let testCases: ParsedTestCase[]
    try {
      testCases = parseTestFile(testFile).testCases
    } catch (error: unknown) {
      errors.push(`${toPosix(testFile)}: ${getErrorMessage(error)}`)
      continue
    }

    const baseName = getTestFileBaseName(fileName)
    const byLayer = result.get(baseName) ?? new Map<CoverageLayer, ParsedTestCase[]>()
    byLayer.set(layer, [...(byLayer.get(layer) ?? []), ...testCases])
    result.set(baseName, byLayer)
  }

  return result
}

/**
 * Best status among matching tests of layer (a case may be split across several files)
 */
function getCellStatus(matches: ParsedTestCase[], layer: CoverageLayer): CellStatus {
  return matches
    .map((tsCase): CellStatus => {
      // Cyborg test of only manualStep() calls is complete by design
      if (layer !== 'cyborg' && !tsCase.hasImplementation) return 'skeleton'
      return tsCase.modifier ? 'disabled' : 'implemented'
    })
    .reduce<CellStatus>(
      (best, status) => (STATUS_RANK[status] > STATUS_RANK[best] ? status : best),
      'missing'
    )
}

function countAutomatedSteps(tsCase: ParsedTestCase): StepCount {
  return {
    automated: tsCase.stepHasManual.filter((hasManual) => !hasManual).length,
    total: tsCase.stepHasManual.length
  }
}

function summarize(cases: CaseCoverage[]): CoverageSummary {
  const counted = cases.filter((tc) => !tc.isBackground)
  const automatedCases = counted.filter(isCaseAutomated).length
  const cyborgOnlyCases = counted.filter(
    (tc) => !isCaseAutomated(tc) && tc.cells.cyborg === 'implemented'
  ).length
  const cyborgSteps = cases.reduce<StepCount>(
    (sum, tc) => ({
      automated: sum.automated + (tc.cyborgSteps?.automated ?? 0),
      total: sum.total + (tc.cyborgSteps?.total ?? 0)
    }),
    { automated: 0, total: 0 }
  )

  return {
    totalCases: counted.length,
    automatedCases,
    cyborgOnlyCases,
    uncoveredCases: counted.length - automatedCases - cyborgOnlyCases,
    automatedPercent: counted.length ? Math.round((automatedCases / counted.length) * 100) : 0,
    cyborgSteps
  }
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
