import { CucumberExpressionGenerator } from '@cucumber/cucumber-expressions'
import type { Background, Rule, Scenario, Step, Tag } from '@cucumber/messages'
import { parse as parseTagExpression } from '@cucumber/tag-expressions'
import { glob } from 'glob'
import path from 'path'
import prettier from 'prettier'
import { pathToFileURL } from 'url'

import { CONFIG } from '../config'
import { getBackgroundTitle, parseGherkinDocument } from '../core/gherkin-parser'
import { quoteString } from '../generation/examples-code'
import { extractSuiteName, getTagConstant } from '../generation/tags-updater'
import { fillPlaceholders, getErrorMessage, getMarkdownBaseName } from '../utils/helpers'
import {
  BDD_CONTEXT,
  getHookDefinitions,
  getParameterTypes,
  getPomNodes,
  type HookDefinition,
  type HookKind,
  matchStepDefinitions,
  type PomClass,
  type PomNode,
  type StepDefinition
} from './registry'
import { formatAmbiguous } from './runtime'

export interface MissingStep {
  title: string // "When user clicks \"Login\""
  snippet: string // step definition to start from
}

export interface BddGeneration {
  specPath: string
  testPath: string
  content: string // formatted by Prettier, as stage writes it
  missing: MissingStep[] // their scenarios are generated as test.fixme
  ambiguous: string[] // steps matching several definitions - stage / dress fail
}

interface Emitted {
  lines: string[]
  fixtures: Set<string>
  missing: MissingStep[]
}

interface Context {
  modules: Set<string> // step files whose definitions are used
  ambiguous: string[]
  missing: MissingStep[]
  testPath: string
  language: string // Gherkin dialect of the spec (`# language: uk`), passed to runStep when not English
}

/** Test with the Before / After hooks matching its tags - tests are grouped by them */
interface TestUnit {
  lines: string[]
  hooks: HookDefinition[]
}

/** Rule with its own Background (beforeEach lines, empty when none) */
type RuleNode = { rule: Rule; background: string[]; children: Child[] }
type Child = { unit: TestUnit } | RuleNode

const SNIPPET_TYPES: Record<string, string> = {
  int: 'number',
  float: 'number',
  bigdecimal: 'number'
}

const PLAYWRIGHT_HOOKS: Record<HookKind, string> = {
  Before: 'beforeEach',
  After: 'afterEach',
  BeforeAll: 'beforeAll',
  AfterAll: 'afterAll',
  // Registered for the test before its Backgrounds, run by every runStep
  BeforeStep: 'beforeEach',
  AfterStep: 'beforeEach'
}

/** Special tags turned into Playwright modifiers; they stay test tags too (`play @slow`) */
const MODIFIER_TAGS = ['@skip', '@fixme', '@fail'] as const
const CONFIGURE_TAG = /^@(retries|timeout):(.*)$/

/**
 * Import step definition files (CONFIG.bdd.steps) - each Given/When/Then call registers a definition
 */
export async function loadStepDefinitions(pattern = CONFIG.bdd.steps): Promise<void> {
  for (const file of glob.sync(pattern, { nodir: true }).sort()) {
    await import(pathToFileURL(path.resolve(file)).href)
  }
}

/**
 * Test file of a step definitions style spec (step definitions must be loaded):
 * Feature → describe, Background → beforeEach (Rule Background too), Rule → nested describe, Scenario → test,
 * Outline → test per Examples row; each step → `await runStep('Given …', { fixtures })`.
 * Hooks matching the tags: BeforeAll / AfterAll → beforeAll / afterAll of the feature,
 * Before / After → beforeEach / afterEach, tests with different hooks grouped in anonymous describes.
 * Special tags: @skip / @fixme / @fail / @slow → test modifiers, @retries:N / @timeout:N → configure.
 */
