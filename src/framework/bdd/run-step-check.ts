import fs from 'fs'
import path from 'path'
import {
  ArrowFunction,
  BindingName,
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  SourceFile,
  SyntaxKind
} from 'ts-morph'

import { AST_IDENTIFIERS } from '../constants/test-files'
import { parseGherkinDocument } from '../core/gherkin-parser'
import { getErrorMessage } from '../utils/helpers'
import { getTestFileBaseName } from '../utils/helpers'
import {
  findExamplesLoop,
  getExampleColumn,
  getSharedProject,
  readExamplesArray
} from '../utils/ts-morph-helpers'
import { loadStepDefinitions, toModuleSpecifier } from './generator'
import { matchStepDefinitions } from './registry'
import { formatAmbiguous, hasStepKeyword, isNonEnglishStepTitle, stripStepKeyword } from './runtime'

export type RunStepErrors = Array<{ file: string; errors: string[] }>

const BDD_MODULE = '@/framework/bdd'

/**
 * Static check of runStep() calls in hand-written tests (cyborg or automated): stage never edits
 * them, so dress / stage report what would fail at runtime, with the exact fix:
 * title resolvable (string, or `${example.column}` of an inline examples loop), exactly one
 * definition, fixtures it destructures passed and declared in the test, step file imported,
 * no test.step wrapping a runStep of the same title. Before / After hooks run only in generated
 * tests (README), so they are not checked here.
 * @param specs - spec path by test file base name: a non-English spec's language makes the fix exact
 */
