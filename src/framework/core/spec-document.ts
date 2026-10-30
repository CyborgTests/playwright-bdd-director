import type { Feature } from '@cucumber/messages'
import fs from 'fs'

import { BACKGROUND_TTL, MD_HEADINGS, MD_TABLE_PREFIX } from '../constants/markdown'
import { isBackgroundTitle } from '../utils/helpers'
import { parseGherkinDocument, parseGherkinSource } from './gherkin-parser'
import { type ParsedMD, parseMDFile } from './md-parser'

export interface SpecDocument {
  feature: Feature
  markdown: boolean // Markdown spec: steps have no keyword (`*` in the Gherkin form)
  specLine: (line: number) => number // line of the document → line of the spec file
}

/** Lines of a Markdown spec, 1-based, in the order of its parsed test cases */
interface MarkdownLines {
  suite: number
  testCases: Array<{ heading: number; steps: number[]; rows: number[] }>
}

/**
 * Spec of either format as a Gherkin document - one model the tests are generated from
 * @throws Error for an invalid spec
 */
export function parseSpecDocument(specPath: string): SpecDocument {
  if (!specPath.endsWith('.md')) {
    const { feature } = parseGherkinDocument(specPath)
    if (!feature) throw new Error(`No "Feature:" in ${specPath}`)
    return { feature, markdown: false, specLine: (line) => line }
  }

  const sourceLines: number[] = []
  const gherkin = markdownToGherkin(
    parseMDFile(specPath),
    specPath,
    findMarkdownLines(fs.readFileSync(specPath, 'utf-8')),
    sourceLines
  )
  const { feature } = parseGherkinSource(gherkin, specPath)
  if (!feature) throw new Error(`No "Feature:" in ${specPath}`)
  return { feature, markdown: true, specLine: (line) => sourceLines[line] ?? line }
}

/**
 * Gherkin form of a Markdown spec: suite → Feature, Background → Background (first), test case →
 * Scenario (Outline with its examples table), step → `* <step>`, tags lines → tags, `[ID]` stays
 * in the name. Details (bullet lines) are notes for people and are left out.
 * @param markdownLines - where the parsed spec stands in its file
 * @param sourceLines - filled with the Markdown line of each Gherkin line (index: Gherkin line)
 * @throws Error for more than one Background
 */
export function markdownToGherkin(
  parsed: ParsedMD,
  specPath: string,
  markdownLines?: MarkdownLines,
  sourceLines: number[] = []
): string {
  const backgrounds = parsed.testCases.filter((tc) => isBackgroundTitle(tc.ttl))
  if (backgrounds.length > 1) {
    throw new Error(`Several Background test cases in ${specPath}\n  Fix: Keep one ### Background`)
  }

  const lines: string[] = []
  const add = (text: string, source?: number) => {
    lines.push(text)
    if (source !== undefined) sourceLines[lines.length] = source
  }
  tagLine(parsed.suiteTags).forEach((line) => add(line))
  add(`Feature: ${parsed.suiteTtl}`, markdownLines?.suite)
  for (const tc of [
    ...backgrounds,
    ...parsed.testCases.filter((tc) => !backgrounds.includes(tc))
  ]) {
    const source = markdownLines?.testCases[parsed.testCases.indexOf(tc)]
    add('')
    if (isBackgroundTitle(tc.ttl)) {
      add(`  ${tc.ttl === BACKGROUND_TTL ? `${BACKGROUND_TTL}:` : tc.ttl}`, source?.heading)
    } else {
      tagLine(tc.tags, '  ').forEach((line) => add(line))
      add(
        `  Scenario${tc.examples ? ' Outline' : ''}: ${tc.id ? `[${tc.id}] ` : ''}${tc.ttl}`,
        source?.heading
      )
    }
    tc.stepTtls.forEach((step, i) => add(`    * ${step}`, source?.steps[i]))
    if (tc.examples) {
      add('')
      add('    Examples:')
      add(`      | ${tc.examples.columns.map(escapeCell).join(' | ')} |`)
      tc.examples.rows.forEach((row, i) =>
        add(`      | ${row.map(escapeCell).join(' | ')} |`, source?.rows[i])
      )
    }
  }
  return `${lines.join('\n')}\n`
}

/** Headings and table rows of a Markdown spec parseMDFile has accepted */
function findMarkdownLines(content: string): MarkdownLines {
  const found: MarkdownLines = { suite: 1, testCases: [] }
  let suiteFound = false
  let tableLines = 0
  content.split('\n').forEach((text, i) => {
    const line = text.trim()
    const testCase = found.testCases.at(-1)
    if (line.startsWith(MD_TABLE_PREFIX)) {
      // The first two lines of a table are its header and separator
      if (++tableLines > 2) testCase?.rows.push(i + 1)
      return
    }
    tableLines = 0
    if (line.startsWith(MD_HEADINGS.SUITE.PREFIX) && !suiteFound) {
      suiteFound = true
      found.suite = i + 1
    } else if (line.startsWith(MD_HEADINGS.TEST_CASE.PREFIX)) {
      found.testCases.push({ heading: i + 1, steps: [], rows: [] })
    } else if (
      line.match(MD_HEADINGS.STEP.REGEX_NO_ID) &&
      line.startsWith(MD_HEADINGS.STEP.PREFIX)
    ) {
      testCase?.steps.push(i + 1)
    }
  })
  return found
}

function tagLine(tags: string[], indent = ''): string[] {
  return tags.length > 0 ? [`${indent}${tags.join(' ')}`] : []
}

export function escapeCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}
