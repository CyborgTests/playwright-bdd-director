import fs from 'fs'

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
    errors.push({
      type: 'structure',
      message: `Cannot read file: ${error instanceof Error ? error.message : String(error)}`
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

    // 2. H1 (# ...)
    if (trimmed.startsWith('# ') && !trimmed.startsWith('##')) continue

    // 3. H2 (## ...)
    if (trimmed.startsWith('## ') && !trimmed.startsWith('###')) continue

    // 4. H3 (### ...)
    if (trimmed.startsWith('### ')) continue

    // 5. List/comment (- ...)
    if (trimmed.startsWith('- ')) continue

    // Everything else is invalid
    errors.push({
      type: 'structure',
      message: `Invalid line format`,
      line: i + 1,
      context: trimmed
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
    if (trimmed.startsWith('### ')) {
      headings.push({ level: 3, line: i + 1, text: trimmed })
    } else if (trimmed.startsWith('## ') && !trimmed.startsWith('###')) {
      headings.push({ level: 2, line: i + 1, text: trimmed })
    } else if (trimmed.startsWith('# ') && !trimmed.startsWith('##')) {
      headings.push({ level: 1, line: i + 1, text: trimmed })
    }
  }

  // Check: exactly one H1
  const h1Count = headings.filter((h) => h.level === 1).length
  if (h1Count === 0) {
    errors.push({
      type: 'structure',
      message: `Missing test suite (H1) heading`
    })
  } else if (h1Count > 1) {
    errors.push({
      type: 'structure',
      message: `Multiple test suite (H1) headings found (expected exactly one)`,
      context: headings
        .filter((h) => h.level === 1)
        .map((h) => `Line ${h.line}: ${h.text}`)
        .join('\n')
    })
  }

  // Check: H1 is first heading
  if (headings.length > 0 && headings[0].level !== 1) {
    errors.push({
      type: 'structure',
      message: `First heading must be test suite (H1)`,
      line: headings[0].line,
      context: headings[0].text
    })
  }

  // Check: at least one H2 after H1
  const h2Count = headings.filter((h) => h.level === 2).length
  if (h1Count === 1 && h2Count === 0) {
    errors.push({
      type: 'structure',
      message: `Missing test case (H2) headings`
    })
  }

  // Check: at least one H3 after each H2
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].level === 2) {
      const nextH2Index = headings.findIndex((h, idx) => idx > i && h.level === 2)
      const endIndex = nextH2Index === -1 ? headings.length : nextH2Index
      const h3BetweenCount = headings.slice(i + 1, endIndex).filter((h) => h.level === 3).length

      if (h3BetweenCount === 0) {
        errors.push({
          type: 'structure',
          message: `Test case (H2) must have at least one step (H3)`,
          line: headings[i].line,
          context: headings[i].text
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
      1: 'test suite (H1)',
      2: 'test case (H2)',
      3: 'step (H3)'
    }

    // Can go: same level (0), down one level (+1), or up any levels (negative)
    // Cannot: skip levels (+2 or more)
    if (levelDiff > 1) {
      errors.push({
        type: 'structure',
        message: `Invalid heading order: cannot skip from ${levelNames[prev.level]} to ${levelNames[curr.level]}`,
        line: curr.line,
        context: curr.text
      })
    }
  }

  return errors
}

/**
 * Auto-fix MD formatting issues:
 * - Exactly one space after #/##/###/-
 * - Correct blank lines between headers and comments
 * - Remove multiple blank lines
 * Returns true if file was modified
 */
export function autoFixMDFormatting(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  const isHeader = (line: string): boolean => {
    const trimmed = line.trim()
    return (
      trimmed.startsWith('# ') ||
      (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) ||
      trimmed.startsWith('### ')
    )
  }

  const isComment = (line: string): boolean => {
    const trimmed = line.trim()
    return trimmed.length > 0 && !isHeader(line)
  }

  const isBlank = (line: string): boolean => {
    return line.trim() === ''
  }

  // Step 1: Fix spacing (only for valid headers)
  const spacingFixed = lines.map((line) => {
    const trimmed = line.trim()

    // Fix H1 spacing
    if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
      return trimmed.replace(/^#+\s*/, '# ')
    }

    // Fix H2 spacing
    if (trimmed.startsWith('##') && !trimmed.startsWith('###')) {
      return trimmed.replace(/^##\s*/, '## ')
    }

    // Fix H3 spacing
    if (trimmed.startsWith('###')) {
      return trimmed.replace(/^###\s*/, '### ')
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
    if (isHeader(line) && nextLine !== null && !isBlank(nextLine)) {
      finalLines.push('')
    }

    // Add blank line before header if previous was comment
    if (isComment(line) && nextLine !== null && isHeader(nextLine)) {
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
