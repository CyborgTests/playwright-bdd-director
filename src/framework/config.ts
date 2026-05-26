/**
 * Framework configuration with environment variable support
 */

export const CONFIG = {
  paths: {
    testSuites: process.env.TEST_SUITES_DIR ?? 'test-suites',
    testsDir: process.env.TESTS_DIR ?? 'tests',
    testsAutomated: process.env.TESTS_AUTO_DIR ?? 'tests/todo',
    testsManual: process.env.TESTS_MANUAL_DIR ?? 'tests/manual',
    testsArchived: process.env.TESTS_ARCHIVED_DIR ?? 'tests/archived',
    tagsFile: 'src/test-constants/tags.ts',
    packageJson: 'package.json'
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    saveTo: process.env.METRICS_FILE ?? '.metrics.json'
  }
} as const
