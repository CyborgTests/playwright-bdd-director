import type { Expression } from '@cucumber/cucumber-expressions'
import { CucumberExpression } from '@cucumber/cucumber-expressions'
import type { Feature, Scenario, Step } from '@cucumber/messages'
import fs from 'fs'

import { parseSpecDocument } from '../core/spec-document'
import { isBackgroundTitle, toPosix } from '../utils/helpers'
import {
  getParameterTypes,
  getStepDefinitions,
  matchStepDefinitions,
  type StepDefinition
} from './registry'

/** A step as written in a spec: `<column>` placeholders filled from the examples rows */
interface SpecStep {
  text: string
  keyword: string // Gherkin keyword ("When "); Markdown steps have none
  line: number // line in the .feature file; Markdown steps are found by their text
  rows: Record<string, string>[]
}

export interface StepReword {
  from: string
  to: string
  definition?: string // location of the step definition whose pattern changed - its code did not
  specs: { file: string; steps: number }[]
  automatedBy?: string // the reworded manual step matches this step definition now
  nowAutomated: string[] // manual spec steps the new pattern matches: they run its code now
}

/**
 * What a spec line holds, as `reword` takes it: a step (the pattern of its definition or its own
 * text) or the title of the suite, a rule or a test case (`label`: "Suite", "Test case", "Rule")
 */
export interface LineToReword {
  kind: 'step' | 'title'
  text: string
  definition?: string // location: the text is the pattern of this step definition
  label?: string
}

export interface TitleReword {
  file: string
  label: string
  from: string
  to: string
}

