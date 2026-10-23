/* eslint-disable no-console */
import { execSync } from 'child_process'

import { getIcon } from '@/framework/utils/icons'

/**
 * CLI wrapper for running playwright tests with different tags. Validation is not done here:
 * `npm run play` runs `dress` first, `npm run coldplay` skips it.
 * Usage: npx tsx scripts/play.ts <testType> [suiteName]
 *
 * Examples:
 *   npx tsx scripts/play.ts auto           # All automated tests
 *   npx tsx scripts/play.ts cyborg         # All cyborg tests
 *   npx tsx scripts/play.ts cyborg auth    # Cyborg tests for auth suite
 *   npx tsx scripts/play.ts api ui auth    # API + UI tests for auth suite
 *   npx tsx scripts/play.ts ui @smoke      # UI tests tagged @smoke in spec
 */

interface PlayConfig {
  testTypes?: ('auto' | 'cyborg' | 'api' | 'ui' | 'e2e' | 'bdd')[]
  suiteNames?: string[]
  tags?: string[] // spec tags as written: '@smoke'
  workers?: number
}

/**
 * Build grep pattern from test types, suite names and spec tags: alternatives inside a group,
 * groups in tag order of test title (TAG.TEST/TYPE, TAG.SUITE, then spec tags)
 */
function buildGrepPattern(config: PlayConfig): string {
  const groups = [config.testTypes, config.suiteNames, config.tags]
    .filter((names): names is string[] => !!names && names.length > 0)
    .map((names) => names.map((name) => (name.startsWith('@') ? name : `@${name}`)).join('|'))

  // Run all tests - no grep filter
  if (groups.length === 0) return ''
  if (groups.length === 1) return `"${groups[0]}"`
  return `"${groups.map((group) => `(${group})`).join('.*')}"`
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
  npm run play <types> <suites> <@tags>

  Arguments must be in order: test types first, then suite names
  Spec tags (Tags: line in MD, @tag in Gherkin) start with @ and may go anywhere
  Example: npm run play api ui auth todo
  Example: npm run play cyborg auth

Test Types:
  auto      Run all automated tests (@auto)
  cyborg    Run all cyborg tests (@cyborg)
  api       Run API tests (@api)
  ui        Run UI tests (@ui)
  e2e       Run E2E tests (@e2e)
  bdd       Run tests generated from step definitions style specs (@bdd)

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
  npm run play @smoke               # All tests tagged @smoke in spec
  npm run play ui auth @smoke       # UI auth tests tagged @smoke

Note:
  - npm run play runs dress rehearsal (validation) first, npm run coldplay skips it
  - Cyborg tests use fullyParallel: false (sequential execution)
  - Auto tests use default worker count from playwright.config.ts
`)
}

/**
 * Parse CLI arguments
 */
function parseArgs(): PlayConfig | null {
  const allArgs = process.argv.slice(2)

  if (allArgs[0] === 'help' || allArgs[0] === '--help' || allArgs[0] === '-h') {
    showUsage()
    return null
  }

  // Spec tags may go anywhere - they narrow selected types / suites further
  const tags = allArgs.filter((arg) => arg.startsWith('@'))
  const config = parseTypesAndSuites(allArgs.filter((arg) => !arg.startsWith('@')))
  return tags.length > 0 ? { ...config, tags } : config
}

/**
 * Test types and suite names (types first)
 */
function parseTypesAndSuites(args: string[]): PlayConfig {
  // If no args, run all tests
  if (args.length === 0) {
    return {}
  }

  const validTypes: readonly ('auto' | 'cyborg' | 'api' | 'ui' | 'e2e' | 'bdd')[] = [
    'auto',
    'cyborg',
    'api',
    'ui',
    'e2e',
    'bdd'
  ]
  const providedTypes = args.filter(
    (arg): arg is 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e' | 'bdd' =>
      validTypes.includes(arg as 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e' | 'bdd')
  )

  // Validate argument order: all test types must come before suite names
  if (providedTypes.length > 0) {
    let lastTypeIndex = -1
    let firstSuiteIndex = -1

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (validTypes.includes(arg as 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e' | 'bdd')) {
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
      (arg) => !validTypes.includes(arg as 'auto' | 'cyborg' | 'api' | 'ui' | 'e2e' | 'bdd')
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

  runPlaywrightTests(config)
}

main()