export async function generateBddTest(specPath: string, testPath: string): Promise<BddGeneration> {
  const feature = parseGherkinDocument(specPath).feature
  if (!feature) throw new Error(`No "Feature:" in ${specPath}`)

  const context: Context = {
    modules: new Set(),
    ambiguous: [],
    missing: [],
    testPath,
    language: feature.language
  }
  const baseName = getMarkdownBaseName(specPath)
  const featureTags = tagNames(feature.tags)
  const suiteTags = [
    'TAG.TEST.AUTO',
    'TAG.TYPE.BDD',
    `TAG.SUITE.${getTagConstant(extractSuiteName(baseName))}`,
    ...featureTags.map(quoteString)
  ]

  const background = feature.children.find((child) => child.background)?.background
  const backgroundLines = background ? emitBackground(background, featureTags, context) : []

  const children = feature.children.flatMap((child): Child[] => {
    if (child.scenario) return collectScenario(child.scenario, featureTags, context)
    if (child.rule) return [collectRule(child.rule, featureTags, context)]
    return []
  })

  const featureHooks = (kind: HookKind) => matchingHooks(kind, featureTags)
  const body = [
    ...configureLines(featureTags, `Feature "${feature.name.trim()}"`),
    ...featureHooks('BeforeAll').flatMap((hook) => emitHook(hook, context)),
    ...featureHooks('AfterAll')
      .reverse()
      .flatMap((hook) => emitHook(hook, context)),
    ...emitChildren(children, context, false, backgroundLines)
  ]

  const sideEffects = [...context.modules].sort().map((module) => `import '${module}'`)
  const runtime = ['runHook', 'runStep', 'useStepHook']
    .filter((name) => name === 'runStep' || body.some((line) => line.includes(`${name}(`)))
    .join(', ')
  const imports = [
    [CONFIG.bdd.fixtures, `import { test } from '${CONFIG.bdd.fixtures}'`],
    ['@/framework/bdd/runtime', `import { ${runtime} } from '@/framework/bdd/runtime'`],
    ['@/test-constants/tags', `import { TAG } from '@/test-constants/tags'`]
  ]
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([, line]) => line)

  const source = [
    `// Generated by npm run stage from ${toPosix(specPath)} - change the spec or step definitions, not this file`,
    ...sideEffects,
    sideEffects.length > 0 ? '' : null,
    ...imports,
    '',
    `test.describe(${quoteString(feature.name.trim())}, { tag: [${suiteTags.join(', ')}] }, () => {`,
    ...body,
    '})'
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const options = await prettier.resolveConfig(testPath)
  const content = await prettier.format(source, { ...options, filepath: testPath })
  return { specPath, testPath, content, missing: context.missing, ambiguous: context.ambiguous }
}

function emitBackground(
  background: Background,
  tags: string[],
  context: Context,
  ruleName?: string
): string[] {
  const { lines, fixtures, missing } = emitSteps(background.steps, {}, tags, context)
  // Background cannot be skipped as a whole: mark every test of the suite fixme at runtime
  const fixme = missing.length > 0 ? [`test.fixme(true, ${quoteString(missingNote(missing))})`] : []
  const title = quoteString(getBackgroundTitle(background, ruleName))
  return [
    `test.beforeEach(${title}, async (${fixtureParam(fixtures)}) => {`,
    ...fixme,
    ...lines,
    '})',
    '' // blank line between blocks - Prettier drops the one before a closing brace
  ]
}

function collectRule(rule: Rule, inherited: string[], context: Context): Child {
  const tags = [...inherited, ...tagNames(rule.tags)]
  const background = rule.children.find((child) => child.background)?.background
  return {
    rule,
    background: background ? emitBackground(background, tags, context, rule.name.trim()) : [],
    children: rule.children.flatMap((child) =>
      child.scenario ? collectScenario(child.scenario, tags, context) : []
    )
  }
}

