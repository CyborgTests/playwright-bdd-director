/* eslint-disable no-console */
import { execSync } from 'child_process'
import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '@/framework/config'
import { matchFiles } from '@/framework/core/file-matcher'
import { clearMDCache } from '@/framework/core/md-parser'
import { parseTestFile } from '@/framework/core/ts-parser'
import { autoFixTestFile, isEmptyAutoTest } from '@/framework/generation/auto-fixer'
import { archiveOrphanedTests } from '@/framework/generation/test-archiver'
import { generateAutoTestFile, generateManualTestFile } from '@/framework/generation/test-generator'
import {
  collectValidationMetrics,
  type DirectorMetrics,
  formatDirectorMetrics,
  saveMetrics
} from '@/framework/reporting/metrics'
import {
  getErrorMessage,
  getMarkdownBaseName,
  getTestFileBaseName,
  isMatchingTestFile
} from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'
import { resetSharedProject } from '@/framework/utils/ts-morph-helpers'
import { autoFixMDFormatting } from '@/framework/validation/md-validator'
import { reportValidationErrors } from '@/framework/validation/reporter'
import { validate, type ValidatorResult } from '@/framework/validation/sync-validator'

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
} finally {
  resetSharedProject()
}

/**
 * MD-TS Director - full staging pipeline
 * Orchestrates all phases from MD formatting to final validation
 */
function main() {
  const startTime = Date.now()
  console.log(`${getIcon('start')}  Director staging the play...\n`)

  clearMDCache()

  // Phase 1: Auto-fix MD formatting
  const phase1 = fixMarkdownFormatting()

  // Phase 2: Initial validation (critical errors only)
  const phase2 = runInitialValidation()

  // Phase 3: Generate missing test files
  const phase3 = generateMissingTestFiles(phase2.validation)

  // Phase 4: Archive orphaned tests
  const phase4 = archiveOrphanedTestFiles(phase2.validation)

  // Phase 5: Auto-fix manual test files
  const phase5 = autoFixManualTestFiles(phase2.validation)

  // Phase 6: Auto-fix empty automated test files
  const phase6 = autoFixEmptyAutoTestFiles(phase2.validation)

  // Phase 7: Format and lint tests
  const phase7 = formatAndLintTests()

  // Final validation
  const finalValidation = validate()
  reportValidationErrors(finalValidation)

  // Collect and display metrics
  const baseMetrics = collectValidationMetrics(finalValidation, startTime)
  const directorMetrics: DirectorMetrics = {
    ...baseMetrics,
    phases: {
      mdFormatting: { files: phase1.count ?? 0, fixed: phase1.manual ?? 0, timeMs: phase1.timeMs },
      validation: { timeMs: phase2.timeMs },
      generation: { manual: phase3.manual ?? 0, auto: phase3.auto ?? 0, timeMs: phase3.timeMs },
      archiving: { manual: phase4.manual ?? 0, auto: phase4.auto ?? 0, timeMs: phase4.timeMs },
      autoFix: {
        manual: phase5.manual ?? 0,
        auto: phase6.auto ?? 0,
        timeMs: phase5.timeMs + phase6.timeMs
      },
      formatLint: { timeMs: phase7.timeMs }
    }
  }

  console.log('')
  console.log(formatDirectorMetrics(directorMetrics))
  saveMetrics(directorMetrics)

  console.log(
    `\n${getIcon('success')}  Stage is set! ${finalValidation.validationResults.length} file(s) ready.\n`
  )
  process.exit(0)
}

/**
 * Phase 1: Auto-fix MD formatting
 */
function fixMarkdownFormatting(): { timeMs: number; count: number; manual: number } {
  const startTime = Date.now()
  const markdownFiles = glob.sync(`${CONFIG.paths.testSuites}/**/*.md`)
  let fixed = 0

  for (const markdownFile of markdownFiles) {
    const wasFixed = autoFixMDFormatting(markdownFile)
    if (wasFixed) {
      fixed++
      console.log(`${getIcon('fix')}  Fixed formatting: ${markdownFile}`)
      console.log()
    }
  }

  return {
    timeMs: Date.now() - startTime,
    count: markdownFiles.length,
    manual: fixed
  }
}

/**
 * Phase 2: Initial validation (critical errors only)
 */
