import { describe, expect, it } from 'vitest'

import { attachSourceMap, specMarker } from '@/framework/bdd/source-map'

const decodeMap = (content: string) => {
  const [, encoded] = content.match(/base64,(.+)\n$/)!
  return JSON.parse(Buffer.from(encoded, 'base64').toString()) as {
    sources: string[]
    mappings: string
  }
}

describe('attachSourceMap', () => {
  const generated = [specMarker(3, 5), 'first()', 'second()', specMarker(2, 1), 'third()', ''].join(
    '\n'
  )

  it('should leave no marker in the test', () => {
    const content = attachSourceMap(
      generated,
      'test-suites/cart.feature',
      '.director/tests/cart.test.ts'
    )

    expect(content.split('\n//# sourceMappingURL=')[0]).toBe('first()\nsecond()\nthird()')
  })

  it('should map marked lines to spec and other lines to test file itself', () => {
    const content = attachSourceMap(
      generated,
      'test-suites/cart.feature',
      '.director/tests/cart.test.ts'
    )

    // Fields relative to previous mapping: spec line 3 column 5 (0-based 2, 4), test file line 2,
    // spec line 2 column 1
    expect(decodeMap(content).mappings).toBe('AAEI;ACDJ;ADAA')
  })

  it('should name spec relative to test file, so generation does not depend on machine', () => {
    const content = attachSourceMap(
      generated,
      'test-suites/shop/cart.feature',
      '.director/tests/shop/cart.test.ts'
    )

    expect(decodeMap(content).sources).toEqual([
      '../../../test-suites/shop/cart.feature',
      'cart.test.ts'
    ])
  })
})
