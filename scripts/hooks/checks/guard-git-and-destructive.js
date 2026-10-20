/* eslint-disable no-undef */
'use strict'

/**
 * Asks before git operations that AGENTS.md reserves for explicit user approval and
 * before commands that destroy uncommitted work. Never denies: the user decides.
 */
const GUARDS = [
  {
    re: /\bgit\s+(commit|push|add|stage)\b/,
    why: 'AGENTS.md: commits, pushes and staging need explicit user approval'
  },
  { re: /\bgit\s+(rebase|filter-branch|filter-repo)\b/, why: 'rewrites git history' },
  { re: /\bgit\s+reset\s+.*--hard\b/, why: 'discards uncommitted changes' },
  { re: /\bgit\s+clean\s+-\w*f/, why: 'deletes untracked files' },
  { re: /\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, why: 'discards working-tree changes' },
  { re: /\bgit\s+branch\s+-D\b/, why: 'force-deletes a branch' },
  { re: /\bgit\s+stash\s+(drop|clear)\b/, why: 'deletes stashed work' },
  { re: /\brm\s+-\w*(r\w*f|f\w*r)/, why: 'recursive force delete' }
]

module.exports = {
  name: 'guard-git-and-destructive',
  kinds: ['bash'],
  events: ['PreToolUse'],
  run({ command }) {
    const hits = GUARDS.filter((g) => g.re.test(command)).map((g) => g.why)
    if (hits.length === 0) return null
    return {
      decision: 'ask',
      reason: `Command needs confirmation (${[...new Set(hits)].join('; ')}): ${command}`
    }
  }
}
