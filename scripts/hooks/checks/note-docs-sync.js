/* eslint-disable no-undef */
'use strict'

/** Reminds that a user-visible framework change is done only with every doc mentioning it updated. */
module.exports = {
  name: 'note-docs-sync',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath }) {
    const framework = /^(src\/framework\/.+|scripts\/[^/]+)\.ts$/.test(relPath)
    if (!framework || relPath.endsWith('.test.ts')) return null
    return {
      context:
        'Framework / CLI code: a user-visible change (command, option, output, report, behavior) is done only when the docs follow in the same task - README.md, then grep the command or feature name across docs/, AGENTS.md, .claude/rules, .agents/skills and script header comments, and update every mention (AGENTS.md "Definition of done").'
    }
  }
}