const MD_TITLE = /^(#{2,3})\s+(.*?)\s*$/
const GHERKIN_TITLE =
  /^(\s*)(Feature|Rule|Scenario Outline|Scenario Template|Scenario|Example|Background):(\s*)(.*?)\s*$/
const LABELS: Record<string, string> = { '##': 'Suite', '###': 'Test case', Feature: 'Suite' }

/**
 * Reword a step (step definitions must be loaded). A step with a definition is given by its
 * pattern: the pattern changes and every spec step it matches is rewritten with the values of its
 * parameters (`user adds {int} pieces` → `user puts {int} pieces`: `user adds 3 pieces` →
 * `user puts 3 pieces`). A manual step is given by its text, changed in every spec.
 * All or nothing: every check runs before a file is written; `check` writes nothing.
 * @throws Error when the step is not found or the new text is invalid or ambiguous
 */
export function rewordStep(
  from: string,
  to: string,
  specFiles: string[],
  { check = false }: { check?: boolean } = {}
): StepReword {
  const target = to.trim()
  if (!target || /[\r\n]/.test(target)) throw new Error('A step is one line of text')
  if (target === from) throw new Error(`"${from}" is the text already`)

  const regexp = getStepDefinitions().find(
    (definition) => typeof definition.pattern !== 'string' && String(definition.pattern) === from
  )
  if (regexp) {
    throw new Error(
      `${from} at ${regexp.location} is a regular expression\n  Fix: Change it and its spec steps by hand`
    )
  }
  const specs = specFiles.map((file) => ({ file, steps: collectSteps(file) }))
  const definition = getStepDefinitions().find((candidate) => candidate.pattern === from)
  const plan = definition
    ? planPatternChange(definition, target, specs)
    : planTextChange(from, target, specs)

  const result: StepReword = { from, to: target, specs: [], nowAutomated: plan.nowAutomated }
  const writes = new Map<string, string>()
  for (const { file, changes } of plan.specs) {
    writes.set(file, rewriteSpec(file, changes))
    result.specs.push({ file: toPosix(file), steps: changes.size })
  }
  if (definition) {
    writes.set(definition.location.replace(/:\d+$/, ''), rewritePattern(definition, target))
    result.definition = definition.location
  } else {
    result.automatedBy = plan.automatedBy
  }

  if (!check) writes.forEach((content, file) => fs.writeFileSync(file, content))
  return result
}

/**
 * What a line of a spec holds (1-based, as the editor shows it): a step - the pattern of its step
 * definition or, for a manual step, its own text - or the title of the suite, a rule or a test case
 * @throws Error when the line holds neither or the step matches several definitions
 */
export function findAtLine(specPath: string, line: number): LineToReword {
  const source = fs.readFileSync(specPath, 'utf-8').split(/\r?\n/)[line - 1] ?? ''
  const title = titleAt(specPath, source)
  if (title) return { kind: 'title', label: title.label, text: title.text }

  const steps = collectSteps(specPath)
  const heading = source.match(/^#{4}\s+(.*?)\s*$/)
  const step = specPath.endsWith('.md')
    ? heading && steps.find((candidate) => candidate.text === heading[1])
    : steps.find((candidate) => candidate.line === line)
  if (!step) throw new Error(`Line ${line} of ${toPosix(specPath)} is not a step or a title`)

  const definitions = getStepDefinitions().filter((definition) =>
    argumentSpans(definition.expression, step)
  )
  if (definitions.length > 1) {
    throw new Error(
      `"${step.text}" matches several step definitions: ${definitions.map((d) => d.location).join(', ')}`
    )
  }
  if (definitions.length === 0) return { kind: 'step', text: step.text }
  const [{ pattern, location }] = definitions
  if (typeof pattern !== 'string') {
    throw new Error(`${String(pattern)} at ${location} is a regular expression - reword it by hand`)
  }
  return { kind: 'step', text: pattern, definition: location }
}

/**
 * A new title for the suite, a rule or a test case at a spec line: only this line changes - a
 * title is not shared like a step. All or nothing: the spec must stay valid with no two test cases
 * (or rules) of the same name side by side; the old content comes back otherwise.
 * @throws Error when the line holds no title or the new one is invalid
 */
export function rewordTitle(specPath: string, line: number, to: string): TitleReword {
  const target = to.trim()
  if (!target || /[\r\n]/.test(target)) throw new Error('A title is one line of text')
  const content = fs.readFileSync(specPath, 'utf-8')
  const lines = content.split('\n')
  const source = lines[line - 1] ?? ''
  const title = titleAt(specPath, source)
  if (!title) throw new Error(`Line ${line} of ${toPosix(specPath)} is not a title`)
  if (target === title.text) throw new Error(`"${target}" is the title already`)
  if (specPath.endsWith('.md') && isBackgroundTitle(target)) {
    throw new Error(`"${target}" would make the test case a Background`)
  }

  lines[line - 1] = title.prefix + target + source.slice(title.prefix.length + title.text.length)
  fs.writeFileSync(specPath, lines.join('\n'))
  try {
    assertUniqueTitles(parseSpecDocument(specPath).feature)
  } catch (error: unknown) {
    fs.writeFileSync(specPath, content)
    throw error
  }
  return { file: toPosix(specPath), label: title.label, from: title.text, to: target }
}

/** Title on a line: the text after `##` / `###` or `Scenario:`; a Background has none to change */
function titleAt(
  specPath: string,
  source: string
): { label: string; text: string; prefix: string } | null {
  if (specPath.endsWith('.md')) {
    const match = source.match(MD_TITLE)
    if (!match) return null
    if (match[1] === '###' && isBackgroundTitle(match[2])) {
      throw new Error('A Background has no title to change')
    }
    return {
      label: LABELS[match[1]],
      text: match[2],
      prefix: source.slice(0, source.indexOf(match[2]))
    }
  }
  const match = source.match(GHERKIN_TITLE)
  if (!match) return null
  if (match[2] === 'Background') throw new Error('A Background has no title to change')
  return {
    label: LABELS[match[2]] ?? (match[2] === 'Rule' ? 'Rule' : 'Test case'),
    text: match[4],
    prefix: match[1] + match[2] + ':' + match[3]
  }
}

/** Test cases and rules side by side need distinct names: their tests would share titles */
function assertUniqueTitles(feature: Feature): void {
  const check = (children: Feature['children']) => {
    const names = new Set<string>()
    for (const child of children) {
      const node = child.scenario ?? child.rule
      if (!node) continue
      if (names.has(node.name)) throw new Error(`Two test cases or rules are named "${node.name}"`)
      names.add(node.name)
      if (child.rule) check(child.rule.children)
    }
  }
  check(feature.children)
}

interface Plan {
  specs: { file: string; changes: Map<SpecStep, string> }[]
  nowAutomated: string[]
  automatedBy?: string
}

/** Steps a definition matches, rewritten for its new pattern; no other step may become ambiguous */
function planPatternChange(
  definition: StepDefinition,
  pattern: string,
  specs: { file: string; steps: SpecStep[] }[]
): Plan {
  if (getStepDefinitions().some((other) => other !== definition && other.pattern === pattern)) {
    throw new Error(`"${pattern}" is the pattern of another step definition`)
  }
  const expression = new CucumberExpression(pattern, getParameterTypes()) // checks the syntax
  const parts = patternParts(pattern)
  const oldNames = patternParts(String(definition.pattern), false).flatMap((p) => p.parameter ?? [])
  const newNames = parts.flatMap((part) => part.parameter ?? [])
  if (oldNames.join() !== newNames.join()) {
    throw new Error(
      `The new pattern must keep the parameters ${oldNames.map((n) => `{${n}}`).join(' ') || '(none)'} in this order\n  Fix: Change only the words around them`
    )
  }

  const plan: Plan = { specs: [], nowAutomated: [] }
  for (const { file, steps } of specs) {
    const changes = new Map<SpecStep, string>()
    for (const step of steps) {
      const spans = argumentSpans(definition.expression, step)
      let index = 0
      const text = spans
        ? parts
            .map((part) =>
              part.parameter === undefined ? part.text : step.text.slice(...spans[index++])
            )
            .join('')
        : step.text
      for (const filled of filledTexts(text, step.rows)) {
        const matched = expression.match(filled)
        if (spans && !matched) throw new Error(`"${filled}" would not match "${pattern}"`)
        if (!matched) continue
        const others = matchStepDefinitions(filled).filter((m) => m.definition !== definition)
        if (others.length > 0) {
          const other = others[0].definition
          throw new Error(
            `"${filled}" would match "${String(other.pattern)}" at ${other.location} too\n  Fix: Choose words no other step definition matches`
          )
        }
        if (!spans) plan.nowAutomated.push(`${toPosix(file)}: ${step.text}`)
      }
      if (spans) changes.set(step, text)
    }
    if (changes.size > 0) plan.specs.push({ file, changes })
  }
  plan.nowAutomated = [...new Set(plan.nowAutomated)]
  return plan
}

/** A manual step changed in every spec: it may match a step definition now, one at most */
function planTextChange(
  from: string,
  text: string,
  specs: { file: string; steps: SpecStep[] }[]
): Plan {
  const defined = matchStepDefinitions(from)
  if (defined.length > 0) {
    const { pattern, location } = defined[0].definition
    throw new Error(
      `"${from}" has a step definition at ${location}\n  Fix: Give its pattern: npm run reword "${String(pattern)}" "<new pattern>"`
    )
  }
  const plan: Plan = { specs: [], nowAutomated: [] }
  const matches = new Set<StepDefinition>()
  for (const { file, steps } of specs) {
    const changed = steps.filter((step) => step.text === from)
    for (const step of changed) {
      for (const filled of filledTexts(text, step.rows)) {
        matchStepDefinitions(filled).forEach((match) => matches.add(match.definition))
      }
    }
    if (changed.length > 0) {
      plan.specs.push({ file, changes: new Map(changed.map((step) => [step, text])) })
    }
  }
  if (plan.specs.length === 0) {
    throw new Error(`No spec step or step definition pattern is "${from}"`)
  }
  if (matches.size > 1) {
    throw new Error(
      `"${text}" would match several step definitions: ${[...matches].map((m) => m.location).join(', ')}`
    )
  }
  plan.automatedBy = [...matches][0]?.location
  return plan
}

/** Every step of a spec: Background, scenarios and rules, each with its examples rows */
function collectSteps(specPath: string): SpecStep[] {
  const { feature, markdown } = parseSpecDocument(specPath)
  const steps: SpecStep[] = []
  const add = (list: readonly Step[], rows: Record<string, string>[]) =>
    list.forEach((step) =>
      steps.push({
        text: step.text,
        keyword: markdown ? '' : step.keyword,
        line: step.location.line,
        rows
      })
    )
  const walk = (children: Feature['children']) => {
    for (const child of children) {
      if (child.background) add(child.background.steps, [])
      if (child.scenario) add(child.scenario.steps, examplesRows(child.scenario))
      if (child.rule) walk(child.rule.children)
    }
  }
  walk(feature.children)
  return steps
}

function examplesRows(scenario: Scenario): Record<string, string>[] {
  return scenario.examples.flatMap(({ tableHeader, tableBody }) =>
    tableBody.map((row) =>
      Object.fromEntries(
        row.cells.map((cell, i) => [tableHeader?.cells[i]?.value ?? '', cell.value])
      )
    )
  )
}

/** Step text for every examples row (the text itself without rows) */
function filledTexts(text: string, rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [text]
  return rows.map((row) => text.replace(/<([^<>]+)>/g, (all, name: string) => row[name] ?? all))
}

/**
 * Where the parameters of a definition are in a step text: [start, end) of each, in the text as
 * written - a placeholder inside a parameter counts whole (`"<product>"`); null: no match
 */
function argumentSpans(expression: Expression, step: SpecStep): [number, number][] | null {
  for (const row of step.rows.length > 0 ? step.rows : [{} as Record<string, string>]) {
    // Index in the filled text → index in the written text; a placeholder value maps to its ends
    const startAt: number[] = []
    const endAt: number[] = [0]
    let filled = ''
    let written = 0
    for (const part of step.text.split(/(<[^<>]+>)/)) {
      const value = /^<[^<>]+>$/.test(part) ? row[part.slice(1, -1)] : undefined
      for (let i = 0; i < (value ?? part).length; i++) {
        startAt.push(value === undefined ? written + i : written)
        endAt.push(value === undefined ? written + i + 1 : written + part.length)
      }
      filled += value ?? part
      written += part.length
    }
    startAt.push(written)
    const args = expression.match(filled)
    if (args) return args.map(({ group }) => [startAt[group.start ?? 0], endAt[group.end ?? 0]])
  }
  return null
}

/**
 * Literal text and `{parameters}` of a Cucumber expression. Optional text `( )` and alternatives
 * `/` have no single spelling to write into a spec step: they stop a new pattern (`strict`)
 */
function patternParts(pattern: string, strict = true): { text: string; parameter?: string }[] {
  const parts: { text: string; parameter?: string }[] = []
  let text = ''
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '\\' && i + 1 < pattern.length) {
      text += pattern[++i]
    } else if (char === '{') {
      const close = pattern.indexOf('}', i)
      parts.push({ text }, { text: '', parameter: pattern.slice(i + 1, close) })
      text = ''
      i = close
    } else if (strict && (char === '(' || char === '/')) {
      throw new Error(
        'Optional text "( )" and alternatives "/" have no single spelling for the spec steps\n  Fix: Escape them (\\( \\/) or add them to the step definition by hand afterwards'
      )
    } else {
      text += char
    }
  }
  return [...parts, { text }]
}