function collectScenario(scenario: Scenario, inherited: string[], context: Context): Child[] {
  const examples = scenario.examples.filter((block) => block.tableHeader)
  if (examples.length === 0) {
    return [{ unit: emitTest(scenario, {}, tagNames(scenario.tags), inherited, context) }]
  }

  return examples.flatMap((block) => {
    const columns = block.tableHeader!.cells.map((cell) => cell.value)
    const own = [...tagNames(scenario.tags), ...tagNames(block.tags)]
    return block.tableBody.map((row) => {
      const values = Object.fromEntries(columns.map((column, i) => [column, row.cells[i].value]))
      return { unit: emitTest(scenario, values, own, inherited, context) }
    })
  })
}

/**
 * Children with Before / After hooks and Backgrounds. When all tests share the hooks they are
 * declared once at this level; otherwise consecutive tests with the same hooks are grouped
 * (rules decide for their own tests). Order as in Cucumber: Before hooks, Feature Background,
 * Rule Background, steps, After hooks - so pending Backgrounds go after the Before hooks.
 * @param background - Background lines not declared yet at an outer level
 */
function emitChildren(
  children: Child[],
  context: Context,
  hooksDone: boolean,
  background: string[]
): string[] {
  if (hooksDone) {
    return children.flatMap((child) =>
      'unit' in child ? child.unit.lines : emitRule(child, context, true, [])
    )
  }

  const units = flattenUnits(children)
  if (new Set(units.map((unit) => hookKey(unit.hooks))).size <= 1) {
    return [
      ...emitSetup(units[0]?.hooks ?? [], background, context),
      ...emitChildren(children, context, true, [])
    ]
  }

  const lines: string[] = []
  let group: TestUnit[] = []
  const flush = () => {
    if (group.length === 0) return
    const setup = emitSetup(group[0].hooks, background, context)
    const tests = group.flatMap((unit) => unit.lines)
    lines.push(
      ...(setup.length > 0 ? ['test.describe(() => {', ...setup, ...tests, '})', ''] : tests)
    )
    group = []
  }
  for (const child of children) {
    if ('rule' in child) {
      flush()
      lines.push(...emitRule(child, context, false, background))
    } else {
      if (group.length > 0 && hookKey(group[0].hooks) !== hookKey(child.unit.hooks)) flush()
      group.push(child.unit)
    }
  }
  flush()
  return lines
}

/**
 * Rule describe. Hooks declared outside - its own Background first; otherwise the Rule decides on
 * hooks and pending Backgrounds itself, its Background after the outer one.
 */
function emitRule(
  node: RuleNode,
  context: Context,
  hooksDone: boolean,
  background: string[]
): string[] {
  const { rule } = node
  const details = rule.tags.length > 0 ? `${tagDetails(tagNames(rule.tags))}, ` : ''
  const body = hooksDone
    ? [...node.background, ...emitChildren(node.children, context, true, [])]
    : emitChildren(node.children, context, false, [...background, ...node.background])
  return [
    `test.describe(${quoteString(rule.name.trim())}, ${details}() => {`,
    ...configureLines(tagNames(rule.tags), `Rule "${rule.name.trim()}"`),
    ...body,
    '})',
    ''
  ]
}

/**
 * Step hooks (registered first - Background steps run them too), Before hooks, Backgrounds,
 * After hooks (reverse definition order, as Cucumber runs them)
 */
function emitSetup(hooks: HookDefinition[], background: string[], context: Context): string[] {
  const stepHooks = hooks.filter((hook) => hook.kind.endsWith('Step'))
  const before = hooks.filter((hook) => hook.kind === 'Before')
  const after = hooks.filter((hook) => hook.kind === 'After').reverse()
  return [
    ...stepHooks.flatMap((hook) => emitHook(hook, context)),
    ...before.flatMap((hook) => emitHook(hook, context)),
    ...background,
    ...after.flatMap((hook) => emitHook(hook, context))
  ]
}

