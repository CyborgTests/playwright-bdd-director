import { CucumberExpressionGenerator } from '@cucumber/cucumber-expressions'
import type { Background, Rule, Scenario, Step, Tag } from '@cucumber/messages'
import { parse as parseTagExpression } from '@cucumber/tag-expressions'
import { glob } from 'glob'
import path from 'path'
import prettier from 'prettier'
import { pathToFileURL } from 'url'

import { desktopDevices, handheldDevices } from '@/config/devices'

import { CONFIG } from '../config'
import {
  ALL_DEVICES_TAG,
  CONFIGURE_TAG,
  CYBORG_LAYERS,
  DEVICE_MODIFIER_TAG,
  type Devices,
  isKindTag,
  isLayerTag,
  KIND_TAGS,
  LAYER_TAGS,
  type LayerTag
} from '../constants/tags'
import { getBackgroundTitle } from '../core/gherkin-parser'
import { parseSpecDocument } from '../core/spec-document'
import { fillPlaceholders, getErrorMessage, getMarkdownBaseName, toPosix } from '../utils/helpers'
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
  type StepDefinition,
  type StepKeyword
} from './registry'
import { formatAmbiguous, splitStepKeyword } from './runtime'

/** Step without a step definition */
export interface MissingStep {
  title: string // as the test shows it: "When user clicks \"Login\"", Markdown "Click Login"
  keyword: StepKeyword // Markdown steps: Step
  expression: string // Cucumber Expression suggested from the text
  snippet: string // step definition to start from
}

/** Step whose only definition has no code yet */
export interface PendingStep {
  title: string
  location: string
}

export interface GeneratedTest {
  title: string
  layer: LayerTag
  kind: 'auto' | 'cyborg' // auto: every step has a definition; cyborg: a person walks the rest
  fixme: boolean // API case with a step left without definition - nobody walks API by hand
  modifier?: 'skip' | 'fixme' | 'fail' // from spec tags
  tags: string[] // spec tags of the suite, rule and case, layer tags excluded
  steps: { automated: number; total: number } // Background steps included
  manual: string[] // titles of steps a person walks, Background included
  devices: Devices // from the layer and @all-devices
}

export interface Generation {
  specPath: string
  testPath: string
  suiteTtl: string
  content: string // formatted by Prettier
  tests: GeneratedTest[]
  missing: MissingStep[]
  pending: PendingStep[]
  errors: string[] // ambiguous steps, layer problems - the test file is not usable
  used: Set<StepDefinition>
}

interface Emitted {
  lines: string[]
  fixtures: Set<string>
  manual: string[] // titles of steps a person walks
  total: number
}

interface Context {
  modules: Set<string> // step files whose definitions are used
  errors: string[]
  missing: MissingStep[]
  pending: PendingStep[]
  used: Set<StepDefinition>
  tests: GeneratedTest[]
  testPath: string
  language: string // Gherkin dialect of the spec (`# language: uk`), passed to autoStep when not English
  markdown: boolean
}

/** Background as beforeEach lines with what its tests inherit from it */
interface EmittedBackground {
  lines: string[]
  manual: string[]
  total: number
}

/** Test with the Before / After hooks matching its tags - tests are grouped by them */
interface TestUnit {
  lines: string[]
  hooks: HookDefinition[]
}

/** Rule with its own Background (beforeEach lines, empty when none) */
type RuleNode = { rule: Rule; background: string[]; children: Child[] }
type Child = { unit: TestUnit } | RuleNode

/** Tags of the levels above a scenario and the Backgrounds its tests run */
interface Scope {
  suiteTag: string
  levels: string[][] // Feature, then Rule tags
  backgrounds: EmittedBackground[]
}

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
  // Registered for the test before its Backgrounds, run by every autoStep
  BeforeStep: 'beforeEach',
  AfterStep: 'beforeEach'
}

/** Special tags turned into Playwright modifiers; they stay test tags too (`play @slow`) */
const MODIFIER_TAGS = ['@skip', '@fixme', '@fail'] as const

/**
 * Import step definition files (CONFIG.bdd.steps) - each Given/When/Then call registers a definition
 */
export async function loadStepDefinitions(pattern = CONFIG.bdd.steps): Promise<void> {
  for (const file of glob.sync(pattern, { nodir: true }).sort()) {
    await import(pathToFileURL(path.resolve(file)).href)
  }
}

