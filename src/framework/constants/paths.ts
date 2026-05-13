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

export const PATTERNS = {
  SUFFIX_ONLY: /^[A-Z]+$/
} as const
