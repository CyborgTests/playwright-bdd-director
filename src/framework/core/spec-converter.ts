import type { Background, Comment, Feature, Scenario, Step } from '@cucumber/messages'

import { isHeading, MD_HEADINGS, MD_HORIZONTAL_RULE, MD_TABLE_PREFIX } from '../constants/markdown'
import { isBackgroundTitle, parseTagsLine } from '../utils/helpers'
import { formatMarkdownSpec } from '../validation/md-validator'
import { parseGherkinSource } from './gherkin-parser'
import { splitTableRow } from './md-parser'
import { escapeCell } from './spec-document'

/** Suite, test case or step of a spec with its notes for people */
interface Block {
  tags: string[]
  title: string // heading text as written: `[TC01] Login`, `Background`
  notes: string[]
  table: string[][] // examples: column names, then rows
  steps: { text: string; notes: string[] }[]
}

/**
 * Gherkin form of a valid Markdown spec, notes kept: suite and test case notes → descriptions
 * (`- note`), step notes → `# note` comments under the step; steps take `*` (Markdown has no
 * keywords - step definitions match the text either way), Background goes first, `[ID]`s stay
 */
export function markdownSpecToFeature(content: string): string {
  const { suite, cases } = readMarkdown(content)
  const lines = [...tagLine(suite.tags), `Feature: ${suite.title}`]
  lines.push(...suite.notes.map((note) => `  - ${note}`))

  const backgrounds = cases.filter((tc) => isBackgroundTitle(tc.title))
  for (const tc of [...backgrounds, ...cases.filter((tc) => !backgrounds.includes(tc))]) {
    const keyword = isBackgroundTitle(tc.title)
      ? null
      : tc.table.length > 0
        ? 'Scenario Outline'
        : 'Scenario'
    lines.push(
      '',
      ...tagLine(tc.tags, '  '),
      keyword ? `  ${keyword}: ${tc.title}` : `  ${backgroundLine(tc.title)}`,
      ...tc.notes.map((note) => `    - ${note}`)
    )
    for (const step of tc.steps) {
      lines.push(`    * ${step.text}`, ...step.notes.map((note) => `    # ${note}`))
    }
    if (tc.table.length > 0) lines.push('', '    Examples:', ...tableLines(tc.table, '      '))
  }
  return `${lines.join('\n')}\n`
}

/**
 * Markdown form of a Gherkin spec, as `npm run stage` formats it: descriptions and comments →
 * `- note` lines (a comment belongs to the element above it), step keywords dropped (step
 * definitions match the text only), several Examples blocks joined into one table
 * @throws Error listing what Markdown cannot hold: Rule, DataTable, DocString, tagged, named or
 * described Examples
 */
export function featureSpecToMarkdown(content: string, specPath: string): string {
  const document = parseGherkinSource(content, specPath)
  const feature = document.feature
  if (!feature) throw new Error(`No "Feature:" in ${specPath}`)
  assertMarkdownCanHold(feature, specPath)

  const suite = toBlock(feature.tags, feature.name, feature.description)
  const cases: Block[] = []
  const anchors: { line: number; notes: string[] }[] = [{ line: 0, notes: suite.notes }]
  for (const child of feature.children) {
    const element: Background | Scenario | undefined = child.background ?? child.scenario
    if (!element) continue
    const title = child.background ? backgroundTitle(child.background) : element.name
    const block = toBlock(child.scenario?.tags ?? [], title, element.description)
    block.table = child.scenario ? joinExamples(child.scenario) : []
    block.steps = element.steps.map((step) => ({ text: step.text, notes: [] }))
    anchors.push({ line: element.location.line, notes: block.notes })
    element.steps.forEach((step, index) =>
      anchors.push({ line: step.location.line, notes: block.steps[index].notes })
    )
    cases.push(block)
  }
  attachComments(document.comments, anchors)

  const lines = [...tagLine(suite.tags), `${MD_HEADINGS.SUITE.PREFIX}${suite.title}`]
  lines.push(...suite.notes.map((note) => `- ${note}`))
  for (const tc of cases) {
    lines.push(
      ...tagLine(tc.tags),
      `${MD_HEADINGS.TEST_CASE.PREFIX}${tc.title}`,
      ...tc.notes.map((note) => `- ${note}`),
      ...tableLines(tc.table, '', true)
    )
    for (const step of tc.steps) {
      lines.push(`${MD_HEADINGS.STEP.PREFIX}${step.text}`, ...step.notes.map((note) => `- ${note}`))
    }
  }
  return formatMarkdownSpec(lines.join('\n'))
}

