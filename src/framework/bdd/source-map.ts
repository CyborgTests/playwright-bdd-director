import path from 'path'

import { toPosix } from '../utils/helpers'

const MARKER = /^\s*\/\/ @spec:(\d+):(\d+)$/
const SPEC = 0 // index in `sources` of the map
const TEST_FILE = 1
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Comment above a generated statement: the spec line and column it comes from */
export function specMarker(line: number, column: number): string {
  return `// @spec:${line}:${column}`
}

/**
 * Generated test without its markers, with an inline source map from each marked statement to its
 * spec line: Prettier moves lines, so the map is built after it. Playwright reads the map, so
 * steps and their stacks point to the spec, not to the generated file.
 */
export function attachSourceMap(content: string, specPath: string, testPath: string): string {
  const lines: string[] = []
  const mappings: string[] = []
  let marker: { line: number; column: number } | undefined
  let previous = { source: SPEC, line: 0, column: 0 }
  for (const text of content.trimEnd().split('\n')) {
    const match = text.match(MARKER)
    if (match) {
      marker = { line: Number(match[1]) - 1, column: Number(match[2]) - 1 }
      continue
    }
    // Without a mapping a stack shows the line of the transpiled code, not of this file
    const target = marker
      ? { source: SPEC, ...marker }
      : { source: TEST_FILE, line: lines.length, column: 0 }
    lines.push(text)
    mappings.push(
      [
        0,
        target.source - previous.source,
        target.line - previous.line,
        target.column - previous.column
      ]
        .map(toVlq)
        .join('')
    )
    previous = target
    marker = undefined
  }
  const map = {
    version: 3,
    sources: [toPosix(path.relative(path.dirname(testPath), specPath)), path.basename(testPath)],
    names: [],
    mappings: mappings.join(';')
  }
  const encoded = Buffer.from(JSON.stringify(map)).toString('base64')
  return `${lines.join('\n')}\n//# sourceMappingURL=data:application/json;base64,${encoded}\n`
}

/** Base64 VLQ of a source map segment field: sign in the lowest bit, 5 bits per character */
function toVlq(value: number): string {
  let rest = value < 0 ? (-value << 1) | 1 : value << 1
  let encoded = ''
  do {
    const digit = rest & 31
    rest >>>= 5
    encoded += BASE64[rest > 0 ? digit | 32 : digit]
  } while (rest > 0)
  return encoded
}
