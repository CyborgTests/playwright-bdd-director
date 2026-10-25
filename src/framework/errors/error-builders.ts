/**
 * Error builder helpers - eliminate code duplication in error messages
 * All error messages follow a consistent format: context and fix suggestion
 */

/**
 * Build file not found error
 */
export function buildFileNotFoundError(specPath: string): string {
  return `Spec file not found: ${specPath}\n  Fix: Create the spec file or check its path`
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
  return `Invalid line format (expected: heading, list item "- ", tags line "@tag", table row or blank line)\nFound: "${line}"`
}

export function buildInvalidTagError(tag: string, file: string): string {
  return (
    `Invalid tag "${tag}"\n` +
    `  File: ${file}\n` +
    `  Fix: Tags start with @ followed by letters, digits, _ . : / -, e.g. "@smoke @JIRA-123"`
  )
}

export function buildTagsPlacementError(line: string, file: string): string {
  return (
    `Tags line in wrong place: "${line}"\n` +
    `  File: ${file}\n` +
    `  Fix: Put the tags line above the ## suite or ### test case heading, as in Gherkin`
  )
}

export function buildTablePlacementError(line: string, file: string): string {
  return (
    `Table in wrong place: "${line}"\n` +
    `  File: ${file}\n` +
    `  Fix: Put the examples table right under the ### test case heading, before its steps`
  )
}

export function buildExamplesError(
  problem: string,
  testCase: string,
  file: string,
  fix: string
): string {
  return `Examples of "${testCase}" ${problem}\n  File: ${file}\n  Fix: ${fix}`
}

export function buildBackgroundTagsError(line: string, file: string): string {
  return (
    `Background cannot have tags: "${line}"\n` +
    `  File: ${file}\n` +
    `  Fix: Background runs before every test of the suite - put the tags above the ## suite heading`
  )
}