function emitHook(hook: HookDefinition, context: Context): string[] {
  context.modules.add(toModuleSpecifier(hook.location, context.testPath))
  const fixtures = new Set(withoutContext(hook.fixtureNames))
  const args = [
    quoteString(hook.kind),
    quoteString(hook.title),
    fixtures.size > 0 ? fixtureParam(fixtures) : ''
  ]
    .filter(Boolean)
    .join(', ')
  const call = hook.kind.endsWith('Step') ? `useStepHook(${args})` : `await runHook(${args})`
  return [
    `test.${PLAYWRIGHT_HOOKS[hook.kind]}(${quoteString(`${hook.kind}: ${hook.title}`)}, async (${fixtureParam(fixtures)}) => {`,
    call,
    '})',
    ''
  ]
}

/**
 * @param own - tags of the scenario and its Examples block (test tags, configure level)
 * @param inherited - tags of Feature and Rule (hooks and modifiers apply them too)
 */
function emitTest(
  scenario: Scenario,
  values: Record<string, string>,
  own: string[],
  inherited: string[],
  context: Context
): TestUnit {
  const tags = [...inherited, ...own]
  const { lines, fixtures, missing } = emitSteps(scenario.steps, values, tags, context)
  const name = fillPlaceholders(scenario.name.trim(), values)
  const details = own.length > 0 ? `${tagDetails(own)}, ` : ''
  const modifier =
    missing.length > 0 ? 'fixme' : MODIFIER_TAGS.find((tag) => tags.includes(tag))?.slice(1)
  const declare = modifier ? `test.${modifier}` : 'test'
  const declaration = [
    ...(missing.length > 0 ? [`// ${missingNote(missing)}`] : []),
    `${declare}(${quoteString(name)}, ${details}async (${fixtureParam(fixtures)}) => {`,
    ...(tags.includes('@slow') ? ['test.slow()'] : []),
    ...lines,
    '})',
    ''
  ]
  const configure = configureLines(own, `Scenario "${name}"`)
  return {
    lines:
      configure.length > 0
        ? ['test.describe(() => {', ...configure, ...declaration, '})', '']
        : declaration,
    hooks: (['BeforeStep', 'AfterStep', 'Before', 'After'] as const).flatMap((kind) =>
      matchingHooks(kind, tags)
    )
  }
}

function emitSteps(
  steps: readonly Step[],
  values: Record<string, string>,
  tags: string[],
  context: Context
): Emitted {
  const emitted: Emitted = { lines: [], fixtures: new Set(), missing: [] }
  let lastKeyword = 'Given'

  const resolved = steps.map((step) => {
    const text = fillPlaceholders(step.text.trim(), values)
    const title = `${step.keyword.trim()} ${text}`
    lastKeyword = snippetKeyword(step, lastKeyword)
    const matches = matchStepDefinitions(text)

    if (matches.length === 0) {
      const missing = { title, snippet: buildSnippet(lastKeyword, text, step) }
      emitted.missing.push(missing)
      context.missing.push(missing)
    } else if (matches.length > 1) {
      context.ambiguous.push(formatAmbiguous(title, matches))
    }
    return { step, title, definition: matches.length === 1 ? matches[0].definition : undefined }
  })
  const pomFixtures = choosePomFixtures(
    resolved.map(({ definition }) => definition),
    tags
  )

  resolved.forEach(({ step, title, definition }, i) => {
    let fixtureNames: string[] = []
    if (definition) {
      fixtureNames = pomFixtures[i] ? [pomFixtures[i]] : withoutContext(definition.fixtureNames)
      fixtureNames.forEach((name) => emitted.fixtures.add(name))
      context.modules.add(toModuleSpecifier(definition.location, context.testPath))
    }

    const argument = stepOptions(step, values, context.language)
    const fixturesArg =
      fixtureNames.length > 0 ? `{ ${fixtureNames.join(', ')} }` : argument ? '{}' : ''
    const args = [quoteString(title), fixturesArg, argument].filter(Boolean).join(', ')
    emitted.lines.push(`await runStep(${args})`)
  })
  return emitted
}