/**
 * Test file of a spec, Markdown or Gherkin (step definitions must be loaded):
 * suite / Feature → describe, Background → beforeEach (Rule Background too), Rule → nested
 * describe, test case / Scenario → test, examples / Outline → test per row. A step with a step
 * definition is `autoStep`, a step without one (or with one without code) is `manualStep`.
 * A test is @auto when all its steps are automated, else @cyborg - or fixme for an @api case.
 * Its layer (@api / @ui / @e2e) comes from spec tags, the most specific level wins.
 * Hooks matching the tags: BeforeAll / AfterAll → beforeAll / afterAll of the suite,
 * Before / After → beforeEach / afterEach, tests with different hooks grouped in anonymous describes.
 * Special tags: @skip / @fixme / @fail / @slow → test modifiers, @skip:<device> / @fixme:<device> /
 * @fail:<device> → the modifier on that device only, @retries:N / @timeout:N → configure.
 */
export async function generateTest(specPath: string, testPath: string): Promise<Generation> {
  const { feature, markdown } = parseSpecDocument(specPath)
  const context: Context = {
    modules: new Set(),
    errors: [],
    missing: [],
    pending: [],
    used: new Set(),
    tests: [],
    testPath,
    language: feature.language,
    markdown
  }
  const featureTags = tagNames(feature.tags)
  const reserved = [
    ...featureTags,
    ...feature.children.flatMap((child) => [
      ...tagNames(child.rule?.tags ?? []),
      ...[...(child.rule?.children ?? []), child].flatMap((c) => [
        ...tagNames(c.scenario?.tags ?? []),
        ...(c.scenario?.examples ?? []).flatMap((block) => tagNames(block.tags))
      ])
    ])
  ].filter(isKindTag)
  if (reserved.length > 0) {
    context.errors.push(
      `Tag ${reserved[0]} in ${specPath} is set by the Director\n  Fix: Remove it - a test is @auto when every step has a step definition, else @cyborg`
    )
  }

  const scope: Scope = {
    suiteTag: `@${getMarkdownBaseName(specPath)}`,
    levels: [featureTags],
    backgrounds: []
  }
  const background = feature.children.find((child) => child.background)?.background
  if (background) scope.backgrounds.push(emitBackground(background, scope, context))

  const children = feature.children.flatMap((child): Child[] => {
    if (child.scenario) return collectScenario(child.scenario, scope, context)
    if (child.rule) return [collectRule(child.rule, scope, context)]
    return []
  })

  const suiteTags = [scope.suiteTag, ...withoutLayers(featureTags)]
  const featureHooks = (kind: HookKind) => matchingHooks(kind, [...featureTags, scope.suiteTag])
  const body = [
    ...configureLines(featureTags, `Feature "${feature.name.trim()}"`),
    ...featureHooks('BeforeAll').flatMap((hook) => emitHook(hook, context)),
    ...featureHooks('AfterAll')
      .reverse()
      .flatMap((hook) => emitHook(hook, context)),
    ...emitChildren(children, context, false, scope.backgrounds[0]?.lines ?? [])
  ]

  const sideEffects = [...context.modules].sort().map((module) => `import '${module}'`)
  const runtime = ['autoStep', 'runHook', 'useStepHook'].filter((name) =>
    body.some((line) => line.includes(`${name}(`))
  )
  const imports = [
    [CONFIG.bdd.fixtures, `import { test } from '${CONFIG.bdd.fixtures}'`],
    ...(runtime.length > 0
      ? [
          [
            '@/framework/bdd/runtime',
            `import { ${runtime.join(', ')} } from '@/framework/bdd/runtime'`
          ]
        ]
      : [])
  ]
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([, line]) => line)

  const source = [
    `// Generated from ${commentText(toPosix(specPath))} on every run - change the spec or step definitions, not this file`,
    ...sideEffects,
    sideEffects.length > 0 ? '' : null,
    ...imports,
    '',
    `test.describe(${quoteString(feature.name.trim())}, ${tagDetails(suiteTags)}, () => {`,
    ...body,
    '})'
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const options = await prettier.resolveConfig(testPath)
  const content = await prettier.format(source, { ...options, filepath: testPath })
  return {
    specPath,
    testPath,
    suiteTtl: feature.name.trim(),
    content,
    tests: context.tests,
    missing: context.missing,
    pending: context.pending,
    errors: context.errors,
    used: context.used
  }
}

