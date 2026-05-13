import fs from 'fs'

import { getHeadingLevel, isHeading, MD_HEADINGS } from '@/framework/constants/markdown'

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

  // Validate each line: must be one of 5 formats
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Valid formats:
    // 1. Empty line
    if (trimmed === '') continue

    // 2. H2 (##...)
    if (isHeading(trimmed, 2)) continue

    // 3. H3 (### ...)
    if (isHeading(trimmed, 3)) continue

    // 4. H4 (#### ...)
    if (isHeading(trimmed, 4)) continue

    // 5. List/comment (- ...)
    if (trimmed.startsWith('- ')) continue

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
 * Auto-fix MD formatting issues:
 * - Exactly one space after ##/###/####/-
 * - Correct blank lines between headers and comments
 * - Remove multiple blank lines
 * Returns true if file was modified
 */
export function autoFixMDFormatting(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  const isComment = (line: string): boolean => {
    const trimmed = line.trim()
    return trimmed.length > 0 && getHeadingLevel(trimmed) === null
  }

  const isBlank = (line: string): boolean => {
    return line.trim() === ''
  }

  // Step 1: Fix spacing (only for valid headers)
  const spacingFixed = lines.map((line) => {
    const trimmed = line.trim()

    // Fix H2 spacing
    if (trimmed.match(MD_HEADINGS.SUITE.REGEX_FIX)) {
      return trimmed.replace(MD_HEADINGS.SUITE.REGEX_FIX, MD_HEADINGS.SUITE.PREFIX)
    }

    // Fix H3 spacing
    if (trimmed.match(MD_HEADINGS.TEST_CASE.REGEX_FIX)) {
      return trimmed.replace(MD_HEADINGS.TEST_CASE.REGEX_FIX, MD_HEADINGS.TEST_CASE.PREFIX)
    }

    // Fix H4 spacing
    if (trimmed.match(MD_HEADINGS.STEP.REGEX_FIX)) {
      return trimmed.replace(MD_HEADINGS.STEP.REGEX_FIX, MD_HEADINGS.STEP.PREFIX)
    }

    // Fix list marker spacing
    if (trimmed.startsWith('-') && !trimmed.startsWith('--')) {
      return trimmed.replace(/^-\s*/, '- ')
    }

    return line
  })

  // Step 2: Remove multiple blank lines first
  const noMultipleBlanks: string[] = []
  for (let i = 0; i < spacingFixed.length; i++) {
    const line = spacingFixed[i]
    const lastAdded =
      noMultipleBlanks.length > 0 ? noMultipleBlanks[noMultipleBlanks.length - 1] : null

    // Skip blank lines at the beginning of file
    if (isBlank(line) && noMultipleBlanks.length === 0) {
      continue
    }

    // Skip multiple consecutive blank lines
    if (isBlank(line) && lastAdded !== null && isBlank(lastAdded)) {
      continue
    }

    noMultipleBlanks.push(line)
  }

  // Step 3: Fix blank lines between headers and comments
  const finalLines: string[] = []

  for (let i = 0; i < noMultipleBlanks.length; i++) {
    const line = noMultipleBlanks[i]
    const nextLine = i + 1 < noMultipleBlanks.length ? noMultipleBlanks[i + 1] : null
    const lastAdded = finalLines.length > 0 ? finalLines[finalLines.length - 1] : null
    const isHeader = getHeadingLevel(line.trim()) !== null

    // Skip blank line between comments
    if (
      isBlank(line) &&
      lastAdded !== null &&
      isComment(lastAdded) &&
      nextLine !== null &&
      isComment(nextLine)
    ) {
      continue
    }

    finalLines.push(line)

    // Add blank line after header if next line is not blank and not end
    if (isHeader && nextLine !== null && !isBlank(nextLine)) {
      finalLines.push('')
    }

    // Add blank line before header if previous was comment
    const nextIsHeader = nextLine !== null && getHeadingLevel(nextLine.trim()) !== null
    if (isComment(line) && nextIsHeader) {
      finalLines.push('')
    }
  }

  const newContent = finalLines.join('\n')
  const modified = content !== newContent

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8')
  }

  return modified
}
