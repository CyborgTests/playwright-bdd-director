import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkSpecRename, renameSpec } from '@/framework/core/spec-rename'
import { toPosix } from '@/framework/utils/helpers'

let dir: string
let suites: string
let steps: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-rename-'))
  suites = path.join(dir, 'test-suites')
  steps = path.join(dir, 'steps')
  fs.mkdirSync(suites)
  fs.mkdirSync(steps)
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

function write(file: string, content = ''): string {
  fs.writeFileSync(file, content)
  return file
}

describe('renameSpec', () => {
  it('should rename the spec and its step file, list step files naming the old tag', () => {
    const spec = write(path.join(suites, 'cart.feature'), 'Feature: Cart')
    write(
      path.join(steps, 'cart.steps.ts'),
      "// Skeletons from `npm run steps cart`\n// npm run steps cart-api stays\nWhen('x', () => {})"
    )
    write(
      path.join(steps, 'hooks.steps.ts'),
      "Before({ tags: '@cart' })\nBefore({ tags: '@cart-api' })"
    )

    const renamed = renameSpec(spec, 'basket', [spec], steps)

    expect(renamed.spec.to).toBe(toPosix(path.join(suites, 'basket.feature')))
    expect(renamed.steps?.to).toBe(toPosix(path.join(steps, 'basket.steps.ts')))
    expect(fs.existsSync(spec)).toBe(false)
    expect(fs.existsSync(path.join(steps, 'cart.steps.ts'))).toBe(false)
    expect(fs.readFileSync(path.join(steps, 'basket.steps.ts'), 'utf-8')).toBe(
      "// Skeletons from `npm run steps basket`\n// npm run steps cart-api stays\nWhen('x', () => {})"
    )
    expect(renamed.tagUses).toEqual([`${toPosix(path.join(steps, 'hooks.steps.ts'))}:1`])
  })

  it('should only check a free name with checkSpecRename', () => {
    const spec = write(path.join(suites, 'cart.md'), '## Cart')
    write(path.join(steps, 'cart.steps.ts'))

    expect(() => checkSpecRename(spec, 'basket', [spec], steps)).not.toThrow()
    expect(fs.readdirSync(suites)).toEqual(['cart.md'])
    expect(fs.readdirSync(steps)).toEqual(['cart.steps.ts'])
  })

  it('should rename a spec without a step file', () => {
    const spec = write(path.join(suites, 'cart.md'), '## Cart')

    const renamed = renameSpec(spec, 'basket', [spec], steps)

    expect(renamed.steps).toBeUndefined()
    expect(fs.existsSync(path.join(suites, 'basket.md'))).toBe(true)
  })

  it.each([
    ['a name another spec has, in either format', 'auth', 'has the name "auth"'],
    ['an existing step file', 'shared', 'shared.steps.ts exists already'],
    ['an invalid name', 'shop/cart', 'Invalid spec name'],
    ['an extension', 'basket.md', 'Invalid spec name'],
    ['the same name', 'cart', 'is the name already']
  ])('should rename nothing for %s', (_, newBase, message) => {
    const spec = write(path.join(suites, 'cart.md'), '## Cart')
    const other = write(path.join(suites, 'auth.feature'), 'Feature: Auth')
    write(path.join(steps, 'cart.steps.ts'))
    write(path.join(steps, 'shared.steps.ts'))

    expect(() => renameSpec(spec, newBase, [spec, other], steps)).toThrow(message)
    expect(fs.readdirSync(suites).sort()).toEqual(['auth.feature', 'cart.md'])
    expect(fs.readdirSync(steps).sort()).toEqual(['cart.steps.ts', 'shared.steps.ts'])
  })
})
