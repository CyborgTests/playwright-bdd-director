/**
 * Markdown heading constants
 * Single source of truth for MD structure
 */

export const MD_HEADINGS = {
  SUITE: {
    LEVEL: 2,
    PREFIX: '## ',
    REGEX_START: /^##\s/,
    REGEX_WITH_ID: /^##\s*\[([^\]]*)\]\s*(.+)/,
    REGEX_NO_ID: /^##\s+(.+)/,
    REGEX_FIX: /^##(?!#)\s*/,
    LABEL: 'H2',
    NAME: 'Test Suite'
  },
  TEST_CASE: {
    LEVEL: 3,
    PREFIX: '### ',
    REGEX_START: /^###\s/,
    REGEX_WITH_ID: /^###\s*\[([^\]]*)\]\s*(.+)/,
    REGEX_NO_ID: /^###\s+(.+)/,
    REGEX_FIX: /^###(?!#)\s*/,
    LABEL: 'H3',
    NAME: 'Test Case'
  },
  STEP: {
    LEVEL: 4,
    PREFIX: '#### ',
    REGEX_START: /^####\s/,
    REGEX_WITH_ID: /^####\s*(\[[\w-]+\]\s*.+)/,
    REGEX_NO_ID: /^####\s+(.+)/,
    REGEX_FIX: /^####(?!#)\s*/,
    LABEL: 'H4',
    NAME: 'Step'
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
  TEST_CASE_WITH_ID: '### [TC-01] Test case title',
  TEST_CASE_NO_ID: '### Test case title',
  STEP_WITH_ID: '#### [01-01-01] Step title',
  STEP_NO_ID: '#### Step title',
  FULL_STRUCTURE: `## [TS01] Suite Title\n\n### [TC-01] First test case\n\n#### Step 1`
} as const
