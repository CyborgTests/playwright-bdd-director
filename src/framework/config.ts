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
    // npm run dress writes what the console shows, to read later or attach to CI
    dressReport: process.env.DRESS_REPORT_FILE ?? 'test-results/dress-rehearsal.md',
    // Full output of failed generation with stack traces - the console shows it without them
    generationErrors: process.env.GENERATION_ERRORS_FILE ?? 'test-results/generation-errors.md',
    // Written on every run for test management tools and CI. Cucumber: <project>/cucumber-report.json
    // and cucumber-messages.ndjson per device for the tools, cucumber-report.html of all for people
    cucumberReports: process.env.CUCUMBER_REPORTS_DIR ?? 'test-results/cucumber',
    junitReport: process.env.JUNIT_REPORT_FILE ?? 'test-results/junit.xml'
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
