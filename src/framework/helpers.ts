import path from 'path'

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
 */
export function getTestFileBaseName(fileName: string): string {
  return fileName.split('.')[0] ?? ''
}
