import fs from 'fs'

import { MD_EXAMPLES, MD_HEADINGS, MD_TABLE_PREFIX } from '@/framework/constants/markdown'

import {
  buildBackgroundTagsError,
  buildExamplesError,
  buildFileNotFoundError,
  buildInvalidFormatError,
  buildMissingElementError,
  buildTablePlacementError,
  buildTagsPlacementError
} from '../errors/error-builders'
import {
  assertUniqueTestCaseIds,
  assertValidExamples,
  assertValidTags,
  isBackgroundTitle,
  parseTagsLine
} from '../utils/helpers'
import { parseGherkinFile } from './gherkin-parser'

export interface TestCase {
  id: string | null // TC-001, "" for empty brackets [], or null for no brackets
  ttl: string // User login with valid credentials
  stepTtls: string[]
  tags: string[] // "@smoke" line above ### heading (Gherkin: Rule + Scenario tags)
  examples: ExamplesTable | null // data table under ### heading (Gherkin: Outline Examples)
}

/**
 * Parametrized test case data: title and steps use `<column>` placeholders, the test runs once
 * per row (TS: `for (const example of [{ column: 'value' }]) test(...)`)
 */
export interface ExamplesTable {
  columns: string[]
  rows: string[][]
}

export interface ParsedMD {
  suiteID: string // "" for [], "TS01" for [TS01], or "" for no brackets
  suiteTtl: string // Authentication
  suiteTags: string[] // "@ui" line above ## heading (Gherkin: Feature tags)
  testCases: TestCase[]
}

/**
 * Parse MD file and extract test suite with multiple test cases
 *
 * Format with IDs (in brackets):
 * @ui (optional tags line right above ## or ### heading - as in Gherkin)
 * ## [TS01] Suite Title
 * @smoke @critical
 * ### [TC01-01] Test case ttl
 * | role  |  (optional examples table under ### heading - parametrized test case)
 * | ----- |
 * | admin |
 * #### Step ttl
 * Optional comment text (ignored by validator)
 *
 * Format without IDs:
 * ## Suite Title
 * ### Test case ttl
 * #### Step ttl
 *
 * Note: IDs are only extracted if in brackets format [TC01-01]
 * Steps do not support IDs - they are just titles
 * Other formats (TC01-01:, TC01-01 -, etc.) are treated as part of ttl
 *
 * Gherkin specs (`.feature`) are parsed into the same structure (see gherkin-parser)
 */