function emitBackground(
  background: Background,
  scope: Scope,
  context: Context,
  ruleName?: string
): EmittedBackground {
  const tags = [scope.suiteTag, ...scope.levels.flat()]
  const { lines, fixtures, manual, total } = emitSteps(background.steps, {}, tags, context)
  const title = quoteString(getBackgroundTitle(background, ruleName))
  return {
    lines: [
      `test.beforeEach(${title}, async (${fixtureParam(fixtures)}) => {`,
      ...lines,
      '})',
      '' // blank line between blocks - Prettier drops the one before a closing brace
    ],
    manual,
    total
  }
}

function collectRule(rule: Rule, outer: Scope, context: Context): Child {
  const scope: Scope = { ...outer, levels: [...outer.levels, tagNames(rule.tags)] }
  const background = rule.children.find((child) => child.background)?.background
  const emitted = background
    ? emitBackground(background, scope, context, rule.name.trim())
    : undefined
  if (emitted) scope.backgrounds = [...outer.backgrounds, emitted]
  return {
    rule,
    background: emitted?.lines ?? [],
    children: rule.children.flatMap((child) =>
      child.scenario ? collectScenario(child.scenario, scope, context) : []
    )
  }
}

function collectScenario(scenario: Scenario, scope: Scope, context: Context): Child[] {
  const examples = scenario.examples.filter((block) => block.tableHeader)
  if (examples.length === 0) {
    return [{ unit: emitTest(scenario, {}, [tagNames(scenario.tags)], scope, context) }]
  }

  return examples.flatMap((block) => {
    const columns = block.tableHeader!.cells.map((cell) => cell.value)
    const own = [tagNames(scenario.tags), tagNames(block.tags)]
    return block.tableBody.map((row) => {
      const values = Object.fromEntries(columns.map((column, i) => [column, row.cells[i].value]))
      return { unit: emitTest(scenario, values, own, scope, context) }
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
  const tags = withoutLayers(tagNames(rule.tags))
  const details = tags.length > 0 ? `${tagDetails(tags)}, ` : ''
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
 * @param own - tags of the scenario and of its Examples block (test tags, configure level)
 */
function emitTest(
  scenario: Scenario,
  values: Record<string, string>,
  own: string[][],
  scope: Scope,
  context: Context
): TestUnit {
  const name = fillPlaceholders(scenario.name.trim(), values)
  const levels = [...scope.levels, ...own]
  const specTags = withoutLayers(levels.flat())
  const layer = resolveLayer(levels, name, context) ?? LAYER_TAGS[0]
  const tags = [scope.suiteTag, ...specTags, layer]

  const { lines, fixtures, manual, total } = emitSteps(scenario.steps, values, tags, context)
  const allManual = [...scope.backgrounds.flatMap((b) => b.manual), ...manual]
  const fixme = allManual.length > 0 && !CYBORG_LAYERS.includes(layer)
  const kind = allManual.length > 0 && !fixme ? 'cyborg' : 'auto'
  const allTags = [...tags, KIND_TAGS[kind]]

  const devices = testDevices(layer, allTags, name, context)
  const modifier = fixme ? 'fixme' : MODIFIER_TAGS.find((tag) => allTags.includes(tag))?.slice(1)
  const ownTags = withoutLayers(own.flat())
  const declare = modifier ? `test.${modifier}` : 'test'
  const declaration = [
    ...(fixme
      ? [
          `// ${layer} test without step definitions: ${commentText([...new Set(allManual)].join('; '))}`
        ]
      : []),
    `${declare}(${quoteString(name)}, ${tagDetails([KIND_TAGS[kind], layer, ...new Set(ownTags)])}, async (${fixtureParam(fixtures)}) => {`,
    ...(allTags.includes('@slow') ? ['test.slow()'] : []),
    ...lines,
    '})',
    ''
  ]
  const totalSteps = total + scope.backgrounds.reduce((sum, b) => sum + b.total, 0)
  context.tests.push({
    title: name,
    layer,
    kind,
    fixme,
    ...(modifier ? { modifier: modifier as GeneratedTest['modifier'] } : {}),
    tags: [...new Set(specTags)],
    steps: { automated: totalSteps - allManual.length, total: totalSteps },
    manual: [...new Set(allManual)],
    devices
  })

  // A person walks a cyborg test at their own pace: its own level lifts any @timeout above it
  const unlimited = kind === 'cyborg' && levels.flat().some((tag) => tag.startsWith('@timeout:'))
  const configure = [
    ...configureLines(own.flat(), `Scenario "${name}"`, unlimited),
    ...deviceModifierLines(allTags, devices, kind, name, context)
  ]
  return {
    lines:
      configure.length > 0
        ? ['test.describe(() => {', ...configure, ...declaration, '})', '']
        : declaration,
    hooks: (['BeforeStep', 'AfterStep', 'Before', 'After'] as const).flatMap((kind) =>
      matchingHooks(kind, allTags)
    )
  }
}

/**
 * API tests run without a browser, so @all-devices on one is a mistake in the spec. A person
 * walks a cyborg test on a desktop browser - @all-devices applies once it is automated.
 */
function testDevices(layer: LayerTag, tags: string[], name: string, context: Context): Devices {
  const allDevices = tags.includes(ALL_DEVICES_TAG)
  if (layer !== '@api') return allDevices && !tags.includes(KIND_TAGS.cyborg) ? 'all' : 'desktop'
  if (allDevices) {
    context.errors.push(
      `Test "${name}" is @api but tagged ${ALL_DEVICES_TAG}\n  Fix: Drop ${ALL_DEVICES_TAG} - API tests run once, without a browser`
    )
  }
  return 'none'
}

/**
 * `test.fail(() => ['tablet'].includes(test.info().project.name))` from @fail:tablet of any level -
 * conditional modifiers of the test's describe, so @skip / @fixme come before Background. A device
 * the test never runs on is a mistake in the spec; a cyborg test keeps its tags for when it is
 * automated, as with @all-devices.
 */
function deviceModifierLines(
  tags: string[],
  devices: Devices,
  kind: 'auto' | 'cyborg',
  name: string,
  context: Context
): string[] {
  const desktopIds = desktopDevices.map((device) => device.id)
  const allIds = [...desktopIds, ...handheldDevices.map((device) => device.id)]
  const runsOn: string[] = { none: [], desktop: desktopIds, all: allIds }[devices]
  const byModifier = new Map<string, { ids: string[]; tags: string[] }>()
  for (const tag of new Set(tags)) {
    const match = tag.match(DEVICE_MODIFIER_TAG)
    if (!match) continue
    const [, modifier, id] = match
    if (!allIds.includes(id)) {
      context.errors.push(
        `Tag ${tag} on test "${name}" names an unknown device\n  Fix: Use one of ${allIds.join(', ')} (src/config/devices.ts)`
      )
      continue
    }
    if (kind === 'auto' && !runsOn.includes(id)) {
      context.errors.push(
        `Test "${name}" never runs on ${id} but is tagged ${tag}\n  Fix: ${devices === 'none' ? 'Drop it - API tests run once, without a browser' : `Drop it or add ${ALL_DEVICES_TAG}`}`
      )
      continue
    }
    const entry = byModifier.get(modifier) ?? { ids: [], tags: [] }
    entry.ids.push(id)
    entry.tags.push(tag)
    byModifier.set(modifier, entry)
  }
  if (byModifier.size === 0) return []
  return [
    ...[...byModifier].map(
      ([modifier, { ids, tags }]) =>
        `test.${modifier}(() => [${ids.map(quoteString).join(', ')}].includes(test.info().project.name), ${quoteString(tags.join(' '))})`
    ),
    ''
  ]
}

/**
 * Layer of the most specific level with a layer tag (Examples, Scenario, Rule, Feature)
 * @returns undefined after reporting a missing or double layer
 */
function resolveLayer(levels: string[][], name: string, context: Context): LayerTag | undefined {
  const level = [...levels].reverse().find((tags) => tags.some(isLayerTag))
  const layers = [...new Set(level?.filter(isLayerTag) ?? [])]
  if (layers.length === 1) return layers[0]
  context.errors.push(
    layers.length === 0
      ? `Test "${name}" has no layer\n  Fix: Tag the suite or the test case with one of ${LAYER_TAGS.join(', ')}`
      : `Test "${name}" has several layers: ${layers.join(', ')}\n  Fix: Keep one layer tag per level - a test case tag overrides the suite tag`
  )
  return undefined
}

function emitSteps(
  steps: readonly Step[],
  values: Record<string, string>,
  tags: string[],
  context: Context
): Emitted {
  const emitted: Emitted = { lines: [], fixtures: new Set(), manual: [], total: steps.length }
  let lastKeyword: StepKeyword = 'Given'

  const resolved = steps.map((step) => {
    const text = fillPlaceholders(step.text.trim(), values)
    const title = context.markdown ? text : `${step.keyword.trim()} ${text}`
    lastKeyword = context.markdown ? 'Step' : snippetKeyword(step, lastKeyword)
    const matches = matchStepDefinitions(text)
    matches.forEach(({ definition }) => context.used.add(definition))

    if (matches.length === 0) {
      addMissing(context, title, lastKeyword, text, step)
      return { step, title, definition: undefined }
    }
    if (matches.length > 1) {
      context.errors.push(formatAmbiguous(title, matches))
      return { step, title, definition: undefined }
    }
    const [{ definition }] = matches
    if (definition.pending) {
      if (!context.pending.some((p) => p.title === title)) {
        context.pending.push({ title, location: definition.location })
      }
      return { step, title, definition: undefined }
    }
    return { step, title, definition }
  })
  const pomFixtures = choosePomFixtures(
    resolved.map(({ definition }) => definition),
    tags
  )

  resolved.forEach(({ step, title, definition }, i) => {
    if (!definition) {
      emitted.manual.push(title)
      emitted.fixtures.add('manualStep')
      emitted.lines.push(`await manualStep(${quoteString(title)})`)
      return
    }
    const fixtureNames = pomFixtures[i] ? [pomFixtures[i]] : withoutContext(definition.fixtureNames)
    fixtureNames.forEach((name) => emitted.fixtures.add(name))
    context.modules.add(toModuleSpecifier(definition.location, context.testPath))

    const argument = stepOptions(step, values, title, context)
    const fixturesArg =
      fixtureNames.length > 0 ? `{ ${fixtureNames.join(', ')} }` : argument ? '{}' : ''
    const args = [quoteString(title), fixturesArg, argument].filter(Boolean).join(', ')
    emitted.lines.push(`await autoStep(${args})`)
  })
  return emitted
}

function addMissing(
  context: Context,
  title: string,
  keyword: StepKeyword,
  text: string,
  step: Step
): void {
  if (context.missing.some((missing) => missing.title === title)) return
  const generator = new CucumberExpressionGenerator(() => getParameterTypes().parameterTypes)
  const [expression] = generator.generateExpressions(text)
  const params = expression.parameterNames.map(
    (name, i) => `_${name}: ${SNIPPET_TYPES[expression.parameterTypes[i].name ?? ''] ?? 'string'}`
  )
  if (step.dataTable) params.push('_dataTable: DataTable')
  if (step.docString) params.push('_docString: string')
  const args = ['{}', ...params].join(', ')
  context.missing.push({
    title,
    keyword,
    expression: expression.source,
    snippet: `${keyword}(${quoteString(expression.source)}, async (${args}) => {\n  // TODO: implement step\n})`
  })
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
 * @param unlimited - timeout 0 (none) whatever the tags say
 * @throws Error for a non-numeric value or two different values of the same option
 */
function configureLines(tags: string[], where: string, unlimited = false): string[] {
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
  if (unlimited) options.set('timeout', 0)
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

/** Layer tags are resolved per test - the describes never carry them */
function withoutLayers(tags: string[]): string[] {
  return tags.filter((tag) => !isLayerTag(tag))
}

/**
 * autoStep options: DataTable / DocString of the step, language of a non-English spec, no keyword
 * for a Markdown step that starts with one
 */
function stepOptions(
  step: Step,
  values: Record<string, string>,
  title: string,
  context: Context
): string {
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
  if (context.markdown && splitStepKeyword(title)) options.push('keyword: false')
  if (!context.markdown && context.language !== 'en') {
    options.push(`language: ${quoteString(context.language)}`)
  }
  return options.length > 0 ? `{ ${options.join(', ')} }` : ''
}

/** Given / When / Then of a step; And / But / * take the previous one */
function snippetKeyword(step: Step, previous: StepKeyword): StepKeyword {
  if (step.keywordType === 'Context') return 'Given'
  if (step.keywordType === 'Action') return 'When'
  if (step.keywordType === 'Outcome') return 'Then'
  return previous
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
 * Spec text reaches generated code only through quoteString and commentText: a spec is data, and
 * a line terminator in it (U+2028 is invisible in diffs) must not end a string or a comment early
 */
export function quoteString(text: string): string {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `'${escaped}'`
}

/** Text for a `//` comment of a generated file: line terminators would let it out of the comment */
function commentText(text: string): string {
  return text.replace(/[\r\n\u2028\u2029]/g, ' ')
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
