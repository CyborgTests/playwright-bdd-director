import fs from 'fs'
import path from 'path'

import { CONFIG } from '@/framework/config'
import { MD_EXAMPLES, MD_HEADINGS } from '@/framework/constants/markdown'

import {
  buildFileNotFoundError,
  buildInvalidCharsError,
  buildInvalidFormatError,
  buildMissingElementError,
  buildPathTraversalError
} from '../errors/error-builders'

// Regex constants (compiled once, reused many times)
const VALID_FILENAME_PATTERN = /^[\w.-]+$/

export interface TestCase {
  id: string | null // TC-001, "" for empty brackets [], or null for no brackets
  ttl: string // User login with valid credentials
  stepTtls: string[]
}

export interface ParsedMD {
  suiteID: string // "" for [], "TS01" for [TS01], or "" for no brackets
  suiteTtl: string // Authentication
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
 */
export function parseMDFile(fileName: string): ParsedMD {
  const mdPath = resolveMDPath(fileName)

  if (!mdPath) {
    throw new Error(buildFileNotFoundError(fileName, CONFIG.paths.testSuites))
  }

  const content = fs.readFileSync(mdPath, 'utf-8')
  const lines = content.split('\n')

  let suiteID = ''
  let suiteTtl = ''
  const testCases: TestCase[] = []
  let currentTestCase: TestCase | null = null

  for (const line of lines) {
    const trimmed = line.trim()

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
        stepTtls: []
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
        stepTtls: []
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

  // Validate no duplicate IDs (only check non-empty IDs in brackets format)
  // Empty ID [] is allowed for all test cases (enables suffix-only matching)
  const idsWithBrackets = testCases
    .filter((tc) => tc.id !== null && tc.id !== '')
    .map((tc) => tc.id as string)
  const duplicateIDs = idsWithBrackets.filter((id, index) => idsWithBrackets.indexOf(id) !== index)

  if (duplicateIDs.length > 0) {
    const uniqueDuplicates = [...new Set(duplicateIDs)]
    throw new Error(
      `Duplicate test case IDs found in ${mdPath}:\n` +
        uniqueDuplicates.map((id) => `  - [${id}]`).join('\n') +
        `\n\nEach test case must have a unique ID.`
    )
  }

  return { suiteID, suiteTtl, testCases }
}

function resolveMDPath(fileName: string): string | null {
  if (fileName.endsWith('.md') && fs.existsSync(fileName)) {
    return fileName
  }
  return findMdFile(fileName)
}

/**
 * Find MD file by name (without extension)
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
      } else if (entry.name === `${fileName}.md`) {
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
