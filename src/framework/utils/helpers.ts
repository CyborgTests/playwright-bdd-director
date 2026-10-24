import path from 'path'

import { CONFIG } from '../config'
import {
  BACKGROUND_TTL,
  MD_TAGS_PREFIX,
  PLACEHOLDER_PATTERN,
  SPEC_FILE_EXTENSION,
  SPEC_TAG_PATTERN
} from '../constants/markdown'
import type { TestCase } from '../core/md-parser'
import { buildExamplesError, buildInvalidTagError } from '../errors/error-builders'

export interface ParsedID {
  id: string | null // null=no brackets, ""=[], "TC-01"=[TC-01]
  ttl: string
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Extract base name from spec file path (Markdown or Gherkin)
 * Example: "test-suites/todo.md" -> "todo", "test-suites/shop.feature" -> "shop"
 */
export function getMarkdownBaseName(mdFilePath: string): string {
  return path.basename(mdFilePath).replace(SPEC_FILE_EXTENSION, '')
}

/**
 * Spec path inside test suites dir, `/`-separated, without extension
 * Example: "test-suites/e2e/checkout.md" -> "e2e/checkout"
 */
export function getSuiteKey(mdFilePath: string, testSuitesDir = CONFIG.paths.testSuites): string {
  return path
    .relative(testSuitesDir, mdFilePath)
    .split(/[\\/]/)
    .join('/')
    .replace(SPEC_FILE_EXTENSION, '')
}

/**
 * Background Test Case ("Background" or "Background: name") - implemented by a named
 * test.beforeEach instead of test(), so its steps run before every test of the suite
 */
export function isBackgroundTitle(ttl: string): boolean {
  return ttl === BACKGROUND_TTL || ttl.startsWith(`${BACKGROUND_TTL}:`)
}

/**
 * Tags of MD "Tags:" line (space or comma separated), null for any other line
 * Example: "Tags: @smoke, @critical" -> ["@smoke", "@critical"]
 */
export function parseTagsLine(line: string): string[] | null {
  if (!line.startsWith(MD_TAGS_PREFIX)) return null
  return line
    .slice(MD_TAGS_PREFIX.length)
    .split(/[\s,]+/)
    .filter(Boolean)
}

/**
 * @throws Error for a tag outside SPEC_TAG_PATTERN (no leading @, spaces, quotes...)
 */
export function assertValidTags(tags: string[], specPath: string): void {
  const invalid = tags.find((tag) => !SPEC_TAG_PATTERN.test(tag))
  if (invalid !== undefined) throw new Error(buildInvalidTagError(invalid, specPath))
}

/**
 * Column names used as `<column>` placeholders in text, in order of appearance
 */
export function getPlaceholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1])
}

/**
 * Examples table is rectangular with unique column names, and the test case title has a
 * placeholder with a different value in every row - Playwright needs unique test titles
 * @throws Error with fix hint
 */
export function assertValidExamples(testCase: TestCase, specPath: string): void {
  const { examples, ttl } = testCase
  if (!examples) return
  const fail = (problem: string, fix: string): never => {
    throw new Error(buildExamplesError(problem, ttl, specPath, fix))
  }

  const { columns, rows } = examples
  if (columns.some((column) => !column) || new Set(columns).size !== columns.length) {
    fail('have empty or repeated column names', 'Give every column a unique name')
  }
  if (rows.length === 0) fail('have no rows', 'Add at least one data row under the header')
  const badRow = rows.findIndex((row) => row.length !== columns.length)
  if (badRow >= 0) {
    fail(
      `row ${badRow + 1} has ${rows[badRow].length} cells, header has ${columns.length}`,
      'Make every row as wide as the header'
    )
  }

  const isUnique = (column: string) => {
    const values = rows.map((row) => row[columns.indexOf(column)])
    return new Set(values).size === values.length
  }
  const titleColumns = getPlaceholders(ttl).filter((name) => columns.includes(name))
  if (!titleColumns.some(isUnique)) {
    fail(
      'make test titles repeat',
      `Add a placeholder of a column with unique values to the title, e.g. "${ttl} as <${columns[0]}>"`
    )
  }
}

/**
 * Non-empty test case IDs must be unique within a spec ([] is allowed for all cases)
 * @throws Error listing duplicate IDs
 */
export function assertUniqueTestCaseIds(testCases: TestCase[], specPath: string): void {
  const ids = testCases.map((tc) => tc.id).filter((id): id is string => !!id)
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]
  if (duplicates.length === 0) return

  throw new Error(
    `Duplicate test case IDs found in ${specPath}:\n` +
      duplicates.map((id) => `  - [${id}]`).join('\n') +
      `\n\nEach test case must have a unique ID.`
  )
}

/**
 * Extract base name from test file name
 * Example: "todo.test.ts" -> "todo"
 * @throws Error if fileName is invalid (empty or no segments)
 */
export function getTestFileBaseName(fileName: string): string {
  const parts = fileName.split('.')
  if (parts.length === 0 || !parts[0]) {
    throw new Error(`Invalid file name: ${fileName} (expected format: <base>.<type>.test.ts)`)
  }
  return parts[0]
}

/**
 * Parse text with optional ID in brackets
 * @example
 * parseIDAndTitle('[TC-01] Test') → { id: 'TC-01', ttl: 'Test' }
 * parseIDAndTitle('[] Test') → { id: '', ttl: 'Test' }
 * parseIDAndTitle('Test') → { id: null, ttl: 'Test' }
 */
export function parseIDAndTitle(text: string): ParsedID {
  const match = text.match(/^\[([^\]]*)\]\s*(.*)$/)
  if (match) {
    return {
      id: match[1].trim(),
      ttl: match[2].trim()
    }
  }
  return {
    id: null,
    ttl: text.trim()
  }
}

/**
 * `<column>` placeholders filled with row values; unknown columns stay as written
 */
export function fillPlaceholders(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/<([^<>\n]+)>/g, (match, column: string) => values[column] ?? match)
}

/**
 * Values of the examples row whose filled-in case title equals `ttl` - a test generated (or run)
 * per row: "Login as <role>" + "Login as admin" → { role: 'admin' }. Null for no such row.
 */
export function findExampleRow(
  testCase: Pick<TestCase, 'ttl' | 'examples'>,
  ttl: string
): Record<string, string> | null {
  for (const row of testCase.examples?.rows ?? []) {
    const values = Object.fromEntries(
      testCase.examples!.columns.map((column, i) => [column, row[i]])
    )
    if (fillPlaceholders(testCase.ttl, values) === ttl) return values
  }
  return null
}

/**
 * Test of a spec case: by ID when the case has one, else by title - as declared (`<column>`
 * kept) or filled with an examples row
 */
export function matchesSpecCase(
  specCase: Pick<TestCase, 'id' | 'ttl' | 'examples'>,
  test: { id: string | null; ttl: string }
): boolean {
  if (specCase.id) return test.id === specCase.id
  return test.ttl === specCase.ttl || findExampleRow(specCase, test.ttl) !== null
}
