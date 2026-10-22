import fs from 'fs'
import path from 'path'

import { CONFIG } from '@/framework/config'
import {
  MD_EXAMPLES,
  MD_HEADINGS,
  MD_TABLE_PREFIX,
  SPEC_FILE_EXTENSION
} from '@/framework/constants/markdown'

import {
  buildBackgroundTagsError,
  buildExamplesError,
  buildFileNotFoundError,
  buildInvalidCharsError,
  buildInvalidFormatError,
  buildMissingElementError,
  buildPathTraversalError,
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

// Regex constants (compiled once, reused many times)
const VALID_FILENAME_PATTERN = /^[\w.-]+$/

export interface TestCase {
  id: string | null // TC-001, "" for empty brackets [], or null for no brackets
  ttl: string // User login with valid credentials
  stepTtls: string[]
  tags: string[] // "Tags: @smoke" under ### heading (Gherkin: Rule + Scenario tags)
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
  suiteTags: string[] // "Tags: @smoke" under ## heading (Gherkin: Feature tags)
  testCases: TestCase[]
}

// Cache for MD file lookups (performance optimization)
const mdFileCache = new Map<string, string | null>()

/**
 * Clear MD file cache
 * Call this to invalidate cached file paths (e.g., after file operations)
 */
export function clearMDCache(): void {
  mdFileCache.clear()
}

/**
 * Parse MD file and extract test suite with multiple test cases
 *
 * Format with IDs (in brackets):
 * ## [TS01] Suite Title
 * ### [TC01-01] Test case ttl
 * Tags: @smoke @critical (optional, right under ## or ### heading)
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
export function parseMDFile(fileName: string): ParsedMD {
  const mdPath = resolveMDPath(fileName)

  if (!mdPath) {
    throw new Error(buildFileNotFoundError(fileName, CONFIG.paths.testSuites))
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

  // Examples table ends at the first non-table line (blank included)
  const finishTable = () => {
    if (currentTestCase && tableLines.length > 0) {
      currentTestCase.examples = parseExamplesTable(tableLines, currentTestCase.ttl, mdPath)
    }
    tableLines = []
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

    // Tags line belongs to the heading right above it: suite (before first case) or case (before steps)
    const tags = parseTagsLine(trimmed)
    if (tags) {
      assertValidTags(tags, mdPath)
      if (suiteTtl && !currentTestCase) {
        suiteTags.push(...tags)
      } else if (currentTestCase && isBackgroundTitle(currentTestCase.ttl)) {
        throw new Error(buildBackgroundTagsError(trimmed, mdPath))
      } else if (currentTestCase && currentTestCase.stepTtls.length === 0) {
        currentTestCase.tags.push(...tags)
      } else {
        throw new Error(buildTagsPlacementError(trimmed, mdPath))
      }
      continue
    }

    // Suite ttl: ## [TS01] Title or ## Title -> extract ID + ttl (ID is optional)
    if (trimmed.startsWith(MD_HEADINGS.SUITE.PREFIX) && !suiteTtl) {
      const suiteWithIdMatch = trimmed.match(MD_HEADINGS.SUITE.REGEX_WITH_ID)
      const suiteNoIdMatch = trimmed.match(MD_HEADINGS.SUITE.REGEX_NO_ID)

      if (suiteWithIdMatch) {
        suiteID = suiteWithIdMatch[1].trim()
        suiteTtl = suiteWithIdMatch[2].trim()
        continue
      }

      if (suiteNoIdMatch) {
        suiteID = ''
        suiteTtl = suiteNoIdMatch[1].trim()
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
      currentTestCase = {
        id: tcMatchWithID[1].trim(), // "" for [], "TC01-01" for [TC01-01]
        ttl: tcMatchWithID[2].trim(),
        stepTtls: [],
        tags: [],
        examples: null
      }
      continue
    } else if (tcMatchNoID && trimmed.startsWith(MD_HEADINGS.TEST_CASE.PREFIX)) {
      // Save previous test case
      if (currentTestCase) {
        testCases.push(currentTestCase)
      }

      // No brackets - no ID
      currentTestCase = {
        id: null, // null = no brackets at all
        ttl: tcMatchNoID[1].trim(),
        stepTtls: [],
        tags: [],
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

function resolveMDPath(fileName: string): string | null {
  if (SPEC_FILE_EXTENSION.test(fileName) && fs.existsSync(fileName)) {
    return fileName
  }
  return findMdFile(fileName)
}

/**
 * Find spec file (`<name>.md` or `<name>.feature`) by name (without extension)
 * Uses cache for performance optimization
 * @throws Error if fileName contains path traversal characters
 */
function findMdFile(fileName: string): string | null {
  // Sanitize input: prevent path traversal attacks
  if (
    fileName.includes('..') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes('\0')
  ) {
    throw new Error(buildPathTraversalError(fileName))
  }

  // Validate allowed characters: alphanumeric, dash, underscore, dot
  if (!VALID_FILENAME_PATTERN.test(fileName)) {
    throw new Error(
      buildInvalidCharsError(fileName, 'letters, numbers, dash (-), underscore (_), dot (.)')
    )
  }

  // Check cache first
  if (mdFileCache.has(fileName)) {
    return mdFileCache.get(fileName)!
  }

  const search = (dir: string): string | null => {
    if (!fs.existsSync(dir)) return null

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const result = search(fullPath)
        if (result) return result
      } else if (entry.name === `${fileName}.md` || entry.name === `${fileName}.feature`) {
        return fullPath
      }
    }

    return null
  }

  const result = search(CONFIG.paths.testSuites)

  // Cache the result (even if null)
  mdFileCache.set(fileName, result)

  return result
}