/** The spec with its changed steps: Gherkin by line, Markdown `#### step` headings by text */
function rewriteSpec(file: string, changes: Map<SpecStep, string>): string {
  const lines = fs.readFileSync(file, 'utf-8').split('\n')
  if (file.endsWith('.md')) {
    const byText = new Map([...changes].map(([step, text]) => [step.text, text]))
    return lines
      .map((line) => {
        const heading = line.match(/^(#{4}\s+)(.*?)(\s*)$/)
        const text = heading && byText.get(heading[2])
        return text ? `${heading[1]}${text}${heading[3]}` : line
      })
      .join('\n')
  }
  for (const [step, text] of changes) {
    const line = lines[step.line - 1]
    const keyword = step.keyword.trim()
    const start = line.indexOf(step.text, line.indexOf(keyword) + keyword.length)
    lines[step.line - 1] = line.slice(0, start) + text + line.slice(start + step.text.length)
  }
  return lines.join('\n')
}

/** The step definition file with the new pattern in place of the string literal of the old one */
function rewritePattern(definition: StepDefinition, pattern: string): string {
  const [file, line] = definition.location.split(/:(?=\d+$)/)
  const content = fs.readFileSync(file, 'utf-8')
  const literal = /(['"`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g
  literal.lastIndex = content
    .split('\n')
    .slice(0, Number(line) - 1)
    .join('\n').length
  const found = literal.exec(content)
  if (!found || found[2].includes('${') || unquote(found[2]) !== definition.pattern) {
    throw new Error(
      `The pattern at ${definition.location} is not a plain string literal\n  Fix: Change it by hand`
    )
  }
  const quote = found[1]
  let escaped = pattern.replace(/\\/g, '\\\\').split(quote).join(`\\${quote}`)
  if (quote === '`') escaped = escaped.replace(/\$\{/g, '\\${')
  return content.slice(0, found.index) + quote + escaped + quote + content.slice(literal.lastIndex)
}

/** Value of a JavaScript string literal body */
function unquote(body: string): string {
  const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', '0': '\0' }
  return body.replace(/\\([\s\S])/g, (_all, char: string) => escapes[char] ?? char)
}