export async function checkRunSteps(
  testFiles: string[],
  {
    load = loadStepDefinitions,
    specs = new Map<string, string>()
  }: { load?: () => Promise<void>; specs?: ReadonlyMap<string, string> } = {}
): Promise<RunStepErrors> {
  const result: RunStepErrors = []
  const candidates = testFiles.filter(
    (file) => !file.endsWith('.bdd.test.ts') && /\brunStep\s*\(/.test(readFile(file))
  )
  if (candidates.length === 0) return result

  try {
    await load()
  } catch (error: unknown) {
    result.push({ file: toPosix(candidates[0]), errors: [getErrorMessage(error)] })
    return result
  }

  for (const file of candidates) {
    const sourceFile = getSharedProject().addSourceFileAtPath(file)
    sourceFile.refreshFromFileSystemSync()
    const calls = sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((call) => call.getExpression().getText() === AST_IDENTIFIERS.RUN_STEP)
    if (calls.length === 0) continue

    const specLanguage = readSpecLanguage(specs.get(getTestFileBaseName(path.basename(file))))
    const errors = [
      ...checkRunStepImport(sourceFile),
      ...calls.flatMap((call) => checkCall(call, file, specLanguage)),
      ...checkStepFileImports(sourceFile, calls)
    ]
    if (errors.length > 0) result.push({ file: toPosix(file), errors })
  }
  return result
}

function checkRunStepImport(sourceFile: SourceFile): string[] {
  const imported = sourceFile
    .getImportDeclarations()
    .some(
      (declaration) =>
        declaration.getModuleSpecifierValue() === BDD_MODULE &&
        declaration.getNamedImports().some((named) => named.getName() === AST_IDENTIFIERS.RUN_STEP)
    )
  return imported ? [] : [`runStep is not imported\n  Fix: import { runStep } from '${BDD_MODULE}'`]
}

/** `# language:` of a Gherkin spec, undefined for Markdown, English or an unreadable spec */
function readSpecLanguage(specPath: string | undefined): string | undefined {
  if (!specPath?.endsWith('.feature')) return undefined
  try {
    const language = parseGherkinDocument(specPath).feature?.language
    return language === 'en' ? undefined : language
  } catch {
    return undefined // reported by spec validation
  }
}

function checkCall(call: CallExpression, file: string, specLanguage?: string): string[] {
  const where = `${toPosix(file)}:${call.getStartLineNumber()}`
  const titles = resolveTitles(call)
  if (!titles) {
    return [
      `${where} runStep title cannot be checked: use a string, or \${example.<column>} of the examples loop with inline data`
    ]
  }

  const language = readLanguage(call)
  let texts: string[]
  try {
    texts = titles.map((title) => stripStepKeyword(title, language))
  } catch (error: unknown) {
    return [`${where} ${getErrorMessage(error)}`]
  }

  const errors: string[] = []
  const fixtures = new Set<string>()
  for (const [i, title] of titles.entries()) {
    const matches = matchStepDefinitions(texts[i])
    if (matches.length === 0) {
      const titleText = call.getArguments()[0].getText()
      const fix =
        language !== undefined || !isNonEnglishStepTitle(title)
          ? 'Define it in a step file (CONFIG.bdd.steps) or use manualStep'
          : specLanguage && hasStepKeyword(title, specLanguage)
            ? `Pass the spec language: runStep(${titleText}, { ... }, { language: '${specLanguage}' })`
            : `Pass the spec language (its # language: code): runStep(${titleText}, { ... }, { language: '<code>' })`
      errors.push(`${where} no step definition matches "${title}"\n  Fix: ${fix}`)
    } else if (matches.length > 1) {
      errors.push(`${where} ${formatAmbiguous(title, matches)}`)
    } else {
      matches[0].definition.fixtureNames.forEach((name) => fixtures.add(name))
    }
  }

  const titleText = call.getArguments()[0].getText()
  const passed = readPassedFixtures(call)
  if (passed === null) {
    errors.push(
      `${where} fixtures of runStep must be an object literal\n  Fix: await runStep(${titleText}, { ${[...fixtures].join(', ')} })`
    )
  } else {
    const missing = [...fixtures].filter((name) => !passed.has(name))
    if (missing.length > 0) {
      errors.push(
        `${where} runStep(${titleText}) needs fixtures: ${missing.join(', ')}\n  Fix: await runStep(${titleText}, { ${[...new Set([...passed, ...fixtures])].join(', ')} })`
      )
    }
  }

  const undeclared = readShorthandNames(call).filter((name) => !isDeclaredAround(call, name))
  if (undeclared.length > 0) {
    errors.push(
      `${where} ${undeclared.join(', ')} not declared in the test\n  Fix: Add to the test parameters: async ({ ${undeclared.join(', ')}, ... }) =>`
    )
  }

  const wrapper = call
    .getAncestors()
    .find(
      (node): node is CallExpression =>
        Node.isCallExpression(node) && node.getExpression().getText().endsWith('.step')
    )
  const wrapperTitle = wrapper?.getArguments()[0]
  if (wrapperTitle && titles.length === 1 && literalText(wrapperTitle) === titles[0]) {
    errors.push(
      `${where} test.step and runStep have the same title "${titles[0]}" - the step is reported twice\n  Fix: Call runStep directly, without the test.step wrapper`
    )
  }
  return errors
}

/**
 * Titles a runStep call can take: the literal, or the template filled with each examples row
 * @returns null when the title is not statically known
 */
function resolveTitles(call: CallExpression): string[] | null {
  const arg = call.getArguments()[0]
  if (!arg) return null
  const literal = literalText(arg)
  if (literal !== undefined) return [literal]

  const template = arg.asKind(SyntaxKind.TemplateExpression)
  const loop = template ? findExamplesLoop(call) : undefined
  const table = loop?.array ? readExamplesArray(loop.array) : null
  if (!template || !loop || !table) return null

  const columns = template
    .getTemplateSpans()
    .map((span) => getExampleColumn(span.getExpression(), loop.varName))
  if (columns.some((column) => column === undefined || !table.columns.includes(column))) {
    return null
  }
  return table.rows.map((row) => {
    const value = (column: string | undefined) => row[table.columns.indexOf(column!)]
    return (
      template.getHead().getLiteralText() +
      template
        .getTemplateSpans()
        .map((span, i) => value(columns[i]) + span.getLiteral().getLiteralText())
        .join('')
    )
  })
}

/** `language` of the options object literal (third argument), undefined when not given */
function readLanguage(call: CallExpression): string | undefined {
  const property = call
    .getArguments()[2]
    ?.asKind(SyntaxKind.ObjectLiteralExpression)
    ?.getProperty('language')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializer()
  return property ? literalText(property) : undefined
}

/** Keys of the fixtures object literal; empty set when no argument; null for anything else */
function readPassedFixtures(call: CallExpression): Set<string> | null {
  const arg = call.getArguments()[1]
  if (!arg) return new Set()
  const object = arg.asKind(SyntaxKind.ObjectLiteralExpression)
  if (!object) return null
  const names = new Set<string>()
  for (const property of object.getProperties()) {
    const named =
      property.asKind(SyntaxKind.ShorthandPropertyAssignment) ??
      property.asKind(SyntaxKind.PropertyAssignment)
    if (!named) return null
    names.add(named.getName())
  }
  return names
}

function readShorthandNames(call: CallExpression): string[] {
  return (
    call
      .getArguments()[1]
      ?.asKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperties()
      .flatMap((property) =>
        property.isKind(SyntaxKind.ShorthandPropertyAssignment) ? [property.getName()] : []
      ) ?? []
  )
}

/**
 * Name is a parameter (destructured fixture) of an enclosing function, or a variable / import
 * declared in an enclosing function or the file - otherwise the test fails with ReferenceError
 */
function isDeclaredAround(call: CallExpression, name: string): boolean {
  const functions = call
    .getAncestors()
    .filter(
      (node): node is ArrowFunction | FunctionExpression | FunctionDeclaration =>
        Node.isArrowFunction(node) ||
        Node.isFunctionExpression(node) ||
        Node.isFunctionDeclaration(node)
    )
  const sourceFile = call.getSourceFile()
  const declared = [
    ...functions.flatMap((fn) => [
      ...fn.getParameters().flatMap((parameter) => bindingNames(parameter.getNameNode())),
      ...fn
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .flatMap((declaration) => bindingNames(declaration.getNameNode()))
    ]),
    ...sourceFile
      .getVariableDeclarations()
      .flatMap((declaration) => bindingNames(declaration.getNameNode())),
    ...sourceFile
      .getImportDeclarations()
      .flatMap((declaration) => [
        ...declaration
          .getNamedImports()
          .map((named) => named.getAliasNode()?.getText() ?? named.getName()),
        ...[declaration.getDefaultImport(), declaration.getNamespaceImport()].flatMap((node) =>
          node ? [node.getText()] : []
        )
      ])
  ]
  return declared.includes(name)
}

/** Names bound by a parameter or variable: `x`, `{ a, b: c }` (c), `[d]` */
function bindingNames(nameNode: BindingName): string[] {
  if (Node.isIdentifier(nameNode)) return [nameNode.getText()]
  return nameNode
    .getDescendantsOfKind(SyntaxKind.BindingElement)
    .map((element) => element.getNameNode())
    .filter(Node.isIdentifier)
    .map((identifier) => identifier.getText())
}

/**
 * Step files whose definitions the calls use are imported by the test, directly or through
 * other project files - runStep finds only registered definitions
 */
function checkStepFileImports(sourceFile: SourceFile, calls: CallExpression[]): string[] {
  const used = new Set<string>()
  for (const call of calls) {
    for (const title of resolveTitles(call) ?? []) {
      let text: string
      try {
        text = stripStepKeyword(title, readLanguage(call))
      } catch {
        continue // reported by checkCall
      }
      const matches = matchStepDefinitions(text)
      if (matches.length === 1) used.add(locationFile(matches[0].definition.location))
    }
  }
  if (used.size === 0) return []

  const reachable = collectImportedFiles(sourceFile.getFilePath())
  const testPath = sourceFile.getFilePath()
  return [...used]
    .filter((file) => !reachable.has(path.resolve(file)))
    .sort()
    .map((file) => {
      const specifier = toModuleSpecifier(`${file}:1`, path.relative(process.cwd(), testPath))
      return `Step definitions of ${file} are used but not imported\n  Fix: import '${specifier}'`
    })
}

/** Project files imported by a file, transitively (`@/` alias and relative imports) */
function collectImportedFiles(entry: string): Set<string> {
  const visited = new Set<string>()
  const queue = [path.resolve(entry)]
  while (queue.length > 0) {
    const file = queue.pop()!
    const text = readFile(file)
    for (const [, specifier] of text.matchAll(/(?:import|from)\s+['"]([^'"]+)['"]/g)) {
      const resolved = resolveModule(specifier, path.dirname(file))
      if (resolved && !visited.has(resolved)) {
        visited.add(resolved)
        queue.push(resolved)
      }
    }
  }
  return visited
}

function resolveModule(specifier: string, fromDir: string): string | null {
  const base = specifier.startsWith('@/')
    ? path.resolve('src', specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(fromDir, specifier)
      : null
  if (!base) return null
  return (
    [base, `${base}.ts`, path.join(base, 'index.ts')].find(
      (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ) ?? null
  )
}

function literalText(node: Node): string | undefined {
  return (
    node.asKind(SyntaxKind.StringLiteral)?.getLiteralValue() ??
    node.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)?.getLiteralValue()
  )
}

function locationFile(location: string): string {
  return location.replace(/:\d+$/, '')
}

function readFile(file: string): string {
  try {
    return fs.readFileSync(file, 'utf-8')
  } catch {
    return ''
  }
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
