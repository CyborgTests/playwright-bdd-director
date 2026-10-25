/**
 * Markdown heading constants
 * Single source of truth for MD structure
 */

/** Spec files: Markdown or Gherkin; the base name (without extension) pairs a spec with its tests */
export const SPEC_FILE_GLOB = '**/*.{md,feature}'
export const SPEC_FILE_EXTENSION = /\.(md|feature)$/

/** Gherkin Background as a Test Case title - implemented by a named test.beforeEach */
export const BACKGROUND_TTL = 'Background'

/**
 * Tags line right above suite (`##`) or test case (`###`) heading: `@smoke @critical` - as in
 * Gherkin. Tags become Playwright tags (`npm run play @smoke`).
 */
export const MD_TAG_PREFIX = '@'
export const SPEC_TAG_PATTERN = /^@[\w.:/-]+$/

/** Examples table row under test case heading: `| role | password |` */
export const MD_TABLE_PREFIX = '|'

/** Placeholder of examples column in titles and steps: `Login as <role>` */
export const PLACEHOLDER_PATTERN = /<([^<>\n]+)>/g

/** Horizontal rule - optional visual separator between test cases */
export const MD_HORIZONTAL_RULE = '---'

export const MD_HEADINGS = {
  SUITE: {
    PREFIX: '## ',
    REGEX_WITH_ID: /^##\s*\[([^\]]*)\]\s*(.+)/,
    REGEX_NO_ID: /^##\s+(.+)/,
    REGEX_FIX: /^##(?!#)\s*/,
    LABEL: 'H2'
  },
  TEST_CASE: {
    PREFIX: '### ',
    REGEX_WITH_ID: /^###\s*\[([^\]]*)\]\s*(.+)/,
    REGEX_NO_ID: /^###\s+(.+)/,
    REGEX_FIX: /^###(?!#)\s*/,
    LABEL: 'H3'
  },
  STEP: {
    PREFIX: '#### ',
    REGEX_WITH_ID: /^####\s*(\[[\w-]+\]\s*.+)/,
    REGEX_NO_ID: /^####\s+(.+)/,
    REGEX_FIX: /^####(?!#)\s*/,
    LABEL: 'H4'
  }
} as const

/**
 * Helper to check if line is a heading at specific level
 */
export function isHeading(line: string, level: 2 | 3 | 4): boolean {
  const trimmed = line.trim()
  switch (level) {
    case 2:
      return trimmed.startsWith(MD_HEADINGS.SUITE.PREFIX) && !trimmed.startsWith('###')
    case 3:
      return trimmed.startsWith(MD_HEADINGS.TEST_CASE.PREFIX) && !trimmed.startsWith('####')
    case 4:
      return trimmed.startsWith(MD_HEADINGS.STEP.PREFIX)
  }
}

/**
 * Get heading level from line (2, 3, 4, or null)
 */
export function getHeadingLevel(line: string): 2 | 3 | 4 | null {
  const trimmed = line.trim()
  if (isHeading(trimmed, 4)) return 4
  if (isHeading(trimmed, 3)) return 3
  if (isHeading(trimmed, 2)) return 2
  return null
}

/**
 * Format examples for error messages
 */
export const MD_EXAMPLES = {
  SUITE_WITH_ID: '## [TS01] Suite Title',
  SUITE_NO_ID: '## Suite Title',
  TEST_CASE_NO_ID: '### Test case title'
} as const