function runInitialValidation(): { validation: ValidatorResult; timeMs: number } {
  const startTime = Date.now()
  const validation = validate()

  // Report only critical errors (duplicates, MD structure)
  // Validation failures are expected at this stage (will be fixed in later phases)
  const criticalErrorsOnly = {
    ...validation,
    errors: {
      duplicateBaseNames: validation.errors.duplicateBaseNames,
      globalIDs: validation.errors.globalIDs,
      mdStructure: validation.errors.mdStructure
    }
  }
  reportValidationErrors(criticalErrorsOnly)

  return {
    validation,
    timeMs: Date.now() - startTime
  }
}

/**
 * Phase 3: Generate missing test files
 */
function generateMissingTestFiles(validation: ValidatorResult): {
  timeMs: number
  manual: number
  auto: number
} {
  const startTime = Date.now()
  let generatedManual = 0
  let generatedAuto = 0

  for (const markdownFile of validation.markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile)
    const candidates = glob.sync(`tests/**/${baseName}*.ts`)

    const manualTestFiles = candidates.filter((f) => isMatchingTestFile(f, baseName, 'manual'))
    const autoTestFiles = candidates.filter((f) => isMatchingTestFile(f, baseName, 'auto'))

    if (manualTestFiles.length === 0) {
      generateManualTestFile(baseName)
      generatedManual++
    }

    if (autoTestFiles.length === 0) {
      generateAutoTestFile(baseName)
      generatedAuto++
    }
  }

  return {
    timeMs: Date.now() - startTime,
    manual: generatedManual,
    auto: generatedAuto
  }
}

/**
 * Phase 4: Archive orphaned tests (manual + empty auto)
 */
function archiveOrphanedTestFiles(validation: ValidatorResult): {
  timeMs: number
  manual: number
  auto: number
} {
  const startTime = Date.now()
  const allTestFiles = glob.sync('tests/**/*.test.ts', { nodir: true })
  const stats = archiveOrphanedTests(allTestFiles, validation.markdownByBaseName)

  return {
    timeMs: Date.now() - startTime,
    manual: stats.manual,
    auto: stats.auto
  }
}

/**
 * Phase 5: Auto-fix manual test files
 */
function autoFixManualTestFiles(validation: ValidatorResult): { timeMs: number; manual: number } {
  return processTestFiles(validation, 'manual', false) as { timeMs: number; manual: number }
}

/**
 * Phase 6: Auto-fix empty automated test files
 */
function autoFixEmptyAutoTestFiles(validation: ValidatorResult): { timeMs: number; auto: number } {
  return processTestFiles(validation, 'auto', true) as { timeMs: number; auto: number }
}

/**
 * Process and auto-fix test files (manual or auto)
 * @param validation - Validation result with parsed MD data
 * @param fileType - Type of test files to process ('manual' or 'auto')
 * @param onlyEmpty - For auto tests, only fix if empty (no implementation)
 */
function processTestFiles(
  validation: ValidatorResult,
  fileType: 'manual' | 'auto',
  onlyEmpty: boolean
): { timeMs: number; [key: string]: number } {
  const startTime = Date.now()
  const testFiles = glob.sync('tests/**/*.ts', { nodir: true })
  let fixed = 0

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    const markdownFile = validation.markdownByBaseName.get(baseName)
    if (!markdownFile) continue

    const markdownData = validation.parsedMDMap.get(markdownFile)
    if (!markdownData) continue

    // Filter by file type
    const isTargetType = fileName.includes(fileType)
    if (!isTargetType) continue

    // For auto tests, only fix if empty
    if (onlyEmpty && !isEmptyAutoTest(testFile)) continue

    try {
      const typeScriptData = parseTestFile(testFile)
      const result = matchFiles(testFile, markdownData, typeScriptData)

      if (!result.valid) {
        const fixResult = autoFixTestFile(testFile, markdownData)
        if (fixResult.fixed) {
          fixed++
          console.log(`${getIcon('fix')}  Auto-fixed: ${testFile}`)
          fixResult.changes.forEach((change) => console.log(`    ${change}`))
          console.log()
        }
      }
    } catch (error: unknown) {
      console.warn(`${getIcon('warning')}  Skipped ${testFile}: ${getErrorMessage(error)}`)
      continue
    }
  }

  return {
    timeMs: Date.now() - startTime,
    [fileType]: fixed
  }
}

/**
 * Phase 7: Format and lint tests
 */
function formatAndLintTests(): { timeMs: number } {
  const startTime = Date.now()

  execSync('prettier --write tests --log-level silent', { stdio: 'inherit' })
  execSync('eslint --fix tests', { stdio: 'inherit' })

  return {
    timeMs: Date.now() - startTime
  }
}
