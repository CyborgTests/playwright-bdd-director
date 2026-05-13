import { glob } from 'glob'
import path from 'path'

import { PATHS } from '../constants/paths'
import { FileMatchResult, matchFiles } from './file-matcher'
import { getErrorMessage, getMarkdownBaseName, getTestFileBaseName } from './helpers'
import { getIcon } from './icons'
import { parseMDFile } from './md-parser'
import { validateMDStructure } from './md-validator'
import { parseTestFile } from './ts-parser'

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
  // Find all MD files
  const markdownFiles = glob.sync(`${PATHS.TEST_SUITES}/**/*.md`)

  // Early return if no MD files found
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

  // Step 1: Check for duplicate base names
  // Example: "test-suites/todo.md" and "test-suites/subfolder/todo.md" both have base name "todo"
  const markdownByBaseName = new Map<string, string[]>()
  for (const markdownFile of markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile)
    const existing = markdownByBaseName.get(baseName) ?? []
    existing.push(markdownFile)
    markdownByBaseName.set(baseName, existing)
  }

  const duplicateBaseNames = [...markdownByBaseName.entries()].filter(
    ([, files]) => files.length > 1
  )
  if (duplicateBaseNames.length > 0) {
    const details = duplicateBaseNames
      .map(([baseName, files]) => `- ${baseName}.md:\n${files.map((f) => `  ${f}`).join('\n')}`)
      .join('\n')
    return {
      success: false,
      markdownFiles,
      parsedMDMap: new Map(),
      markdownByBaseName: new Map(),
      validationResults: [],
      errors: {
        duplicateBaseNames: `Duplicate markdown base names are not allowed.\n${details}\n\nUse unique MD filenames to avoid ambiguous test-to-MD mapping.`
      }
    }
  }

  // Convert to unique map (take first file if duplicates exist)
  const markdownByBaseNameUnique = new Map<string, string>(
    [...markdownByBaseName.entries()].map(([baseName, files]) => [baseName, files[0]])
  )

  // Step 2: Validate MD structure and parse files
  const mdStructureErrors: Array<{ file: string; errors: string[] }> = []
  const parsedMDFiles: Array<{
    file: string
    data: ReturnType<typeof parseMDFile>
  }> = []

  for (const markdownFile of markdownFiles) {
    try {
      const structureErrors = validateMDStructure(markdownFile)

      if (structureErrors.length > 0) {
        mdStructureErrors.push({
          file: markdownFile,
          errors: structureErrors.map((e) => {
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
      parsedMDFiles.push({ file: markdownFile, data: mdData })
    } catch (error: unknown) {
      mdStructureErrors.push({
        file: markdownFile,
        errors: [`${getIcon('error')}  Failed to parse MD: ${getErrorMessage(error)}`]
      })
      continue
    }
  }

  // Step 3: Check for duplicate IDs and titles across all MD files
  // IDs and titles must be globally unique across all MD files
  const globalIDErrors: string[] = []
  const suiteIDs = new Map<string, string>()
  const testCaseIDs = new Map<string, string>()
  const stepIDs = new Map<string, string>()
  const suiteTitles = new Map<string, string>()

  for (const { file, data } of parsedMDFiles) {
    if (data.suiteID) {
      const existingFile = suiteIDs.get(data.suiteID)
      if (existingFile) {
        globalIDErrors.push(
          `${getIcon('suite')}  Duplicate Test Suite ID "${data.suiteID}":\n  - ${existingFile}\n  - ${file}`
        )
      } else {
        suiteIDs.set(data.suiteID, file)
      }
    }

    const existingFileWithTitle = suiteTitles.get(data.suiteTtl)
    if (existingFileWithTitle) {
      globalIDErrors.push(
        `${getIcon('suite')}  Duplicate Test Suite title "${data.suiteTtl}":\n  - ${existingFileWithTitle}\n  - ${file}`
      )
    } else {
      suiteTitles.set(data.suiteTtl, file)
    }

    for (const testCase of data.testCases) {
      // Only check non-empty, non-suffix-only IDs
      // Empty ID [] is allowed, and suffix-only IDs (MANUAL, AUTO, etc.) come from TS files not MD
      if (testCase.id !== null && testCase.id !== '') {
        const existingFile = testCaseIDs.get(testCase.id)
        if (existingFile) {
          globalIDErrors.push(
            `${getIcon('testCase')}  Duplicate Test Case ID "${testCase.id}":\n  - ${existingFile}\n  - ${file}`
          )
        } else {
          testCaseIDs.set(testCase.id, file)
        }
      }

      for (const stepTtl of testCase.stepTtls) {
        const stepIdMatch = stepTtl.match(/^\[([^\]]+)\]/)
        if (stepIdMatch) {
          const stepId = stepIdMatch[1]
          const existingFile = stepIDs.get(stepId)
          if (existingFile) {
            globalIDErrors.push(
              `${getIcon('step')}  Duplicate Step ID "${stepId}":\n  - ${existingFile}\n  - ${file}`
            )
          } else {
            stepIDs.set(stepId, file)
          }
        }
      }
    }

    // Check for duplicate test case titles within same MD file
    const testCaseTitles = new Map<string, number>()
    for (let i = 0; i < data.testCases.length; i++) {
      const testCase = data.testCases[i]
      const existingIndex = testCaseTitles.get(testCase.ttl)
      if (existingIndex !== undefined) {
        globalIDErrors.push(
          `${getIcon('testCase')}  Duplicate Test Case title in ${file}:\n  "${testCase.ttl}"\n  Test Case #${existingIndex + 1} and #${i + 1}`
        )
      } else {
        testCaseTitles.set(testCase.ttl, i)
      }
    }
  }

  // Return early if critical errors found (structure or duplicate IDs)
  if (globalIDErrors.length > 0 || mdStructureErrors.length > 0) {
    return {
      success: false,
      markdownFiles,
      parsedMDMap: new Map(),
      markdownByBaseName: markdownByBaseNameUnique,
      validationResults: [],
      errors: {
        globalIDs: globalIDErrors.length > 0 ? globalIDErrors : undefined,
        mdStructure: mdStructureErrors.length > 0 ? mdStructureErrors : undefined
      }
    }
  }

  // Build map of parsed MD files for quick lookup
  const parsedMDMap = new Map(parsedMDFiles.map(({ file, data }) => [file, data]))

  // Step 4: Match each TS test file against its MD file
  const testFiles = glob.sync('tests/**/*.ts', { nodir: true })
  const results: FileMatchResult[] = []

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    // Skip if no corresponding MD file exists
    const markdownFile = markdownByBaseNameUnique.get(baseName)
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

  // Collect failed validations (MD-TS sync issues)
  const failedResults = results.filter((result) => !result.valid)

  if (failedResults.length > 0) {
    return {
      success: false,
      markdownFiles,
      parsedMDMap,
      markdownByBaseName: markdownByBaseNameUnique,
      validationResults: results,
      errors: {
        validationFailures: failedResults
      }
    }
  }

  // All validations passed - return success
  return {
    success: true,
    markdownFiles,
    parsedMDMap,
    markdownByBaseName: markdownByBaseNameUnique,
    validationResults: results,
    errors: {}
  }
}
