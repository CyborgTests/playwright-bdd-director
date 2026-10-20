/* eslint-disable no-undef */
'use strict'

/** Hard boundary for installed code; confirmation for archived orphans. */
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
    if (relPath.startsWith('tests/archived/')) {
      return {
        decision: 'ask',
        reason:
          'tests/archived/** holds orphaned tests moved by `npm run stage`; they never run. Restore the MD in test-suites/ instead of editing the archive. Confirm if the edit is intentional.'
      }
    }
    return null
  }
}
