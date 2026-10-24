/* eslint-disable no-undef */
'use strict'

/** Reminds how step definitions turn into generated tests. */
module.exports = {
  name: 'note-generated-sync',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath }) {
    if (/^src\/steps\/.+\.ts$/.test(relPath)) {
      return {
        context:
          'src/steps/** step definitions drive the tests generated on every run: a step with a definition runs as autoStep, a definition without code (empty body or comments only) keeps its step manual (cyborg; API tests stay fixme). Check with `npm run dress`; skeletons come from `npm run steps <suite>`. See docs/step-definitions.md.'
      }
    }
    return null
  }
}
