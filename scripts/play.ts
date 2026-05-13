/* eslint-disable no-console */
import { execSync } from 'child_process'

import { getIcon } from '@/framework/utils/icons'

/**
 * CLI wrapper for running playwright tests with different tags
 * Usage: npx tsx scripts/play.ts <testType> [suiteName]
 *
 * Examples:
 *   npx tsx scripts/play.ts auto           # All automated tests
 *   npx tsx scripts/play.ts manual         # All manual tests
 *   npx tsx scripts/play.ts manual todo    # Manual tests for todo suite
 *   npx tsx scripts/play.ts hybrid         # All hybrid tests
 */

interface PlayConfig {
  testType: 'auto' | 'manual' | 'hybrid'
  suiteName?: string
  workers?: number
}

/**
 * Build grep pattern from test type and optional suite name
 */
function buildGrepPattern(config: PlayConfig): string {
  const typeTag = `@${config.testType}`

  if (config.suiteName) {
    const suiteTag = `@${config.suiteName}`
    return `"${typeTag}.*${suiteTag}"`
  }

  return `"${typeTag}"`
}

/**
 * Build playwright command from config
 */
function buildPlaywrightCommand(config: PlayConfig): string {
  const grepPattern = buildGrepPattern(config)
  const workers = config.workers ?? (config.testType === 'manual' ? 1 : undefined)

  let cmd = `playwright test --grep ${grepPattern}`

  if (workers) {
    cmd += ` --workers=${workers}`
  }

  return cmd
}

/**
 * Run dress rehearsal (validation) before tests
 */
function runDressRehearsal(): void {
  console.log(`${getIcon('start')}  Running dress rehearsal...`)
  try {
    execSync('tsx scripts/dress-rehearsal.ts', { stdio: 'pipe' })
    console.log(`${getIcon('success')}  Validation passed\n`)
  } catch (_error) {
    console.error(`${getIcon('error')}  Dress rehearsal failed. Fix errors before running tests.`)
    process.exit(1)
  }
}

/**
 * Run playwright tests with built command
 */
function runPlaywrightTests(config: PlayConfig): void {
  const command = buildPlaywrightCommand(config)

  try {
    execSync(command, { stdio: 'inherit' })
    console.log(`\n${getIcon('success')}  Tests completed!`)
  } catch (_error) {
    console.error(`\n${getIcon('error')}  Tests failed.`)
    process.exit(1)
  }
}

/**
 * Show usage information
 */
function showUsage(): void {
  console.log(`
${getIcon('info')}  Play CLI - Run Playwright tests with tag-based filtering

Usage:
  npx tsx scripts/play.ts <testType> [suiteName]

Test Types:
  auto      Run all automated tests (@auto)
  manual    Run all manual tests (@manual) [workers=1]
  hybrid    Run all hybrid tests (@hybrid) [workers=1]

Examples:
  npx tsx scripts/play.ts auto                 # All automated tests
  npx tsx scripts/play.ts manual               # All manual tests
  npx tsx scripts/play.ts manual todo          # Manual tests for todo suite
  npx tsx scripts/play.ts hybrid               # All hybrid tests

Note:
  - Dress rehearsal (validation) runs automatically before tests
  - Manual tests always use --workers=1 (sequential execution)
  - Auto tests use default worker count from playwright.config.ts
`)
}

/**
 * Parse CLI arguments
 */
function parseArgs(): PlayConfig | null {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showUsage()
    return null
  }

  const testType = args[0]

  if (!['auto', 'manual', 'hybrid'].includes(testType)) {
    console.error(`${getIcon('error')}  Invalid test type: ${testType}`)
    console.error(`${getIcon('info')}  Valid types: auto, manual, hybrid`)
    showUsage()
    process.exit(1)
  }

  return {
    testType: testType as 'auto' | 'manual' | 'hybrid',
    suiteName: args[1]
  }
}

/**
 * Main entry point
 */
function main() {
  const config = parseArgs()

  if (!config) {
    process.exit(0)
  }

  runDressRehearsal()
  runPlaywrightTests(config)
}

main()
