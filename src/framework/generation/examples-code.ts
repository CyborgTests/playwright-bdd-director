import { PLACEHOLDER_PATTERN } from '../constants/markdown'
import type { ExamplesTable } from '../core/md-parser'

/** Loop variable of generated parametrized tests: `for (const example of [...])` */
export const EXAMPLE_VAR = 'example'

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

/**
 * Code of title / step text: `<column>` placeholders of examples columns become template
 * substitutions (`Login as ${example.role}`), other text a single-quoted string
 */
export function buildTextLiteral(text: string, columns: string[] = []): string {
  const matches = [...text.matchAll(PLACEHOLDER_PATTERN)].filter((m) => columns.includes(m[1]))
  if (matches.length === 0) return quoteString(text)

  let code = ''
  let last = 0
  for (const match of matches) {
    code += escapeTemplate(text.slice(last, match.index)) + `\${${columnAccess(match[1])}}`
    last = match.index + match[0].length
  }
  return `\`${code}${escapeTemplate(text.slice(last))}\``
}

/**
 * Inline examples data: one object per row, string values in column order
 */
export function buildExamplesArray({ columns, rows }: ExamplesTable): string {
  const objects = rows.map(
    (row) =>
      `{ ${columns.map((column, i) => `${propertyKey(column)}: ${quoteString(row[i])}`).join(', ')} }`
  )
  return `[\n${objects.join(',\n')}\n]`
}

export function buildExamplesLoop(examples: ExamplesTable, body: string): string {
  return `for (const ${EXAMPLE_VAR} of ${buildExamplesArray(examples)}) {\n${body}\n}`
}

export function quoteString(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
}

function escapeTemplate(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function columnAccess(column: string): string {
  return IDENTIFIER.test(column)
    ? `${EXAMPLE_VAR}.${column}`
    : `${EXAMPLE_VAR}[${quoteString(column)}]`
}

function propertyKey(column: string): string {
  return IDENTIFIER.test(column) ? column : quoteString(column)
}
