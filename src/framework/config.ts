/**
 * Framework configuration with environment variable support
 */

export const CONFIG = {
  paths: {
    testSuites: process.env.TEST_SUITES_DIR ?? 'test-suites',
    // Tests generated from the specs on every run (gitignored) - Playwright testDir
    generatedTests: process.env.GENERATED_TESTS_DIR ?? '.director/tests',
    // Coverage matrix reports: <path>.json / .html / .md
    coverageMatrix: process.env.COVERAGE_MATRIX_FILE ?? 'test-results/coverage-matrix',
    // Written on every run for test management tools and CI
    cucumberReport: process.env.CUCUMBER_REPORT_FILE ?? 'test-results/cucumber-report.json',
    junitReport: process.env.JUNIT_REPORT_FILE ?? 'test-results/junit.xml',
    cucumberMessages: process.env.CUCUMBER_MESSAGES_FILE ?? 'test-results/cucumber-messages.ndjson',
    cucumberHtml: process.env.CUCUMBER_HTML_FILE ?? 'test-results/cucumber-report.html'
  },
  /**
   * Step definitions: files of `steps` are loaded before generation; `npm run steps <suite>` writes
   * skeletons to `<stepsDir>/<suite>.steps.ts`; generated tests take `test` from `fixtures`
   */
  bdd: {
    steps: process.env.BDD_STEPS ?? 'src/steps/**/*.steps.ts',
    stepsDir: process.env.BDD_STEPS_DIR ?? 'src/steps',
    fixtures: '@/fixtures'
  }
} as const
