/**
 * Framework configuration with environment variable support
 */

export const CONFIG = {
  paths: {
    testSuites: process.env.TEST_SUITES_DIR ?? 'test-suites',
    testsDir: process.env.TESTS_DIR ?? 'tests',
    testsAutomated: process.env.TESTS_AUTO_DIR ?? 'tests/automated/todo',
    testsCyborg: process.env.TESTS_CYBORG_DIR ?? 'tests/cyborg',
    testsArchived: process.env.TESTS_ARCHIVED_DIR ?? 'tests/archived',
    tagsFile: 'src/test-constants/tags.ts',
    // Coverage matrix reports: <path>.json / .html / .md
    coverageMatrix: process.env.COVERAGE_MATRIX_FILE ?? 'test-results/coverage-matrix',
    packageJson: 'package.json'
  },
  /**
   * Suites that get no cyborg twin from stage (nobody walks them by hand, e.g. API suites) and
   * pair with automated tests only. Entries are paths inside testSuites without `.md`:
   * a folder ("api") covers all its MDs, a file ("e2e/checkout") a single MD.
   */
  noCyborg: [] as readonly string[],
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    saveTo: process.env.METRICS_FILE ?? '.metrics.json'
  }
} as const
