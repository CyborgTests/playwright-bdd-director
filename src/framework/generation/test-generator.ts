import fs from 'fs'
import path from 'path'

import { CONFIG } from '@/framework/config'
import { SUFFIXES } from '@/framework/constants/test-files'

import { parseMDFile } from '../core/md-parser'
import { getIcon } from '../utils/icons'
import { addSuiteTag, extractSuiteName, getTagConstant } from './tags-updater'

type TestType = 'AUTO' | 'CYBORG'

/**
 * Test case title for generated code: MD ID gets the type suffix
 * (no ID → title only, `[]` → `[CYBORG] title`, `[tc01]` → `[tc01-CYBORG] title`)
 */
export function buildTestCaseTtl(id: string | null, ttl: string, type: TestType): string {
  const suffix = SUFFIXES[type]
  if (id === null) return ttl
  if (id === '') return `[${suffix.slice(1)}] ${ttl}`
  return `[${id}${suffix}] ${ttl}`
}

export function generateTestFile(baseName: string, type: TestType): boolean {
  const mdData = parseMDFile(baseName)

  const outputDir = type === 'AUTO' ? CONFIG.paths.testsAutomated : CONFIG.paths.testsCyborg

  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const testPath = path.join(outputDir, `${baseName}.${type.toLowerCase()}.test.ts`)

  // Do not overwrite existing files (generation should be idempotent)
  if (fs.existsSync(testPath)) {
    return false
  }

  // Determine configuration based on test type
  let suffix: string
  let importStatement: string
  let testParams: string
  let stepTemplate: (stepLiteral: string) => string

  if (type === 'AUTO') {
    suffix = SUFFIXES.AUTO
    importStatement = "import { test } from '@playwright/test'"
    testParams = ''
    stepTemplate = (stepLiteral) =>
      `await test.step(${stepLiteral}, async () => { /* TODO: Implement step logic */ });`
  } else {
    suffix = SUFFIXES.CYBORG
    importStatement = "import test from '@cyborgtests/test'"
    testParams = '{ manualStep }'
    stepTemplate = (stepLiteral) => `await manualStep(${stepLiteral});`
  }

  // Generate test cases
  const testCases = mdData.testCases
    .map((tc) => {
      const testTtlLiteral = JSON.stringify(buildTestCaseTtl(tc.id, tc.ttl, type))
      const steps = tc.stepTtls
        .map((step) => {
          const stepLiteral = JSON.stringify(step)
          return stepTemplate(stepLiteral)
        })
        .join('\n')
      return `test(${testTtlLiteral}, async (${testParams}) => {\n${steps}\n});`
    })
    .join('\n\n')

  // Build suite title (with suffix)
  let suiteDescribeTtl: string
  if (mdData.suiteID === '') {
    // Empty ID [] - use suffix without dash (MANUAL, AUTO)
    suiteDescribeTtl = `[${suffix.slice(1)}] ${mdData.suiteTtl}`
  } else if (mdData.suiteID) {
    // Non-empty ID - use suffix with dash (ts01-MANUAL)
    suiteDescribeTtl = `[${mdData.suiteID}${suffix}] ${mdData.suiteTtl}`
  } else {
    // No ID - use title only
    suiteDescribeTtl = mdData.suiteTtl
  }
  const suiteTtlLiteral = JSON.stringify(suiteDescribeTtl)

  // Determine tags
  const suiteName = extractSuiteName(baseName)
  const tagConstant = getTagConstant(suiteName)
  const tags = [`TAG.TEST.${type}`, `TAG.SUITE.${tagConstant}`]

  // Use .fixme for AUTO tests until implemented
  const describeMethod = type === 'AUTO' ? 'test.describe.fixme' : 'test.describe'

  // Generate file content
  const content = `${importStatement}
import { TAG } from '@/test-constants/tags'

${describeMethod}(${suiteTtlLiteral}, { tag: [${tags.join(', ')}] }, () => {
${testCases}
});`

  // Write file to disk
  fs.writeFileSync(testPath, content)

  // Update tags.ts
  try {
    addSuiteTag(suiteName)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    // eslint-disable-next-line no-console
    console.warn(`${getIcon('warning')}  Could not update tags/scripts: ${message}`)
  }

  return true
}

// Convenience wrappers
export function generateAutoTestFile(baseName: string): boolean {
  return generateTestFile(baseName, 'AUTO')
}

export function generateCyborgTestFile(baseName: string): boolean {
  return generateTestFile(baseName, 'CYBORG')
}