/** Suite and test cases of a Markdown spec; a line that is no heading, tags or table is a note */
function readMarkdown(content: string): { suite: Block; cases: Block[] } {
  const suite = newBlock([], '')
  const cases: Block[] = []
  let tags: string[] = []
  for (const line of content.split('\n').map((text) => text.trim())) {
    const current = cases.at(-1)
    const lineTags = parseTagsLine(line)
    if (line === '' || line === MD_HORIZONTAL_RULE) continue
    if (lineTags) {
      tags.push(...lineTags)
    } else if (isHeading(line, 2)) {
      Object.assign(suite, { tags, title: headingText(line) })
      tags = []
    } else if (isHeading(line, 3)) {
      cases.push(newBlock(tags, headingText(line)))
      tags = []
    } else if (isHeading(line, 4) && current) {
      current.steps.push({ text: headingText(line), notes: [] })
    } else if (line.startsWith(MD_TABLE_PREFIX) && current) {
      const cells = splitTableRow(line)
      if (!cells.every((cell) => /^:?-+:?$/.test(cell))) current.table.push(cells)
    } else {
      const notes = current ? (current.steps.at(-1)?.notes ?? current.notes) : suite.notes
      notes.push(line.replace(/^-\s*/, ''))
    }
  }
  return { suite, cases }
}

function newBlock(tags: string[], title: string): Block {
  return { tags, title, notes: [], table: [], steps: [] }
}

function headingText(line: string): string {
  return line.replace(/^#+\s*/, '')
}

/** Description lines → notes: a `-` / `*` line starts one, other lines continue it */
function toBlock(tags: readonly { name: string }[], title: string, description: string): Block {
  const notes: string[] = []
  let continues = false
  for (const line of description.split('\n').map((text) => text.trim())) {
    const bullet = line.match(/^[-*]\s+(.*)/)
    if (line === '') {
      continues = false
    } else if (continues && !bullet) {
      notes[notes.length - 1] += ` ${line}`
    } else {
      notes.push(bullet ? bullet[1] : line)
      continues = true
    }
  }
  return {
    ...newBlock(
      tags.map((tag) => tag.name),
      title.trim()
    ),
    notes
  }
}

function backgroundTitle(background: Background): string {
  const name = background.name.trim()
  return name ? `Background: ${name}` : 'Background'
}

/** "Background" → "Background:", "Background: Login" stays */
function backgroundLine(title: string): string {
  return title.includes(':') ? title : `${title}:`
}

function joinExamples(scenario: Scenario): string[][] {
  const blocks = scenario.examples.filter((block) => block.tableHeader)
  if (blocks.length === 0) return []
  const cells = (row: { cells: readonly { value: string }[] }) => row.cells.map((c) => c.value)
  return [cells(blocks[0].tableHeader!), ...blocks.flatMap((block) => block.tableBody.map(cells))]
}

/** Each comment becomes a note of the closest element above it (the suite for a file header) */
function attachComments(
  comments: readonly Comment[],
  anchors: { line: number; notes: string[] }[]
) {
  const sorted = [...anchors].sort((a, b) => a.line - b.line)
  for (const comment of comments) {
    const note = comment.text.trim().replace(/^#\s*/, '').replace(/^-\s*/, '')
    if (note === '') continue
    const anchor = sorted.filter((candidate) => candidate.line < comment.location.line).at(-1)
    ;(anchor ?? sorted[0]).notes.push(note)
  }
}

function assertMarkdownCanHold(feature: Feature, specPath: string): void {
  const problems: string[] = []
  const checkSteps = (steps: readonly Step[]) =>
    steps.forEach((step) => {
      const at = `step "${step.text}" (line ${step.location.line})`
      if (step.dataTable) problems.push(`DataTable of ${at}`)
      if (step.docString) problems.push(`DocString of ${at}`)
    })
  for (const child of feature.children) {
    if (child.rule) {
      problems.push(`Rule "${child.rule.name}" (line ${child.rule.location.line})`)
      continue
    }
    checkSteps(child.background?.steps ?? child.scenario?.steps ?? [])
    for (const block of child.scenario?.examples ?? []) {
      const at = `Examples of "${child.scenario!.name}" (line ${block.location.line})`
      if (block.tags.length > 0) problems.push(`tags of ${at}`)
      if (block.name.trim() || block.description.trim())
        problems.push(`name or description of ${at}`)
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Markdown cannot hold ${specPath}:\n${problems.map((p) => `  - ${p}`).join('\n')}\n  Fix: Keep the suite in Gherkin, or remove these from it first`
    )
  }
}

function tagLine(tags: string[], indent = ''): string[] {
  return tags.length > 0 ? [`${indent}${tags.join(' ')}`] : []
}

/**
 * Table rows with aligned columns; Markdown adds a separator row under the column names and
 * escapes only `|` (Gherkin also `\`)
 */
function tableLines(rows: string[][], indent: string, markdown = false): string[] {
  if (rows.length === 0) return []
  const escaped = rows.map((row) =>
    row.map((cell) => (markdown ? cell.replace(/\|/g, '\\|') : escapeCell(cell)))
  )
  const widths = escaped[0].map((_, column) =>
    Math.max(markdown ? 3 : 0, ...escaped.map((row) => row[column]?.length ?? 0))
  )
  const line = (row: string[]) =>
    `${indent}| ${widths.map((width, column) => (row[column] ?? '').padEnd(width)).join(' | ')} |`
  const separator = widths.map((width) => '-'.repeat(width))
  return markdown
    ? [line(escaped[0]), line(separator), ...escaped.slice(1).map(line)]
    : escaped.map(line)
}