/**
 * Fixture of each Page Object method step (undefined for other steps): a subclass registered with
 * tags matching the scenario (the most derived one), else the class of the method. Then within the
 * steps a base class step runs on the most derived subclass object other steps use.
 * @throws Error when several unrelated subclasses fit
 */
function choosePomFixtures(
  definitions: Array<StepDefinition | undefined>,
  tags: string[]
): Array<string | undefined> {
  const nodes = getPomNodes()
  const candidatesOf = (owner: PomClass) =>
    nodes.filter((node) => node.owner === owner || node.owner.prototype instanceof owner)

  const chosen = definitions.map((definition): PomNode | undefined => {
    const method = definition?.method
    if (!method) return undefined
    const candidates = candidatesOf(method.owner)
    const tagged = candidates.filter(
      (node) => node.tags && evaluateTags(node.tags, tags, `@StepsFor at ${node.location}`)
    )
    if (tagged.length > 0) return mostDerived(tagged, definition)
    return candidates.find((node) => node.owner === method.owner)
  })

  const used = chosen.filter((node): node is PomNode => node !== undefined)
  return chosen.map((node, i) => {
    const definition = definitions[i]
    if (!node || !definition?.method) return undefined
    const candidates = candidatesOf(definition.method.owner)
    const derived = used.filter(
      (other) => other.owner.prototype instanceof node.owner && candidates.includes(other)
    )
    return (derived.length > 0 ? mostDerived(derived, definition) : node).fixture
  })
}

/**
 * The node whose class extends all the others
 * @throws Error for unrelated classes
 */
function mostDerived(nodes: PomNode[], definition: StepDefinition): PomNode {
  const node = nodes.find((candidate) =>
    nodes.every((other) => other === candidate || candidate.owner.prototype instanceof other.owner)
  )
  if (!node) {
    throw new Error(
      `Step at ${definition.location} fits several Page Objects: ${nodes.map((n) => n.fixture).join(', ')}\n  Fix: Make @StepsFor tags of unrelated classes exclusive`
    )
  }
  return node
}

/**
 * Hooks of a kind whose tag expression matches the tags (no expression - always), definition order
 * @throws Error for an invalid tag expression, with the hook location
 */
function matchingHooks(kind: HookKind, tags: string[]): HookDefinition[] {
  return getHookDefinitions().filter(
    (hook) =>
      hook.kind === kind &&
      (!hook.tags || evaluateTags(hook.tags, tags, `${kind} hook at ${hook.location}`))
  )
}

/**
 * @throws Error for an invalid tag expression, naming its owner
 */
function evaluateTags(expression: string, tags: string[], owner: string): boolean {
  try {
    return parseTagExpression(expression).evaluate(tags)
  } catch (error: unknown) {
    throw new Error(
      `Invalid tag expression "${expression}" of ${owner}: ${getErrorMessage(error)}`,
      {
        cause: error
      }
    )
  }
}

/**
 * `test.describe.configure({ retries, timeout })` from @retries:N / @timeout:N of one level
 * @throws Error for a non-numeric value or two different values of the same option
 */
function configureLines(tags: string[], where: string): string[] {
  const options = new Map<string, number>()
  for (const tag of tags) {
    const match = tag.match(CONFIGURE_TAG)
    if (!match) continue
    const [, option, raw] = match
    const value = Number(raw)
    const valid = /^\d+$/.test(raw) && (option === 'retries' || value > 0)
    if (!valid) {
      throw new Error(
        `Invalid tag "${tag}" on ${where}\n  Fix: Use @${option}:<${option === 'retries' ? 'count' : 'milliseconds'}>, e.g. @${option}:${option === 'retries' ? 2 : 60000}`
      )
    }
    if (options.has(option) && options.get(option) !== value) {
      throw new Error(`Conflicting @${option} tags on ${where}\n  Fix: Keep one @${option} tag`)
    }
    options.set(option, value)
  }
  if (options.size === 0) return []
  const config = [...options].map(([option, value]) => `${option}: ${value}`).join(', ')
  return [`test.describe.configure({ ${config} })`, '']
}

