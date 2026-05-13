import { getIcon } from '../utils/icons'

/**
 * Error builder helpers - eliminate code duplication in error messages
 * All error messages follow consistent format with icon, context, and fix suggestion
 */

/**
 * Build duplicate ID error message
 * @param elementType - 'Suite ID', 'Test Case ID', 'Step ID'
 * @param id - The duplicate ID value
 * @param files - Array of file paths where ID appears
 */
export function buildDuplicateIDError(elementType: string, id: string, files: string[]): string {
  const icon = getIcon(getIconType(elementType))
  const fileList = files.map((f) => `    • ${f}`).join('\n')

  return (
    `${icon}  Duplicate ${elementType}: [${id}]\n` +
    `  Files:\n${fileList}\n` +
    `  Fix: Change the ID in one of the files to make it unique`
  )
}

/**
 * Build duplicate title error message
 * @param elementType - 'Test Suite', 'Test Case'
 * @param title - The duplicate title value
 * @param files - Array of file paths where title appears
 */
export function buildDuplicateTitleError(
  elementType: string,
  title: string,
  files: string[]
): string {
  const icon = getIcon(getIconType(elementType))
  const fileList = files.map((f) => `    • ${f}`).join('\n')

  return (
    `${icon}  Duplicate ${elementType} title: "${title}"\n` +
    `  Files:\n${fileList}\n` +
    `  Fix: Each ${elementType.toLowerCase()} must have a unique title`
  )
}

/**
 * Build duplicate title within file error
 */
export function buildDuplicateTitleInFileError(
  file: string,
  title: string,
  positions: number[]
): string {
  const icon = getIcon('testCase')
  const positionStr = positions.map((p) => `#${p}`).join(' and ')

  return (
    `${icon}  Duplicate Test Case title within same file\n` +
    `  File: ${file}\n` +
    `  Title: "${title}"\n` +
    `  Positions: Test Case ${positionStr}\n` +
    `  Fix: Use unique titles for test cases within the same suite`
  )
}

/**
 * Build file not found error
 */
export function buildFileNotFoundError(fileName: string, searchPath: string): string {
  return (
    `Markdown file not found: ${fileName}.md\n` +
    `  Searched in: ${searchPath}\n` +
    `  Fix: Create the markdown file or check the file name`
  )
}

/**
 * Build invalid format error with example
 */
export function buildInvalidFormatError(
  element: string,
  file: string,
  found: string,
  expected: string
): string {
  return (
    `Invalid ${element} format\n` +
    `  File: ${file}\n` +
    `  Line: "${found}"\n` +
    `  Expected: ${expected}`
  )
}

/**
 * Build missing element error with fix
 */
export function buildMissingElementError(element: string, file: string, fix: string): string {
  return `No ${element} found\n  File: ${file}\n  Expected: ${fix}`
}

/**
 * Build path traversal security error
 */
export function buildPathTraversalError(fileName: string): string {
  return (
    `Security: Path traversal detected\n` +
    `  File name: ${fileName}\n` +
    `  Reason: File names cannot contain "..", "/", "\\", or null bytes`
  )
}

/**
 * Build invalid characters error
 */
export function buildInvalidCharsError(fileName: string, allowedChars: string): string {
  return (
    `Invalid file name: ${fileName}\n` +
    `  Allowed characters: ${allowedChars}\n` +
    `  Example: "my-test-suite.md"`
  )
}

/**
 * Build cannot read file error
 */
export function buildCannotReadError(filePath: string, reason: string): string {
  return `Cannot read file\n  File: ${filePath}\n  Reason: ${reason}`
}

/**
 * Build MD structure validation errors (used in md-validator.ts)
 */

export function buildMissingH2Error(): string {
  return (
    `Missing test suite title\n` +
    `  Expected: One H2 heading (## Suite Title)\n` +
    `  Fix: Add "## [TS01] Your Suite Title" at the top`
  )
}

export function buildMultipleH2Error(count: number, locations: string): string {
  return (
    `Multiple test suite titles found (only one allowed)\n` +
    `Found ${count} H2 headings:\n${locations}\n` +
    `  Fix: Keep only one ## heading for the suite title`
  )
}

export function buildH2NotFirstError(found: string): string {
  return `First heading must be test suite title (H2)\nFound: ${found}\n  Fix: Start file with "## Suite Title"`
}

export function buildMissingH3Error(h2Text: string): string {
  return (
    `Test suite must have at least one test case (H3 heading)\n` +
    `${h2Text}\n\n` +
    `Expected:\n${h2Text}\n### [TC-01] First test case  ← Add test case\n#### Step 1`
  )
}

export function buildMissingH4Error(h3Text: string): string {
  return `Test case must have at least one step\n${h3Text}\n  Fix: Add "#### Step 1" under this test case`
}

export function buildInvalidHeadingOrderError(
  prevLevel: string,
  prevLine: number,
  currLevel: string,
  currLine: number
): string {
  return (
    `Invalid heading order: cannot skip levels\n` +
    `Previous: ${prevLevel} (line ${prevLine})\n` +
    `Current: ${currLevel} (line ${currLine})\n` +
    `  Fix: Headings must progress: H2 → H3 → H4 (no skipping)`
  )
}

export function buildInvalidLineFormatError(line: string): string {
  return `Invalid line format (expected: heading, list item "- ", or blank line)\nFound: "${line}"`
}

/**
 * Get icon type from element name
 */
function getIconType(elementType: string): 'suite' | 'testCase' | 'step' | 'error' {
  const lower = elementType.toLowerCase()
  if (lower.includes('suite')) return 'suite'
  if (lower.includes('test case')) return 'testCase'
  if (lower.includes('step')) return 'step'
  return 'error'
}
