/* eslint-disable no-undef */
'use strict'

/**
 * Anti-pattern guard for the Playwright test layer (.claude/rules/playwright-tests.md).
 * Checks only the text being introduced, with comments stripped, and only in test-layer
 * paths — framework code legitimately mentions these APIs. Warns, never blocks.
 */
const TEST_LAYER = /^src\/(steps|pages|fixtures|clients|test-helpers|test-utils)\/.+\.ts$/

const CHECKS = [
  {
    re: /\.waitForTimeout\s*\(/,
    label: 'waitForTimeout()',
    fix: 'wait on a web-first assertion or waitForResponse()'
  },
  {
    re: /\.waitForLoadState\s*\(/,
    label: 'waitForLoadState()',
    fix: 'Playwright auto-waits; assert the expected state'
  },
  { re: /\bpage\s*\.\s*pause\s*\(/, label: 'page.pause()', fix: 'debug residue — remove' },
  { re: /\b(test|describe)\s*\.\s*only\b/, label: '.only', fix: 'narrows the whole run — remove' },
  {
    re: /\.css-[a-z0-9]{6,}\b/i,
    label: 'generated CSS class hash',
    fix: 'use getByRole/getByLabel/getByTestId'
  },
  {
    re: /\bpage\s*\.\s*evaluate\s*\(/,
    label: 'page.evaluate()',
    fix: 'use real user actions; reading geometry is the only exception'
  },
  {
    re: /\.toHaveCSS\s*\(/,
    label: 'toHaveCSS()',
    fix: 'assert behavior, not styling, unless the requirement is visual'
  },
  {
    re: /\bconsole\.log\s*\(/,
    label: 'console.log()',
    fix: 'use log/logJson from @/test-utils/logger'
  }
]

const SCREENSHOT_CALL = /\b(toHaveScreenshot|screenshot)\s*\(/g
const SCREENSHOT_BUDGET = 5
const SCREENSHOT_OPT_OUT = /screenshot-budget-ok/

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

module.exports = {
  name: 'check-test-conventions',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath, incoming }) {
    if (!incoming || !TEST_LAYER.test(relPath)) return null
    const code = stripComments(incoming)
    const hits = CHECKS.filter((c) => c.re.test(code)).map((c) => `${c.label} — ${c.fix}`)

    const shots = (code.match(SCREENSHOT_CALL) || []).length
    if (shots >= SCREENSHOT_BUDGET && !SCREENSHOT_OPT_OUT.test(incoming)) {
      hits.push(
        `${shots} screenshots in one change — keep them dosed (add-screenshot skill) or mark \`screenshot-budget-ok\``
      )
    }
    if (hits.length === 0) return null
    return {
      context: `Test conventions (${relPath}):\n- ${hits.join('\n- ')}\nFix now unless a documented exception in .claude/rules/playwright-tests.md applies.`
    }
  }
}