function flattenUnits(children: Child[]): TestUnit[] {
  return children.flatMap((child) =>
    'unit' in child ? [child.unit] : flattenUnits(child.children)
  )
}

function hookKey(hooks: HookDefinition[]): string {
  return hooks.map((hook) => `${hook.kind}:${hook.title}`).join('\n')
}

/** `bdd` in the first parameter is the runtime context, not a fixture */
function withoutContext(fixtureNames: string[]): string[] {
  return fixtureNames.filter((name) => name !== BDD_CONTEXT)
}

/** runStep options: DataTable / DocString of the step, language of a non-English spec */
function stepOptions(step: Step, values: Record<string, string>, language: string): string {
  const options: string[] = []
  if (step.dataTable) {
    const rows = step.dataTable.rows.map(
      (row) =>
        `[${row.cells.map((cell) => quoteString(fillPlaceholders(cell.value, values))).join(', ')}]`
    )
    options.push(`dataTable: [${rows.join(', ')}]`)
  }
  if (step.docString) {
    options.push(`docString: ${quoteString(fillPlaceholders(step.docString.content, values))}`)
  }
  if (language !== 'en') options.push(`language: ${quoteString(language)}`)
  return options.length > 0 ? `{ ${options.join(', ')} }` : ''
}

/**
 * Definition to start from for a missing step: Cucumber Expression suggested from the text
 * (`"Login"` → `{string}`, `5` → `{int}`), parameters typed, DataTable / DocString last
 */
function buildSnippet(keyword: string, text: string, step: Step): string {
  const generator = new CucumberExpressionGenerator(() => getParameterTypes().parameterTypes)
  const [expression] = generator.generateExpressions(text)
  const params = expression.parameterNames.map(
    (name, i) => `${name}: ${SNIPPET_TYPES[expression.parameterTypes[i].name ?? ''] ?? 'string'}`
  )
  if (step.dataTable) params.push('dataTable: DataTable')
  if (step.docString) params.push('docString: string')
  const args = ['{ page }', ...params].join(', ')
  return `${keyword}(${quoteString(expression.source)}, async (${args}) => {\n  // TODO: implement step\n})`
}

/** Given / When / Then of a step; And / But / * take the previous one */
function snippetKeyword(step: Step, previous: string): string {
  if (step.keywordType === 'Context') return 'Given'
  if (step.keywordType === 'Action') return 'When'
  if (step.keywordType === 'Outcome') return 'Then'
  return previous
}

function missingNote(missing: MissingStep[]): string {
  return `Missing step definitions: ${missing.map((step) => step.title).join('; ')}`
}

function fixtureParam(fixtures: Set<string>): string {
  return fixtures.size > 0 ? `{ ${[...fixtures].join(', ')} }` : ''
}

function tagDetails(tags: string[]): string {
  return `{ tag: [${tags.map(quoteString).join(', ')}] }`
}

function tagNames(tags: readonly Tag[]): string[] {
  return tags.map((tag) => tag.name)
}

/**
 * Import of step file at "src/steps/x.steps.ts:12": "@/steps/x.steps" (alias), else relative
 */
function toModuleSpecifier(location: string, testPath: string): string {
  const file = location.replace(/:\d+$/, '').replace(/\.ts$/, '')
  if (file.startsWith('src/')) return `@/${file.slice('src/'.length)}`
  const relative = toPosix(path.relative(path.dirname(testPath), file))
  return relative.startsWith('.') ? relative : `./${relative}`
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
