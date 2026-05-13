import path from 'path'

export interface ParsedID {
  id: string | null // null=no brackets, ""=[], "TC-01"=[TC-01]
  ttl: string
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Extract base name from markdown file path
 * Example: "test-suites/todo.md" -> "todo"
 */
export function getMarkdownBaseName(mdFilePath: string): string {
  return path.basename(mdFilePath, '.md')
}

/**
 * Extract base name from test file name
 * Example: "todo.manual.test.ts" -> "todo"
 * @throws Error if fileName is invalid (empty or no segments)
 */
export function getTestFileBaseName(fileName: string): string {
  const parts = fileName.split('.')
  if (parts.length === 0 || !parts[0]) {
    throw new Error(`Invalid file name: ${fileName} (expected format: <base>.<type>.test.ts)`)
  }
  return parts[0]
}

/**
 * Parse text with optional ID in brackets
 * @example
 * parseIDAndTitle('[TC-01] Test') → { id: 'TC-01', ttl: 'Test' }
 * parseIDAndTitle('[] Test') → { id: '', ttl: 'Test' }
 * parseIDAndTitle('Test') → { id: null, ttl: 'Test' }
 */
export function parseIDAndTitle(text: string): ParsedID {
  const match = text.match(/^\[([^\]]*)\]\s*(.*)$/)
  if (match) {
    return {
      id: match[1].trim(),
      ttl: match[2].trim()
    }
  }
  return {
    id: null,
    ttl: text.trim()
  }
}

/**
 * Check if test ID matches markdown ID (with suffix support)
 * @param markdownID - ID from markdown (source of truth)
 * @param testID - ID from test file
 * @returns true if IDs match (considering suffix rules)
 *
 * Rules:
 * - Exact match: markdownID === testID
 * - Empty ID in MD []: testID can be suffix-only (MANUAL, AUTO, HYBRID) without dash
 * - Non-empty ID: testID can have suffix with dash (TC01-01-MANUAL)
 *
 * @example
 * matchIDWithSuffix('TC01-01', 'TC01-01') → true
 * matchIDWithSuffix('TC01-01', 'TC01-01-AUTO') → true
 * matchIDWithSuffix('', 'MANUAL') → true
 * matchIDWithSuffix('', 'AUTO') → true
 * matchIDWithSuffix('TC01-01', 'TC01-02') → false
 */
export function matchIDWithSuffix(markdownID: string, testID: string): boolean {
  if (markdownID === testID) return true

  // Empty ID in MD [] - TS can use suffix without dash: [MANUAL], [AUTO], [HYBRID]
  if (markdownID === '') {
    return /^[A-Z]+$/.test(testID)
  }

  // Non-empty ID - TS can use suffix with dash: [TC01-01-MANUAL], [TC01-01-AUTO]
  if (testID.startsWith(markdownID + '-')) return true

  return false
}

/**
 * Check if test file matches base name and type
 * @example isMatchingTestFile('tests/todo.manual.test.ts', 'todo', 'manual') → true
 */
export function isMatchingTestFile(
  testFilePath: string,
  baseName: string,
  kind: 'auto' | 'manual'
): boolean {
  const fileName = path.basename(testFilePath)
  const parts = fileName.split('.')

  if (parts[0] !== baseName) return false
  if (parts.at(-1) !== 'ts') return false
  if (!parts.includes('test')) return false
  return parts.includes(kind)
}
