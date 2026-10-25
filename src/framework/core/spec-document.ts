import type { Feature } from '@cucumber/messages'

import { BACKGROUND_TTL } from '../constants/markdown'
import { isBackgroundTitle } from '../utils/helpers'
import { parseGherkinDocument, parseGherkinSource } from './gherkin-parser'
import { type ParsedMD, parseMDFile } from './md-parser'

export interface SpecDocument {
  feature: Feature
  markdown: boolean // Markdown spec: steps have no keyword (`*` in the Gherkin form)
}

/**
 * Spec of either format as a Gherkin document - one model the tests are generated from
 * @throws Error for an invalid spec
 */
export function parseSpecDocument(specPath: string): SpecDocument {
  const markdown = specPath.endsWith('.md')
  const document = markdown
    ? parseGherkinSource(markdownToGherkin(parseMDFile(specPath), specPath), specPath)
    : parseGherkinDocument(specPath)
  if (!document.feature) throw new Error(`No "Feature:" in ${specPath}`)
  return { feature: document.feature, markdown }
}

/**
 * Gherkin form of a Markdown spec: suite → Feature, Background → Background (first), test case →
 * Scenario (Outline with its examples table), step → `* <step>`, tags lines → tags, `[ID]` stays
 * in the name. Details (bullet lines) are notes for people and are left out.
 * @throws Error for more than one Background
 */
export function markdownToGherkin(parsed: ParsedMD, specPath: string): string {
  const backgrounds = parsed.testCases.filter((tc) => isBackgroundTitle(tc.ttl))
  if (backgrounds.length > 1) {
    throw new Error(`Several Background test cases in ${specPath}\n  Fix: Keep one ### Background`)
  }

  const lines = [...tagLine(parsed.suiteTags), `Feature: ${parsed.suiteTtl}`]
  for (const tc of [
    ...backgrounds,
    ...parsed.testCases.filter((tc) => !backgrounds.includes(tc))
  ]) {
    lines.push('')
    if (isBackgroundTitle(tc.ttl)) {
      lines.push(`  ${tc.ttl === BACKGROUND_TTL ? `${BACKGROUND_TTL}:` : tc.ttl}`)
    } else {
      lines.push(
        ...tagLine(tc.tags, '  '),
        `  Scenario${tc.examples ? ' Outline' : ''}: ${tc.id ? `[${tc.id}] ` : ''}${tc.ttl}`
      )
    }
    lines.push(...tc.stepTtls.map((step) => `    * ${step}`))
    if (tc.examples) {
      lines.push(
        '',
        '    Examples:',
        ...[tc.examples.columns, ...tc.examples.rows].map(
          (row) => `      | ${row.map(escapeCell).join(' | ')} |`
        )
      )
    }
  }
  return `${lines.join('\n')}\n`
}

function tagLine(tags: string[], indent = ''): string[] {
  return tags.length > 0 ? [`${indent}${tags.join(' ')}`] : []
}

function escapeCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}
