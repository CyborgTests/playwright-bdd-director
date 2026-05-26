import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '@/framework/config'

import { FileMatchResult, matchFiles } from '../core/file-matcher'
import { parseMDFile } from '../core/md-parser'
import { parseTestFile } from '../core/ts-parser'
import {
  buildDuplicateIDError,
  buildDuplicateTitleError,
  buildDuplicateTitleInFileError
} from '../errors/error-builders'
import { getErrorMessage, getMarkdownBaseName, getTestFileBaseName } from '../utils/helpers'
import { getIcon } from '../utils/icons'
import { validateMDStructure } from './md-validator'

/**
 * Validation result with all found errors and parsed data
 * Used to report errors and pass data to subsequent steps
 */
export interface ValidatorResult {
  success: boolean
  markdownFiles: string[]
  parsedMDMap: Map<string, ReturnType<typeof parseMDFile>>
  markdownByBaseName: Map<string, string>
  validationResults: FileMatchResult[]
  errors: {
    duplicateBaseNames?: string
    mdStructure?: Array<{ file: string; errors: string[] }>
    globalIDs?: string[]
    validationFailures?: FileMatchResult[]
  }
}

/**
 * Find all markdown files in test suites directory
 */
function findMarkdownFiles(): string[] {
  return glob.sync(`${CONFIG.paths.testSuites}/**/*.md`)
}

/**
 * Check for duplicate markdown base names
 * Returns error message if duplicates found, null otherwise
 */
function validateUniqueBaseNames(markdownFiles: string[]): {
  error: string | null
  byBaseName: Map<string, string>
} {
  const markdownByBaseName = new Map<string, string[]>()

  for (const markdownFile of markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile)
    const existing = markdownByBaseName.get(baseName) ?? []
    existing.push(markdownFile)
    markdownByBaseName.set(baseName, existing)
  }

  const duplicates = [...markdownByBaseName.entries()].filter(([, files]) => files.length > 1)

  if (duplicates.length > 0) {
    const details = duplicates
      .map(
        ([baseName, files]) => `  • ${baseName}.md:\n${files.map((f) => `    - ${f}`).join('\n')}`
      )
      .join('\n')
    return {
      error:
        `Duplicate markdown base names found (${duplicates.length} conflicts)\n` +
        `${details}\n\n` +
        `  Fix: Rename files to have unique base names\n` +
        `  Why: Each test file must map to exactly one markdown file`,
      byBaseName: new Map()
    }
  }

  // Convert to unique map (take first file)
  const uniqueMap = new Map<string, string>(
    [...markdownByBaseName.entries()].map(([baseName, files]) => [baseName, files[0]])
  )

  return { error: null, byBaseName: uniqueMap }
}

/**
 * Validate MD structure and parse all files
 */
function validateAndParseMDFiles(markdownFiles: string[]): {
  structureErrors: Array<{ file: string; errors: string[] }>
  parsed: Array<{ file: string; data: ReturnType<typeof parseMDFile> }>
} {
  const structureErrors: Array<{ file: string; errors: string[] }> = []
  const parsed: Array<{ file: string; data: ReturnType<typeof parseMDFile> }> = []

  for (const markdownFile of markdownFiles) {
    try {
      const errors = validateMDStructure(markdownFile)

      if (errors.length > 0) {
        structureErrors.push({
          file: markdownFile,
          errors: errors.map((e) => {
            let result = `${getIcon(e.type)}   ${e.message}`
            if (e.context) {
              const contextLines = e.context
                .split('\n')
                .map((line) => `    ${line}`)
                .join('\n')
              result += `\n${contextLines}`
            }
            if (e.line) {
              result += `\n    Line: ${e.line}`
            }
            return result
          })
        })
        continue
      }

      const mdData = parseMDFile(markdownFile)
      parsed.push({ file: markdownFile, data: mdData })
    } catch (error: unknown) {
      structureErrors.push({
        file: markdownFile,
        errors: [`${getIcon('error')}  Failed to parse MD: ${getErrorMessage(error)}`]
      })
    }
  }

  return { structureErrors, parsed }
}

/**
 * Check for duplicate IDs and titles across all MD files
 */
