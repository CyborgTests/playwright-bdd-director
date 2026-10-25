/* eslint-disable no-console */
import { spawnSync } from 'child_process'

import { CONFIG } from '@/framework/config'
import { getIcon } from '@/framework/utils/icons'

/**
 * CI entry point for any CI service: dress → automated tests → coverage matrix.
 * Cyborg tests are skipped (they need a person). Failed tests do not stop the matrix and reports,
 * the exit code reports every failed stage.
 *
 * Usage: npm run ci
 *   CI_MIN_COVERAGE=80 npm run ci   # also fail when automated coverage < 80%
 */
main()

function main(): void {
  const minCoverage = process.env.CI_MIN_COVERAGE
  if (minCoverage !== undefined && !/^\d+(\.\d+)?$/.test(minCoverage)) {
    console.error(
      `${getIcon('error')}  Invalid CI_MIN_COVERAGE="${minCoverage}": expected a percent, e.g. 80`
    )
    process.exit(1)
  }

  // Invalid specs or step definitions stop the run anyway - stop right away
  if (!run('Dress rehearsal', 'tsx scripts/dress-rehearsal.ts')) process.exit(1)

  const failed = [
    run('Automated tests', 'tsx scripts/play.ts auto'),
    run(
      'Coverage matrix',
      `tsx scripts/coverage-matrix.ts --json --html --md${minCoverage ? ` --min=${minCoverage}` : ''}`
    )
  ].filter((passed) => !passed).length

  console.log(`\n${getIcon('info')}  Artifacts to keep (CI "artifacts" / "test results"):`)
  for (const file of [
    CONFIG.paths.dressReport,
    CONFIG.paths.junitReport,
    `${CONFIG.paths.cucumberReports}/ (per device: <project>/cucumber-report.json)`,
    'test-results/monocart-report/',
    `${CONFIG.paths.coverageMatrix}.{html,json,md}`
  ]) {
    console.log(`    • ${file}`)
  }

  if (failed > 0) {
    console.error(`\n${getIcon('error')}  CI failed: ${failed} stage(s)`)
    process.exit(1)
  }
  console.log(`\n${getIcon('success')}  CI passed`)
}

/** Run a stage with its own output; true when it succeeded */
function run(stage: string, command: string): boolean {
  console.log(`\n${getIcon('start')}  ${stage}: ${command}\n`)
  const { status } = spawnSync(command, { stdio: 'inherit', shell: true })
  if (status !== 0) console.error(`\n${getIcon('error')}  ${stage} failed`)
  return status === 0
}
