import { escapeRegExp } from '../utils/helpers'
import type { MissingStep } from './generator'

const STEPS_MODULE = './bdd'
const FRAMEWORK_MODULE = '@/framework/bdd'

/**
 * Step file content with skeletons of the missing steps appended - one per keyword and
 * expression (Outline rows give the same one) - and the step functions they use imported
 * @param content - current step file, '' for a new one
 */
export function addStepSkeletons(
  content: string,
  missing: MissingStep[]
): { content: string; added: number } {
  const skeletons = missing.filter(
    (step, i) =>
      missing.findIndex(
        (other) => other.keyword === step.keyword && other.expression === step.expression
      ) === i
  )
  if (skeletons.length === 0) return { content, added: 0 }

  let result = addImport(
    content,
    STEPS_MODULE,
    skeletons.map((step) => step.keyword)
  )
  if (skeletons.some((step) => step.snippet.includes(': DataTable'))) {
    result = addImport(result, FRAMEWORK_MODULE, ['DataTable'])
  }
  const snippets = skeletons.map((step) => step.snippet).join('\n\n')
  return { content: `${result.trimEnd()}\n\n${snippets}\n`, added: skeletons.length }
}

/** Named imports merged into the import of the module, or a new import (relative ones last) */
function addImport(content: string, module: string, names: string[]): string {
  const pattern = new RegExp(`import \\{([^}]*)\\} from '${escapeRegExp(module)}'\\n?`)
  const match = content.match(pattern)
  const existing = match?.[1].split(',').map((name) => name.trim()) ?? []
  const merged = [...new Set([...existing, ...names].filter(Boolean))].sort()
  const line = `import { ${merged.join(', ')} } from '${module}'\n`
  if (match) return content.replace(pattern, line)
  if (module.startsWith('.')) {
    const imports = [...content.matchAll(/^import .*\n/gm)]
    const last = imports.at(-1)
    if (!last) return `${line}${content.trim() ? `\n${content}` : ''}`
    const end = last.index + last[0].length
    return `${content.slice(0, end)}\n${line}${content.slice(end)}`
  }
  return `${line}\n${content}`
}
