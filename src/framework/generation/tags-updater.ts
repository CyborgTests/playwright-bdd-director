import fs from 'fs'

import { PATHS } from '../constants/paths'

/**
 * Add new tag to src/constants/tags.ts if not exists
 */
export function addSuiteTag(suiteName: string): void {
  const tagsPath = PATHS.TAGS_FILE
  const content = fs.readFileSync(tagsPath, 'utf-8')

  const tagConstant = getTagConstant(suiteName)
  const tagValue = `@${suiteName.toLowerCase()}`

  // Check if tag already exists
  if (content.includes(`${tagConstant}:`)) {
    return // Tag already exists
  }

  // Find SUITE object
  const suiteRegex = /(SUITE:\s*\{)([\s\S]*?)(}\s*)/
  const match = content.match(suiteRegex)

  if (!match) {
    throw new Error('Could not find SUITE object in tags.ts')
  }

  const suiteStart = match[1]
  let suiteContent = match[2]
  const suiteEnd = match[3]

  // Add comma after last tag if it doesn't have one
  suiteContent = suiteContent.replace(/('[^']+')(\s*\n)(\s*)$/, '$1,$2$3')

  // Extract indent from existing content (should be 4 spaces)
  const indentMatch = suiteContent.match(/\n(\s+)\w+:/)
  const indent = indentMatch ? indentMatch[1] : '    '

  // Remove trailing spaces before closing brace
  suiteContent = suiteContent.replace(/\s+$/, '')

  // Add new tag with proper indent
  const newTag = `\n${indent}${tagConstant}: '${tagValue}'\n  `
  const updatedContent = content.replace(
    suiteRegex,
    `${suiteStart}${suiteContent}${newTag}${suiteEnd}`
  )

  fs.writeFileSync(tagsPath, updatedContent)
}

/**
 * Add npm script to package.json for running manual tests with specific tag
 */
export function addManualScript(suiteName: string): void {
  const packagePath = PATHS.PACKAGE_JSON
  const packageContent = fs.readFileSync(packagePath, 'utf-8')
  const pkg = JSON.parse(packageContent)

  const scriptName = `play:manual-${suiteName.toLowerCase()}`
  const tagValue = `@${suiteName.toLowerCase()}`

  // Check if script already exists
  if (pkg.scripts[scriptName]) {
    return // Script already exists
  }

  // Find the last play:manual-* script to insert after it
  const scriptKeys = Object.keys(pkg.scripts)
  let lastManualIndex = -1

  for (let i = 0; i < scriptKeys.length; i++) {
    if (scriptKeys[i]?.startsWith('play:manual-')) {
      lastManualIndex = i
    }
  }

  // Insert new script after the last play:manual-* script
  const newScripts: Record<string, string> = {}
  const insertIndex =
    lastManualIndex >= 0 ? lastManualIndex + 1 : scriptKeys.indexOf('play:manual') + 1

  for (let i = 0; i < scriptKeys.length; i++) {
    const key = scriptKeys[i]
    if (!key) continue
    newScripts[key] = pkg.scripts[key] as string

    // Insert new script after the last manual script
    if (i === insertIndex - 1) {
      newScripts[scriptName] =
        `npm run dress && playwright test --grep "@manual.*${tagValue}" --workers=1`
    }
  }

  pkg.scripts = newScripts

  // Write back with 2-space indentation
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')
}

/**
 * Extract suite name from base name or suite title
 * Examples:
 * - "todo" -> "todo"
 * - "login" -> "login"
 * - "edge-cases" -> "edge-cases"
 */
export function extractSuiteName(baseName: string): string {
  return baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

/**
 * Convert suite name to tag constant name
 * Examples:
 * - "todo" -> "TODO"
 * - "edge-cases" -> "EDGE_CASES"
 */
export function getTagConstant(suiteName: string): string {
  return suiteName.toUpperCase().replace(/-/g, '_')
}