export function parseMDFile(mdPath: string): ParsedMD {
  if (!fs.existsSync(mdPath)) {
    throw new Error(buildFileNotFoundError(mdPath))
  }

  if (mdPath.endsWith('.feature')) {
    return parseGherkinFile(mdPath)
  }

  const content = fs.readFileSync(mdPath, 'utf-8')
  const lines = content.split('\n')

  let suiteID = ''
  let suiteTtl = ''
  const suiteTags: string[] = []
  const testCases: TestCase[] = []
  let currentTestCase: TestCase | null = null
  let tableLines: string[] = []
  let pendingTags: string[] = [] // tags line(s) waiting for their heading below

  // Examples table ends at the first non-table line (blank included)
  const finishTable = () => {
    if (currentTestCase && tableLines.length > 0) {
      currentTestCase.examples = parseExamplesTable(tableLines, currentTestCase.ttl, mdPath)
    }
    tableLines = []
  }

  const takeTags = (): string[] => {
    const tags = pendingTags
    pendingTags = []
    return tags
  }
  // Background runs before every test case - it takes no tags of its own
  const takeTestCaseTags = (ttl: string): string[] => {
    if (isBackgroundTitle(ttl) && pendingTags.length > 0) {
      throw new Error(buildBackgroundTagsError(pendingTags.join(' '), mdPath))
    }
    return takeTags()
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Examples table belongs to the test case above it, before its steps
    if (trimmed.startsWith(MD_TABLE_PREFIX)) {
      if (
        !currentTestCase ||
        currentTestCase.stepTtls.length > 0 ||
        isBackgroundTitle(currentTestCase.ttl)
      ) {
        throw new Error(buildTablePlacementError(trimmed, mdPath))
      }
      if (currentTestCase.examples) {
        throw new Error(
          buildExamplesError(
            'have more than one table',
            currentTestCase.ttl,
            mdPath,
            'Merge the rows into one table'
          )
        )
      }
      tableLines.push(trimmed)
      continue
    }
    finishTable()

    // Tags line belongs to the next ## or ### heading, as in Gherkin (blank lines between pass)
    const tags = parseTagsLine(trimmed)
    if (tags) {
      assertValidTags(tags, mdPath)
      pendingTags.push(...tags)
      continue
    }
    if (pendingTags.length > 0 && trimmed !== '' && !isTaggableHeading(trimmed)) {
      throw new Error(buildTagsPlacementError(pendingTags.join(' '), mdPath))
    }

    // Suite ttl: ## [TS01] Title or ## Title -> extract ID + ttl (ID is optional)
    if (trimmed.startsWith(MD_HEADINGS.SUITE.PREFIX) && !suiteTtl) {
      const suiteWithIdMatch = trimmed.match(MD_HEADINGS.SUITE.REGEX_WITH_ID)
      const suiteNoIdMatch = trimmed.match(MD_HEADINGS.SUITE.REGEX_NO_ID)

      if (suiteWithIdMatch) {
        suiteID = suiteWithIdMatch[1].trim()
        suiteTtl = suiteWithIdMatch[2].trim()
        suiteTags.push(...takeTags())
        continue
      }

      if (suiteNoIdMatch) {
        suiteID = ''
        suiteTtl = suiteNoIdMatch[1].trim()
        suiteTags.push(...takeTags())
        continue
      }

      throw new Error(
        buildInvalidFormatError(
          'test suite title',
          mdPath,
          trimmed,
          `"${MD_EXAMPLES.SUITE_WITH_ID}" or "${MD_EXAMPLES.SUITE_NO_ID}"`
        )
      )
    }

    // Test case: ### [ANY-ID] Title -> extract ID + ttl (only if in brackets)
    // Test case: ### Title -> extract only ttl, no ID
    const tcMatchWithID = trimmed.match(MD_HEADINGS.TEST_CASE.REGEX_WITH_ID)
    const tcMatchNoID = trimmed.match(MD_HEADINGS.TEST_CASE.REGEX_NO_ID)

    if (tcMatchWithID) {
      // Save previous test case
      if (currentTestCase) {
        testCases.push(currentTestCase)
      }

      // ID in brackets format - extract ID (can be empty "" or "TC01-01")
      const ttl = tcMatchWithID[2].trim()
      currentTestCase = {
        id: tcMatchWithID[1].trim(), // "" for [], "TC01-01" for [TC01-01]
        ttl,
        stepTtls: [],
        tags: takeTestCaseTags(ttl),
        examples: null
      }
      continue
    } else if (tcMatchNoID && trimmed.startsWith(MD_HEADINGS.TEST_CASE.PREFIX)) {
      // Save previous test case
      if (currentTestCase) {
        testCases.push(currentTestCase)
      }

      // No brackets - no ID
      const ttl = tcMatchNoID[1].trim()
      currentTestCase = {
        id: null, // null = no brackets at all
        ttl,
        stepTtls: [],
        tags: takeTestCaseTags(ttl),
        examples: null
      }
      continue
    }

    // Step: #### Step title (no ID support for steps)
    // Comments after steps are ignored (any text that's not a heading)
    const stepMatch = trimmed.match(MD_HEADINGS.STEP.REGEX_NO_ID)

    if (stepMatch && currentTestCase && trimmed.startsWith(MD_HEADINGS.STEP.PREFIX)) {
      currentTestCase.stepTtls.push(stepMatch[1].trim())
    }
  }

  finishTable()
  if (pendingTags.length > 0) {
    throw new Error(buildTagsPlacementError(pendingTags.join(' '), mdPath))
  }

  // Save last test case
  if (currentTestCase) {
    testCases.push(currentTestCase)
  }

  if (!suiteTtl) {
    throw new Error(
      buildMissingElementError(
        'test suite title',
        mdPath,
        `File must start with ${MD_HEADINGS.SUITE.LABEL} heading (${MD_EXAMPLES.SUITE_NO_ID})`
      )
    )
  }

  if (testCases.length === 0) {
    throw new Error(
      buildMissingElementError(
        'test cases',
        mdPath,
        `At least one ${MD_HEADINGS.TEST_CASE.LABEL} heading (${MD_EXAMPLES.TEST_CASE_NO_ID})`
      )
    )
  }

  assertUniqueTestCaseIds(testCases, mdPath)
  testCases.forEach((tc) => assertValidExamples(tc, mdPath))

  return { suiteID, suiteTtl, suiteTags, testCases }
}

/** A tags line can only stand above a suite (`##`) or test case (`###`) heading */
function isTaggableHeading(line: string): boolean {
  return line.startsWith(MD_HEADINGS.SUITE.PREFIX) || line.startsWith(MD_HEADINGS.TEST_CASE.PREFIX)
}

/**
 * `| a | b |` header, `| --- | --- |` separator, data rows; `\|` escapes a pipe inside a cell
 */
function parseExamplesTable(lines: string[], caseTtl: string, mdPath: string): ExamplesTable {
  const [header, separator, ...rows] = lines.map(splitTableRow)
  if (!separator || !separator.every((cell) => /^:?-+:?$/.test(cell))) {
    throw new Error(
      buildExamplesError(
        'have no header separator row',
        caseTtl,
        mdPath,
        'Add "| --- | --- |" under the column names'
      )
    )
  }
  return { columns: header, rows }
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'))
}
