import fs from 'fs'
import path from 'path'

import { PATHS, SUFFIXES } from '../constants/paths'
import { getIcon } from './icons'
import { parseMDFile } from './md-parser'
import { addManualScript, addSuiteTag, extractSuiteName, getTagConstant } from './tags-updater'

type TestType = 'auto' | 'manual'

interface GeneratorConfig {
  type: TestType
  outputDir: string
  suffix: string
  importStatement: string
  testParams: string
  stepTemplate: (stepLiteral: string) => string
  tagConstant: string
  updateScripts: boolean
}

const GENERATOR_CONFIGS: Record<TestType, Omit<GeneratorConfig, 'tagConstant' | 'outputDir'>> = {
  auto: {
    type: 'auto',
    suffix: SUFFIXES.AUTO,
    importStatement: "import { test } from '@playwright/test'",
    testParams: '',
    stepTemplate: (stepLiteral) =>
      `await test.step(${stepLiteral}, async () => { /* TODO: Implement step logic */ });`,
    updateScripts: false
  },
  manual: {
    type: 'manual',
    suffix: SUFFIXES.MANUAL,
    importStatement: "import test from '@cyborgtests/test'",
    testParams: '{ manualStep }',
    stepTemplate: (stepLiteral) => `await manualStep(${stepLiteral});`,
    updateScripts: true
  }
}

export function generateTestFile(baseName: string, type: TestType): void {
  const mdData = parseMDFile(baseName)

  const outputDir = type === 'auto' ? PATHS.TESTS_AUTOMATED : PATHS.TESTS_MANUAL

  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const testPath = path.join(outputDir, `${baseName}.${type}.test.ts`)

  // Do not overwrite existing files (generation should be idempotent)
  if (fs.existsSync(testPath)) {
    return
  }

  const config = GENERATOR_CONFIGS[type]

  // Generate test cases
  const testCases = mdData.testCases
    .map((tc) => {
      let testTtl: string
      if (tc.id === null) {
        // No ID in MD - use title only
        testTtl = tc.ttl
      } else if (tc.id === '') {
        // Empty ID [] - use suffix without dash (MANUAL, AUTO, HYBRID)
        testTtl = `[${config.suffix.slice(1)}] ${tc.ttl}`
      } else {
        // Non-empty ID - use suffix with dash (TC01-01-MANUAL)
        testTtl = `[${tc.id}${config.suffix}] ${tc.ttl}`
      }
      const testTtlLiteral = JSON.stringify(testTtl)
      const steps = tc.stepTtls
        .map((step) => {
          const stepLiteral = JSON.stringify(step)
          return config.stepTemplate(stepLiteral)
        })
        .join('\n')
      return `test(${testTtlLiteral}, async (${config.testParams}) => {\n${steps}\n});`
    })
    .join('\n\n')

  // Build suite title (with suffix)
  let suiteDescribeTtl: string
  if (mdData.suiteID === '') {
    // Empty ID [] - use suffix without dash (MANUAL, AUTO, HYBRID)
    suiteDescribeTtl = `[${config.suffix.slice(1)}] ${mdData.suiteTtl}`
  } else if (mdData.suiteID) {
    // Non-empty ID - use suffix with dash (TS01-MANUAL)
    suiteDescribeTtl = `[${mdData.suiteID}${config.suffix}] ${mdData.suiteTtl}`
  } else {
    // No ID - use title only
    suiteDescribeTtl = mdData.suiteTtl
  }
  const suiteTtlLiteral = JSON.stringify(suiteDescribeTtl)

  // Determine tags
  const suiteName = extractSuiteName(baseName)
  const tagConstant = getTagConstant(suiteName)
  const tags = [`TAG.TEST.${type.toUpperCase()}`, `TAG.SUITE.${tagConstant}`]

  // Generate file content
  const content = `${config.importStatement}
import { TAG } from '../../src/constants/tags'

test.describe(${suiteTtlLiteral}, { tag: [${tags.join(', ')}] }, () => {
${testCases}
});`

  // Write file to disk
  fs.writeFileSync(testPath, content)
  // eslint-disable-next-line no-console
  console.log(`${getIcon('success')}  Generated: ${testPath}`)

  // Update tags.ts and optionally package.json
  try {
    addSuiteTag(suiteName)
    if (config.updateScripts) {
      addManualScript(suiteName)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    // eslint-disable-next-line no-console
    console.warn(`${getIcon('warning')}  Could not update tags/scripts: ${message}`)
  }
}

// Convenience wrappers
export function generateAutoTestFile(baseName: string): void {
  generateTestFile(baseName, 'auto')
}

export function generateManualTestFile(baseName: string): void {
  generateTestFile(baseName, 'manual')
}
