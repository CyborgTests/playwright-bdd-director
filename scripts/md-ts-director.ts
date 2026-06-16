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
import { generateAutoTestFile, generateCyborgTestFile } from '@/framework/generation/test-generator'
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
  hasAutomatedTestFile,
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

  // Phase 5: Auto-fix cyborg test files
  const phase5 = autoFixCyborgTestFiles(phase2.validation)

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
      generation: { cyborg: phase3.cyborg ?? 0, timeMs: phase3.timeMs },
      archiving: { cyborg: phase4.cyborg ?? 0, auto: phase4.auto ?? 0, timeMs: phase4.timeMs },
      autoFix: {
        cyborg: phase5.cyborg ?? 0,
        auto: phase6.auto ?? 0,
        timeMs: phase5.timeMs + phase6.timeMs
      },
      formatLint: { timeMs: phase7.timeMs }
    }
  }

  console.log('')
  console.log(formatDirectorMetrics(directorMetrics))
  saveMetrics(directorMetrics)

  // Output fixed formatting files
  if (phase1.fixedFiles.length > 0) {
    console.log('')
    console.log(`${getIcon('fix')}  Fixed formatting:`)
    phase1.fixedFiles.forEach((file) => console.log(`    • ${file}`))
  }

  // Output generated files
  if (phase3.generatedFiles.length > 0) {
    console.log('')
    console.log(`${getIcon('success')}  Generated files:`)
    phase3.generatedFiles.forEach((file) => console.log(`    • ${file}`))
  }

  // Output auto-fixed cyborg files
  if (phase5.fixedFiles.length > 0) {
    console.log('')
    console.log(`${getIcon('fix')}  Auto-fixed CYBORG:`)
    phase5.fixedFiles.forEach((file) => console.log(`    • ${file}`))
  }

  // Output auto-fixed auto files
  if (phase6.fixedFiles.length > 0) {
    console.log('')
    console.log(`${getIcon('fix')}  Auto-fixed AUTO:`)
    phase6.fixedFiles.forEach((file) => console.log(`    • ${file}`))
  }

  console.log(
    `\n${getIcon('success')}  Stage is set! ${finalValidation.validationResults.length} file(s) ready.\n`
  )
  process.exit(0)
}

/**
 * Phase 1: Auto-fix MD formatting
 */
function fixMarkdownFormatting(): { timeMs: number; count: number; manual: number; fixedFiles: string[] } {
  const startTime = Date.now()
  const markdownFiles = glob.sync(`${CONFIG.paths.testSuites}/**/*.md`)
  let fixed = 0
  const fixedFiles: string[] = []

  for (const markdownFile of markdownFiles) {
    const wasFixed = autoFixMDFormatting(markdownFile)
    if (wasFixed) {
      fixed++
      fixedFiles.push(markdownFile)
    }
  }

  return {
    timeMs: Date.now() - startTime,
    count: markdownFiles.length,
    manual: fixed,
    fixedFiles
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
  cyborg: number
  generatedFiles: string[]
} {
  const startTime = Date.now()
  let generatedCyborg = 0
  const generatedFiles: string[] = []

  for (const markdownFile of validation.markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile)
    const candidates = glob.sync(`${CONFIG.paths.testsDir}/**/${baseName}*.ts`)

    const cyborgTestFiles = candidates.filter((f) => isMatchingTestFile(f, baseName, 'CYBORG'))

    if (cyborgTestFiles.length === 0) {
      if (generateCyborgTestFile(baseName)) {
        generatedCyborg++
        generatedFiles.push(`${baseName}.cyborg.test.ts`)
      }
    }
  }

  return {
    timeMs: Date.now() - startTime,
    cyborg: generatedCyborg,
    generatedFiles
  }
}

/**
 * Phase 4: Archive orphaned tests (manual + empty auto)
 */
function archiveOrphanedTestFiles(validation: ValidatorResult): {
  timeMs: number
  cyborg: number
  auto: number
} {
  const startTime = Date.now()
  const allTestFiles = glob.sync(`${CONFIG.paths.testsDir}/**/*.test.ts`, { nodir: true })
  const stats = archiveOrphanedTests(allTestFiles, validation.markdownByBaseName)

  return {
    timeMs: Date.now() - startTime,
    cyborg: stats.cyborg,
    auto: stats.auto
  }
}

/**
 * Phase 5: Auto-fix manual test files
 */
function autoFixCyborgTestFiles(validation: ValidatorResult): { timeMs: number; cyborg: number; fixedFiles: string[] } {
  return processTestFiles(validation, 'CYBORG', false)
}

/**
 * Phase 6: Auto-fix empty automated test files
 */
function autoFixEmptyAutoTestFiles(validation: ValidatorResult): { timeMs: number; auto: number; fixedFiles: string[] } {
  return processTestFiles(validation, 'AUTO', true)
}

/**
 * Process and auto-fix test files (cyborg or auto)
 * @param validation - Validation result with parsed MD data
 * @param fileType - Type of test files to process ('CYBORG' or 'AUTO')
 * @param onlyEmpty - For auto tests, only fix if empty (no implementation)
 */
function processTestFiles(
  validation: ValidatorResult,
  fileType: 'CYBORG' | 'AUTO',
  onlyEmpty: boolean
): { timeMs: number; cyborg: number; auto: number; fixedFiles: string[] } {
  const startTime = Date.now()
  const testFiles = glob.sync(`${CONFIG.paths.testsDir}/**/*.ts`, { nodir: true })
  let fixed = 0
  const fixedFiles: string[] = []

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    const markdownFile = validation.markdownByBaseName.get(baseName)
    if (!markdownFile) continue

    const markdownData = validation.parsedMDMap.get(markdownFile)
    if (!markdownData) continue

    // Filter by file type (case-insensitive for file names)
    const isTargetType = fileName.toLowerCase().includes(fileType.toLowerCase())
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
          fixedFiles.push(testFile)
        }
      }
    } catch (error: unknown) {
      console.warn(`${getIcon('warning')}  Skipped ${testFile}: ${getErrorMessage(error)}`)
      continue
    }
  }

  return {
    timeMs: Date.now() - startTime,
    cyborg: fileType === 'CYBORG' ? fixed : 0,
    auto: fileType === 'AUTO' ? fixed : 0,
    fixedFiles
  }
}

/**
 * Phase 7: Format and lint tests
 */
function formatAndLintTests(): { timeMs: number } {
  const startTime = Date.now()

  execSync('npm run format:tests', { stdio: 'inherit' })
  execSync('npm run lint:fix:tests', { stdio: 'inherit' })

  return {
    timeMs: Date.now() - startTime
  }
}
