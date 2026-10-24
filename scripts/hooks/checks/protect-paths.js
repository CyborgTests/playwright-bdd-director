/* eslint-disable no-undef */
'use strict'

/** Hard boundary for installed and generated code. */
module.exports = {
  name: 'protect-paths',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath }) {
    if (/(^|\/)node_modules\//.test(relPath)) {
      return {
        decision: 'deny',
        reason:
          'node_modules is installed code and is overwritten on install. Change Playwright behavior via scripts/patch-playwright.js (runs on postinstall), then `npm run postinstall`.'
      }
    }
    if (relPath.startsWith('.director/')) {
      return {
        decision: 'deny',
        reason:
          '.director/** holds tests generated from test-suites/ and src/steps/ on every run (playwright.config.ts) - an edit is overwritten. Change the spec or the step definitions instead.'
      }
    }
    return null
  }
}
