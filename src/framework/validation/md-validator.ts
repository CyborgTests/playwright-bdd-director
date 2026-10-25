import fs from 'fs'

import {
  getHeadingLevel,
  isHeading,
  MD_HEADINGS,
  MD_HORIZONTAL_RULE,
  MD_TABLE_PREFIX,
  MD_TAG_PREFIX
} from '@/framework/constants/markdown'

import {
  buildCannotReadError,
  buildH2NotFirstError,
  buildInvalidHeadingOrderError,
  buildInvalidLineFormatError,
  buildMissingH2Error,
  buildMissingH3Error,
  buildMissingH4Error,
  buildMultipleH2Error
} from '../errors/error-builders'

export interface MDValidationError {
  type: 'structure'
  message: string
  context?: string
  line?: number
}

/**
 * Validate MD file structure
 * Simple rule: each line must be one of 5 valid formats
 */
export function validateMDStructure(filePath: string): MDValidationError[] {
  const errors: MDValidationError[] = []

  // Read file
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    errors.push({
      type: 'structure',
      message: buildCannotReadError(filePath, reason)
    })
    return errors
  }

  const lines = content.split('\n')

  // Validate each line: must be one of 6 formats
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Valid formats:
    // 1. Empty line
    if (trimmed === '') continue

    // 2. Horizontal rule (---)
    if (trimmed === MD_HORIZONTAL_RULE) continue

    // 3. H2 (##...)
    if (isHeading(trimmed, 2)) continue

    // 4. H3 (### ...)
    if (isHeading(trimmed, 3)) continue

    // 5. H4 (#### ...)
    if (isHeading(trimmed, 4)) continue

    // 6. List/comment (- ...)
    if (trimmed.startsWith('- ')) continue

    // 7. Tags line and examples table row (placement and format are checked by md-parser)
    if (trimmed.startsWith(MD_TAG_PREFIX) || trimmed.startsWith(MD_TABLE_PREFIX)) continue

    // Everything else is invalid
    errors.push({
      type: 'structure',
      message: buildInvalidLineFormatError(trimmed),
      line: i + 1
    })
  }

  // If format errors exist, skip hierarchy validation
  if (errors.length > 0) {
    return errors
  }

  // Validate heading hierarchy
  const headings: Array<{ level: number; line: number; text: string }> = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const level = getHeadingLevel(trimmed)
    if (level !== null) {
      headings.push({ level, line: i + 1, text: trimmed })
    }
  }

  // Check: exactly one H2
  const h2Count = headings.filter((h) => h.level === 2).length
  if (h2Count === 0) {
    errors.push({
      type: 'structure',
      message: buildMissingH2Error()
    })
  } else if (h2Count > 1) {
    const locations = headings
      .filter((h) => h.level === 2)
      .map((h) => `    Line ${h.line}: ${h.text}`)
      .join('\n')
    errors.push({
      type: 'structure',
      message: buildMultipleH2Error(h2Count, locations)
    })
  }

  // Check: H2 is first heading
  if (headings.length > 0 && headings[0].level !== 2) {
    errors.push({
      type: 'structure',
      message: buildH2NotFirstError(headings[0].text),
      line: headings[0].line
    })
  }

  // Check: at least one H3 after H2
  const h3Count = headings.filter((h) => h.level === 3).length
  if (h2Count === 1 && h3Count === 0) {
    const h2 = headings[0]
    errors.push({
      type: 'structure',
      message: buildMissingH3Error(h2.text),
      line: h2.line
    })
  }

  // Check: at least one H4 after each H3
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].level === 3) {
      const nextH3Index = headings.findIndex((h, idx) => idx > i && h.level === 3)
      const endIndex = nextH3Index === -1 ? headings.length : nextH3Index
      const h4BetweenCount = headings.slice(i + 1, endIndex).filter((h) => h.level === 4).length

      if (h4BetweenCount === 0) {
        errors.push({
          type: 'structure',
          message: buildMissingH4Error(headings[i].text),
          line: headings[i].line
        })
      }
    }
  }

  // Check: heading order (no level jumps)
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1]
    const curr = headings[i]
    const levelDiff = curr.level - prev.level

    const levelNames: Record<number, string> = {
      2: `test suite (${MD_HEADINGS.SUITE.LABEL})`,
      3: `test case (${MD_HEADINGS.TEST_CASE.LABEL})`,
      4: `step (${MD_HEADINGS.STEP.LABEL})`
    }

    // Can go: same level (0), down one level (+1), or up any levels (negative)
    // Cannot: skip levels (+2 or more)
    if (levelDiff > 1) {
      errors.push({
        type: 'structure',
        message: buildInvalidHeadingOrderError(
          levelNames[prev.level],
          prev.line,
          levelNames[curr.level],
          curr.line
        ),
        line: curr.line
      })
    }
  }

  return errors
}

/**
 * Format a Markdown spec compactly, as dense as Gherkin:
 * - exactly one space after ##/###/####/-
 * - no blank lines inside the suite header or a test case: tags line right above its heading,
 *   notes and examples table right under it
 * - `---` separator before every test case (### and its tags line), a blank line around it -
 *   the one above keeps Markdown from reading the line before `---` as a heading
 * Returns true if file was modified
 */
export function autoFixMDFormatting(filePath: string): boolean {
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return false
  }

  // Blank lines and separators are placed anew below
  const lines = content
    .split('\n')
    .filter((line) => line.trim() !== '' && line.trim() !== MD_HORIZONTAL_RULE)
    .map(fixSpacing)

  const formatted: string[] = []
  for (const line of lines) {
    if (isHeading(line, 3)) {
      let start = formatted.length
      while (start > 0 && formatted[start - 1].startsWith(MD_TAG_PREFIX)) start--
      const tagLines = formatted.splice(start)
      if (formatted.length > 0) formatted.push('')
      formatted.push(MD_HORIZONTAL_RULE, '', ...tagLines)
    }
    formatted.push(line)
  }

  const newContent = `${formatted.join('\n')}\n`
  const modified = content !== newContent

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8')
  }

  return modified
}

/** One space after a heading or list marker */
function fixSpacing(line: string): string {
  const trimmed = line.trim()

  if (trimmed.match(MD_HEADINGS.SUITE.REGEX_FIX)) {
    return trimmed.replace(MD_HEADINGS.SUITE.REGEX_FIX, MD_HEADINGS.SUITE.PREFIX)
  }
  if (trimmed.match(MD_HEADINGS.TEST_CASE.REGEX_FIX)) {
    return trimmed.replace(MD_HEADINGS.TEST_CASE.REGEX_FIX, MD_HEADINGS.TEST_CASE.PREFIX)
  }
  if (trimmed.match(MD_HEADINGS.STEP.REGEX_FIX)) {
    return trimmed.replace(MD_HEADINGS.STEP.REGEX_FIX, MD_HEADINGS.STEP.PREFIX)
  }
  if (trimmed.startsWith('-') && !trimmed.startsWith('--')) {
    return trimmed.replace(/^-\s*/, '- ')
  }
  return line
}
