export const PATHS = {
  TESTS_AUTOMATED: 'tests/automated',
  TESTS_MANUAL: 'tests/manual',
  TESTS_ARCHIVED: 'tests/archived',
  TAGS_FILE: 'src/constants/tags.ts',
  PACKAGE_JSON: 'package.json',
  TEST_SUITES: 'test-suites'
} as const

export const SUFFIXES = {
  AUTO: '-AUTO',
  MANUAL: '-MANUAL'
} as const

export const AST_IDENTIFIERS = {
  TEST_DESCRIBE: 'test.describe',
  TEST: 'test',
  MANUAL_STEP: 'manualStep',
  TEST_STEP: 'test.step'
} as const
