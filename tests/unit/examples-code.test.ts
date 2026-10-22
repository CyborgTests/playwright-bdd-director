import { describe, expect, it } from 'vitest'

import {
  buildExamplesArray,
  buildExamplesLoop,
  buildTextLiteral
} from '@/framework/generation/examples-code'

describe('buildTextLiteral', () => {
  it('should quote text without examples placeholders', () => {
    expect(buildTextLiteral("Click 'Login' <button>", ['role'])).toBe(
      "'Click \\'Login\\' <button>'"
    )
  })

  it('should turn column placeholders into template substitutions', () => {
    expect(
      buildTextLiteral('Login as <role> with <first name> <unknown>', ['role', 'first name'])
    ).toBe("`Login as ${example.role} with ${example['first name']} <unknown>`")
  })

  it('should escape backticks, backslashes and ${ in template text', () => {
    expect(buildTextLiteral('Run `cmd` \\ ${x} as <role>', ['role'])).toBe(
      '`Run \\`cmd\\` \\\\ \\${x} as ${example.role}`'
    )
  })
})

describe('buildExamplesArray', () => {
  it('should build one object per row with quoted non-identifier keys', () => {
    const table = { columns: ['role', 'first name'], rows: [['admin', "O'Neil"]] }

    expect(buildExamplesArray(table)).toBe("[\n{ role: 'admin', 'first name': 'O\\'Neil' }\n]")
    expect(buildExamplesLoop(table, 'test()')).toBe(
      `for (const example of ${buildExamplesArray(table)}) {\ntest()\n}`
    )
  })
})
