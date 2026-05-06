import fs from 'fs'
import path from 'path'

export interface TestCase {
  id: string // TC-001
  title: string // User login with valid credentials
  stepTitles: string[]
}

export interface ParsedMd {
  suiteTitle: string // Authentication
  testCases: TestCase[]
}

// Cache for MD file lookups (performance optimization)
const mdFileCache = new Map<string, string | null>()

/**
 * Parse MD file and extract test suite with multiple test cases
 *
 * Format with IDs (in brackets):
 * # [TS01] Suite Title
 * ## [TC01-01] Test case title
 * ### [01-01-01] Step title
 * Optional comment text (ignored by validator)
 *
 * Format without IDs:
 * # Suite Title
 * ## Test case title
 * ### Step title
 *
 * Note: IDs are only extracted if in brackets format [TC01-01]
 * Other formats (TC01-01:, TC01-01 -, etc.) are treated as part of title
 */
export function parseMdFile(fileName: string): ParsedMd {
  const mdPath = findMdFile(fileName)

  if (!mdPath) {
    throw new Error(`MD file not found: ${fileName}`)
  }

  const content = fs.readFileSync(mdPath, 'utf-8')
  const lines = content.split('\n')

  let suiteTitle = ''
  const testCases: TestCase[] = []
  let currentTestCase: TestCase | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Suite title: # [TS01] Title or # Title → extract "Title"
    if (trimmed.startsWith('# ') && !suiteTitle) {
      const match = trimmed.match(/^#\s*(?:\[.*?\]\s*)?(.+)/)
      if (!match) {
        throw new Error(`Invalid suite title format in ${mdPath}: ${trimmed}`)
      }
      suiteTitle = match[1].trim()
      continue
    }

    // Test case: ## [ANY-ID] Title → extract id + title (only if in brackets)
    // Test case: ## Title → extract only title, no ID
    const tcMatchWithId = trimmed.match(/^##\s*\[([^\]]+)\]\s*(.+)/)
    const tcMatchNoId = trimmed.match(/^##\s+(.+)/)

    if (tcMatchWithId) {
      // Save previous test case
      if (currentTestCase) {
        testCases.push(currentTestCase)
      }

      // ID in brackets format - extract base ID (remove suffix if present)
      currentTestCase = {
        id: tcMatchWithId[1], // Base ID only: TC01-01
        title: tcMatchWithId[2].trim(),
        stepTitles: []
      }
      continue
    } else if (tcMatchNoId && trimmed.startsWith('## ')) {
      // Save previous test case
      if (currentTestCase) {
        testCases.push(currentTestCase)
      }

      // No brackets - cannot determine ID, only title
      currentTestCase = {
        id: '', // No ID (not in brackets format)
        title: tcMatchNoId[1].trim(),
        stepTitles: []
      }
      continue
    }

    // Step: ### [01-01-01] Title → extract full text WITH brackets (brackets format)
    // Step: ### Title → extract "Title" as is (no brackets format)
    // Comments after steps are ignored (any text that's not a heading)
    const stepMatchWithId = trimmed.match(/^###\s*(\[[\w-]+\]\s*.+)/)
    const stepMatchNoId = trimmed.match(/^###\s+(.+)/)

    if (stepMatchWithId && currentTestCase) {
      currentTestCase.stepTitles.push(stepMatchWithId[1].trim())
    } else if (stepMatchNoId && currentTestCase && trimmed.startsWith('### ')) {
      currentTestCase.stepTitles.push(stepMatchNoId[1].trim())
    }
  }

  // Save last test case
  if (currentTestCase) {
    testCases.push(currentTestCase)
  }

  if (!suiteTitle) {
    throw new Error(`No suite title found in ${mdPath}`)
  }

  if (testCases.length === 0) {
    throw new Error(`No test cases found in ${mdPath}`)
  }

  // Validate no duplicate IDs (only check IDs in brackets format)
  const idsWithBrackets = testCases.filter(tc => tc.id !== '').map(tc => tc.id)
  const duplicateIds = idsWithBrackets.filter((id, index) => idsWithBrackets.indexOf(id) !== index)

  if (duplicateIds.length > 0) {
    const uniqueDuplicates = [...new Set(duplicateIds)]
    throw new Error(
      `Duplicate test case IDs found in ${mdPath}:\n` +
      uniqueDuplicates.map(id => `  - [${id}]`).join('\n') +
      `\n\nEach test case must have a unique ID.`
    )
  }

  return { suiteTitle, testCases }
}

/**
 * Find MD file by name (without extension)
 * Uses cache for performance optimization
 */
function findMdFile(fileName: string): string | null {
  // Check cache first
  if (mdFileCache.has(fileName)) {
    return mdFileCache.get(fileName)!
  }

  const search = (dir: string): string | null => {
    if (!fs.existsSync(dir)) return null

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const result = search(fullPath)
        if (result) return result
      } else if (entry.name === `${fileName}.md`) {
        return fullPath
      }
    }

    return null
  }

  const result = search('test-cases')

  // Cache the result (even if null)
  mdFileCache.set(fileName, result)

  return result
}
