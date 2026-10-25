/* eslint-disable no-console */
import { execSync } from 'child_process'

import { desktopDevices, handheldDevices } from '@/config/devices'
import { getIcon } from '@/framework/utils/icons'

/**
 * Play - run the tests by type, suite, spec tag and device: `npm run play [types] [suites] [@tags]
 * [devices]` (see showUsage). Nothing to validate first: the tests are generated from the specs on
 * every run (playwright.config.ts).
 */

const TEST_TYPES = ['auto', 'cyborg', 'api', 'ui', 'e2e'] as const
type TestType = (typeof TEST_TYPES)[number]

/** Device ids are Playwright project names (src/config/devices.ts) */
const DEVICE_IDS = [...desktopDevices, ...handheldDevices].map((device) => device.id)

interface PlayConfig {
  testTypes?: TestType[]
  suiteNames?: string[]
  tags?: string[] // spec tags as written: '@smoke'
  devices?: string[] // device ids: 'chrome', 'mobile'
}

/**
 * Build grep pattern from test types, suite names and spec tags: alternatives inside a group,
 * every group required in any order; a tag ends at a space or the end (`@auth` is not `@auth-api`)
 */
function buildGrepPattern(config: PlayConfig): string {
  const groups = [config.testTypes, config.suiteNames, config.tags]
    .filter((names): names is string[] => !!names && names.length > 0)
    .map((names) =>
      names.map((name) => escapeRegExp(name.startsWith('@') ? name : `@${name}`)).join('|')
    )

  // Run all tests - no grep filter
  if (groups.length === 0) return ''
  return `"${groups.map((group) => `(?=.*(${group})(\\s|$))`).join('')}"`
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

  for (const device of config.devices ?? []) {
    cmd += ` --project=${device}`
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
  npm run play [types] [suites] [@tags] [devices]

  Test types come before suite names
  Spec tags (@tag lines above MD / Gherkin headings) start with @ and may go anywhere
  Devices (${DEVICE_IDS.join(', ')}) may go anywhere - without one every device runs

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
  npm run play api ui auth cart     # API + UI tests for auth + cart suites
  npm run play cyborg auto          # Cyborg + auto tests
  npm run play cyborg auto auth     # Cyborg + auto auth tests
  npm run play auth                 # All auth tests (any type)
  npm run play auth cart            # All auth + cart tests
  npm run play @smoke               # All tests tagged @smoke in spec
  npm run play ui auth @smoke       # UI auth tests tagged @smoke
  npm run play e2e mobile           # E2E tests on the mobile device only
  npm run play auto chrome firefox  # Automated tests on desktop browsers only

Note:
  - Tests are generated from the specs on every run; a step without step definition is walked
    by a person, so a test is cyborg until all its steps are automated
  - api / ui / e2e alone run automated tests; add cyborg for the cyborg ones (ui / e2e only)
  - Cyborg tests run one at a time; automated tests use the worker count of playwright.config.ts
  - UI / E2E tests run on every desktop browser; tagged @all-devices also on tablets and mobiles
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

  // Spec tags and devices may go anywhere - they narrow selected types / suites further
  const tags = allArgs.filter((arg) => arg.startsWith('@'))
  const devices = allArgs.filter((arg) => DEVICE_IDS.includes(arg))
  const config = parseTypesAndSuites(
    allArgs.filter((arg) => !arg.startsWith('@') && !DEVICE_IDS.includes(arg))
  )
  return {
    ...config,
    ...(tags.length > 0 ? { tags } : {}),
    ...(devices.length > 0 ? { devices } : {})
  }
}

/**
 * Test types and suite names (types first)
 */
function parseTypesAndSuites(args: string[]): PlayConfig {
  // If no args, run all tests
  if (args.length === 0) {
    return {}
  }

  const validTypes: readonly string[] = TEST_TYPES
  const providedTypes = args.filter((arg): arg is TestType => validTypes.includes(arg))

  // Validate argument order: all test types must come before suite names
  if (providedTypes.length > 0) {
    let lastTypeIndex = -1
    let firstSuiteIndex = -1

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (validTypes.includes(arg)) {
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
      console.error('  Example: npm run play api ui auth cart')
      console.error('  Example: npm run play cyborg auth')
      process.exit(1)
    }
  }

  // If we have valid test types, use them
  if (providedTypes.length > 0) {
    const suiteNames = args.filter((arg) => !validTypes.includes(arg))
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
