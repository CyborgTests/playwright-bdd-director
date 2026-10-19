/* eslint-disable no-console */
import { execSync } from 'child_process'

import { getIcon } from '@/framework/utils/icons'

/**
 * CLI wrapper for running playwright tests with different tags
 * Usage: npx tsx scripts/play.ts <testType> [suiteName]
 *
 * Examples:
 *   npx tsx scripts/play.ts auto           # All automated tests
 *   npx tsx scripts/play.ts cyborg         # All cyborg tests
 *   npx tsx scripts/play.ts cyborg auth    # Cyborg tests for auth suite
 *   npx tsx scripts/play.ts api ui auth    # API + UI tests for auth suite
 */

interface PlayConfig {
  testTypes?: ('auto' | 'cyborg' | 'api' | 'ui' | 'e2e')[]
  suiteNames?: string[]
  workers?: number
}

/**
 * Build grep pattern from test type and optional suite name
 */
function buildGrepPattern(config: PlayConfig): string {
  if (!config.testTypes || config.testTypes.length === 0) {
    if (config.suiteNames && config.suiteNames.length > 0) {
      const suiteTags = config.suiteNames.map((s) => `@${s}`).join('|')
      return `"${suiteTags}"`
    }
    // Run all tests - no grep filter
    return ''
  }

  const typeTags = config.testTypes.map((t) => `@${t}`).join('|')

  if (config.suiteNames && config.suiteNames.length > 0) {
    const suiteTags = config.suiteNames.map((s) => `@${s}`).join('|')
    return `"(${typeTags}).*(${suiteTags})"`
  }

  return `"${typeTags}"`
}

/**
 * Build playwright command from config
 */
function buildPlaywrightCommand(config: PlayConfig): string {
  const grepPattern = buildGrepPattern(config)

  let cmd = 'playwright test'

  if (grepPattern) {
    cmd += ` --grep ${grepPattern}`
  }

  if (config.workers) {
    cmd += ` --workers=${config.workers}`
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
  } catch (error: unknown) {
    // Show dress output - otherwise failure gives no hint which file or step broke
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer }
    console.error(`${stdout ?? ''}${stderr ?? ''}`)
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
    console.log(`\n${getIcon('success')}  Curtain call!`)
  } catch (_error) {
    console.error(`\n${getIcon('error')}  Show failed`)
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
  npm run play <types> <suites>

  Arguments must be in order: test types first, then suite names
  Example: npm run play api ui auth todo
  Example: npm run play cyborg auth

Test Types:
  auto      Run all automated tests (@auto)
  cyborg    Run all cyborg tests (@cyborg)
  api       Run API tests (@api)
  ui        Run UI tests (@ui)
  e2e       Run E2E tests (@e2e)

Examples:
  npm run play auto                 # All automated tests
  npm run play cyborg               # All cyborg tests
  npm run play cyborg auth          # Cyborg tests for auth suite
  npm run play api auth             # API auth tests
  npm run play ui auth              # UI auth tests
  npm run play api ui auth todo     # API + UI tests for auth + todo suites
  npm run play cyborg auto          # Cyborg + auto tests
  npm run play cyborg auto auth     # Cyborg + auto auth tests
  npm run play auth                 # All auth tests (any type)
  npm run play auth todo            # All auth + todo tests

Note:
  - Dress rehearsal (validation) runs automatically before tests
  - Cyborg tests use fullyParallel: false (sequential execution)
  - Auto tests use default worker count from playwright.config.ts
`)
}

/**
 * Parse CLI arguments
 */
function parseArgs(): PlayConfig | null {
  const args = process.argv.slice(2)

  if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showUsage()
    return null
  }

  // If no args, run all tests
  if (args.length === 0) {
    return {}
  }

  const validTypes: readonly ('auto' | 'cyborg' | 'api' | 'ui' | 'e2e')[] = [
    'auto',
    'cyborg',
    'api',
    'ui',
    'e2e'
  ]
  const providedTypes = args.filter((arg): arg is 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e' =>
    validTypes.includes(arg as 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e')
  )

  // Validate argument order: all test types must come before suite names
  if (providedTypes.length > 0) {
    let lastTypeIndex = -1
    let firstSuiteIndex = -1

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (validTypes.includes(arg as 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e')) {
        lastTypeIndex = i
      } else if (firstSuiteIndex === -1) {
        firstSuiteIndex = i
      }
    }

    // If we have both types and suites, check that types come first
    if (lastTypeIndex !== -1 && firstSuiteIndex !== -1 && lastTypeIndex > firstSuiteIndex) {
      console.error(
        `${getIcon('error')}  Invalid argument order: test types must come before suite names`
      )
      console.error('')
      console.error('  Correct usage: npm run play <types> <suites>')
      console.error('  Example: npm run play api ui auth todo')
      console.error('  Example: npm run play cyborg auth')
      process.exit(1)
    }
  }

  // If we have valid test types, use them
  if (providedTypes.length > 0) {
    const suiteNames = args.filter(
      (arg) => !validTypes.includes(arg as 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e')
    )
    return {
      testTypes: providedTypes,
      suiteNames: suiteNames.length > 0 ? suiteNames : undefined
    }
  }

  // Otherwise, treat args as suite names (no testTypes = run all)
  return {
    suiteNames: args
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
