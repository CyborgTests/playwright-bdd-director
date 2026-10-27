/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
'use strict'

/**
 * Registry of hook checks run by ../dispatch.js, in order.
 * Each check: { name, kinds: ('edit'|'bash')[], events: ('PreToolUse'|'PostToolUse')[], run(ctx) }.
 */
module.exports = [
  require('./protect-paths'),
  require('./guard-git-and-destructive'),
  require('./note-generated-sync'),
  require('./note-docs-sync'),
  require('./note-spec-mirror'),
  require('./note-ui-investigation'),
  require('./check-spec-budget'),
  require('./check-secret-leak'),
  require('./check-test-conventions')
]