function validateGlobalIDs(
  parsedFiles: Array<{ file: string; data: ReturnType<typeof parseMDFile> }>
): string[] {
  const errors: string[] = []
  const suiteIDs = new Map<string, string>()
  const testCaseIDs = new Map<string, string>()
  const stepIDs = new Map<string, string>()
  const suiteTitles = new Map<string, string>()

  for (const { file, data } of parsedFiles) {
    // Check suite ID
    if (data.suiteID) {
      const existing = suiteIDs.get(data.suiteID)
      if (existing) {
        errors.push(buildDuplicateIDError('Suite ID', data.suiteID, [existing, file]))
      } else {
        suiteIDs.set(data.suiteID, file)
      }
    }

    // Check suite title
    const existingTitle = suiteTitles.get(data.suiteTtl)
    if (existingTitle) {
      errors.push(buildDuplicateTitleError('Test Suite', data.suiteTtl, [existingTitle, file]))
    } else {
      suiteTitles.set(data.suiteTtl, file)
    }

    // Check test case IDs and titles
    for (const testCase of data.testCases) {
      if (testCase.id !== null && testCase.id !== '') {
        const existing = testCaseIDs.get(testCase.id)
        if (existing) {
          errors.push(buildDuplicateIDError('Test Case ID', testCase.id, [existing, file]))
        } else {
          testCaseIDs.set(testCase.id, file)
        }
      }

      // Check step IDs
      for (const stepTtl of testCase.stepTtls) {
        const stepIdMatch = stepTtl.match(/^\[([^\]]+)\]/)
        if (stepIdMatch) {
          const stepId = stepIdMatch[1]
          const existing = stepIDs.get(stepId)
          if (existing) {
            errors.push(buildDuplicateIDError('Step ID', stepId, [existing, file]))
          } else {
            stepIDs.set(stepId, file)
          }
        }
      }
    }

    // Check for duplicate test case titles within same file
    const testCaseTitles = new Map<string, number>()
    for (let i = 0; i < data.testCases.length; i++) {
      const testCase = data.testCases[i]
      const existingIndex = testCaseTitles.get(testCase.ttl)
      if (existingIndex !== undefined) {
        errors.push(buildDuplicateTitleInFileError(file, testCase.ttl, [existingIndex + 1, i + 1]))
      } else {
        testCaseTitles.set(testCase.ttl, i)
      }
    }
  }

  return errors
}

/**
 * Validate MD-TS synchronization
 */
function validateMDTSSync(
  parsedMDMap: Map<string, ReturnType<typeof parseMDFile>>,
  markdownByBaseName: Map<string, string>
): FileMatchResult[] {
  const testFiles = glob.sync(`${CONFIG.paths.testsDir}/**/*.ts`, {
    nodir: true,
    ignore: [`${CONFIG.paths.testsDir}/fixtures/**/*.ts`] // Exclude fixture files
  })
  const results: FileMatchResult[] = []

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    const markdownFile = markdownByBaseName.get(baseName)
    if (!markdownFile) continue

    const markdownData = parsedMDMap.get(markdownFile)
    if (!markdownData) continue

    try {
      const typeScriptData = parseTestFile(testFile)
      const result = matchFiles(testFile, markdownData, typeScriptData)
      results.push(result)
    } catch (error: unknown) {
      results.push({
        file: testFile,
        valid: false,
        errors: [getErrorMessage(error)]
      })
    }
  }

  return results
}

/**
 * Main validation function - validates MD files and their sync with TS test files
 *
 * Validation steps (in order, fail-fast):
 * 1. Check for duplicate MD base names (e.g., two files named "todo.md")
 * 2. Validate MD structure (syntax, required sections)
 * 3. Check for duplicate IDs/titles across all MD files
 * 4. Match each TS test file against its MD file
 *
 * Returns success=true only if all checks pass
 */
export function validate(): ValidatorResult {
  // Step 1: Find all MD files
  const markdownFiles = findMarkdownFiles()

  if (markdownFiles.length === 0) {
    return {
      success: true,
      markdownFiles: [],
      parsedMDMap: new Map(),
      markdownByBaseName: new Map(),
      validationResults: [],
      errors: {}
    }
  }

  // Step 2: Check for duplicate base names
  const { error: duplicateError, byBaseName } = validateUniqueBaseNames(markdownFiles)
  if (duplicateError) {
    return {
      success: false,
      markdownFiles,
      parsedMDMap: new Map(),
      markdownByBaseName: new Map(),
      validationResults: [],
      errors: { duplicateBaseNames: duplicateError }
    }
  }

  // Step 3: Validate MD structure and parse files
  const { structureErrors, parsed } = validateAndParseMDFiles(markdownFiles)

  // Step 4: Check global IDs
  const globalIDErrors = validateGlobalIDs(parsed)

  // Return early if critical errors found
  if (globalIDErrors.length > 0 || structureErrors.length > 0) {
    return {
      success: false,
      markdownFiles,
      parsedMDMap: new Map(),
      markdownByBaseName: byBaseName,
      validationResults: [],
      errors: {
        globalIDs: globalIDErrors.length > 0 ? globalIDErrors : undefined,
        mdStructure: structureErrors.length > 0 ? structureErrors : undefined
      }
    }
  }

  // Build map for quick lookup
  const parsedMDMap = new Map(parsed.map(({ file, data }) => [file, data]))

  // Step 5: Validate MD-TS synchronization
  const validationResults = validateMDTSSync(parsedMDMap, byBaseName)
  const failedResults = validationResults.filter((r) => !r.valid)

  if (failedResults.length > 0) {
    return {
      success: false,
      markdownFiles,
      parsedMDMap,
      markdownByBaseName: byBaseName,
      validationResults,
      errors: { validationFailures: failedResults }
    }
  }

  // All validations passed
  return {
    success: true,
    markdownFiles,
    parsedMDMap,
    markdownByBaseName: byBaseName,
    validationResults,
    errors: {}
  }
}
