/* eslint-disable no-console */
import { execSync } from 'child_process'
import { glob } from 'glob'
import path from 'path'

import { autoFixTestFile } from '../src/framework/auto-fixer'
import { matchFiles } from '../src/framework/file-matcher'
import { getErrorMessage, getMarkdownBaseName, getTestFileBaseName } from '../src/framework/helpers'
import { getIcon } from '../src/framework/icons'
import { autoFixMDFormatting } from '../src/framework/md-validator'
import { validate } from '../src/framework/sync-validator'
import { archiveOrphanedManualTests } from '../src/framework/test-archiver'
import { generateAutoTestFile, generateManualTestFile } from '../src/framework/test-generator'
import { parseTestFile } from '../src/framework/ts-parser'
import { reportValidationErrors } from '../src/framework/validation-reporter'

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
}

/**
 * MD-TS Director - full staging pipeline
 * 1. Fix MD formatting
 * 2. Validate (critical errors only)
 * 3. Generate missing test files
 * 3.5. Archive orphaned manual tests
 * 4. Auto-fix manual test files
 * 5. Final validation
 * 6. Format and lint tests
 */
function main() {
  console.log(`${getIcon('start')}  Director staging the play...\n`)

  // Step 1: Auto-fix MD formatting
  const markdownFiles = glob.sync('test-suites/**/*.md')
  for (const markdownFile of markdownFiles) {
    const wasFixed = autoFixMDFormatting(markdownFile)
    if (wasFixed) {
      console.log(`${getIcon('fix')}  Fixed formatting: ${markdownFile}`)
      console.log()
    }
  }

  // Step 2: Initial dress rehearsal (validation)
  const initialValidation = validate()

  // If there are critical errors (duplicates, MD structure), exit
  // Note: validation failures are expected at this stage (will be fixed in Step 4)
  const criticalErrorsOnly = {
    ...initialValidation,
    errors: {
      duplicateBaseNames: initialValidation.errors.duplicateBaseNames,
      globalIDs: initialValidation.errors.globalIDs,
      mdStructure: initialValidation.errors.mdStructure
    }
  }
  reportValidationErrors(criticalErrorsOnly)

  // Step 3: Generate missing test files
  /**
   * Check if test file matches base name and type
   */
  const isMatchingTestFile = (testFilePath: string, baseName: string, kind: 'auto' | 'manual') => {
    const fileName = path.basename(testFilePath)
    const parts = fileName.split('.')

    if (parts[0] !== baseName) return false
    if (parts.at(-1) !== 'ts') return false
    if (!parts.includes('test')) return false
    return parts.includes(kind)
  }

  for (const markdownFile of initialValidation.markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile)
    const candidates = glob.sync(`tests/**/${baseName}*.ts`)

    const manualTestFiles = candidates.filter((f) => isMatchingTestFile(f, baseName, 'manual'))
    const autoTestFiles = candidates.filter((f) => isMatchingTestFile(f, baseName, 'auto'))

    if (manualTestFiles.length === 0) {
      generateManualTestFile(baseName)
    }

    if (autoTestFiles.length === 0) {
      generateAutoTestFile(baseName)
    }
  }

  // Step 3.5: Archive orphaned manual tests
  const allManualTests = glob.sync('tests/manual/*.manual.test.ts')
  archiveOrphanedManualTests(allManualTests, initialValidation.markdownByBaseName)

  // Step 4: Auto-fix manual test files
  const testFiles = glob.sync('tests/**/*.ts', { nodir: true })

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    const markdownFile = initialValidation.markdownByBaseName.get(baseName)
    if (!markdownFile) continue

    const markdownData = initialValidation.parsedMDMap.get(markdownFile)
    if (!markdownData) continue

    const isManualTest = fileName.includes('manual')
    if (!isManualTest) continue

    try {
      const typeScriptData = parseTestFile(testFile)
      const result = matchFiles(testFile, markdownData, typeScriptData)

      if (!result.valid) {
        const fixResult = autoFixTestFile(testFile, markdownData)
        if (fixResult.fixed) {
          console.log(`${getIcon('fix')}  Auto-fixed: ${testFile}`)
          fixResult.changes.forEach((change) => console.log(`    ${change}`))
          console.log()
        }
      }
    } catch {
      // Skip files with errors - final validation will catch them
      continue
    }
  }

  // Step 5: Final dress rehearsal after all fixes
  const finalValidation = validate()

  // Step 6: Format and lint tests (before reporting errors)
  execSync('prettier --write tests --log-level silent', { stdio: 'inherit' })
  execSync('eslint --fix tests', { stdio: 'inherit' })

  reportValidationErrors(finalValidation)

  console.log(
    `${getIcon('success')}  Stage is set! ${finalValidation.validationResults.length} file(s) ready.\n`
  )
  process.exit(0)
}
