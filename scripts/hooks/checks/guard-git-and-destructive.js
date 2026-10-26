/* eslint-disable no-undef */
'use strict'

/**
 * Asks before git operations that AGENTS.md reserves for explicit user approval and
 * before commands that destroy uncommitted work. Never denies: the user decides.
 */
// `git`, `"git"`, `git.exe` and global options before the subcommand (`-C dir`, `-c k=v`,
// `--git-dir x`, `--no-pager`) - the subcommand must not hide behind them
const GIT = String.raw`\bgit(?:\.exe)?["']?(?:\s+(?:-[Cc]\s+\S+|--(?:git-dir|work-tree|namespace|exec-path)(?:=|\s+)\S+|--?[\w-]+(?:=\S+)?))*\s+`
const git = (subcommand) => new RegExp(GIT + subcommand)
// rm with recursive and force flags in any order or split: `-rf`, `-r -f`, `--recursive --force`
const RM_FLAGS = String.raw`(?:\s+-[\w-]+)*\s+`
const RM = new RegExp(
  String.raw`\brm(?=${RM_FLAGS}(?:-\w*[rR]|--recursive\b))(?=${RM_FLAGS}(?:-\w*f|--force\b))`
)

const GUARDS = [
  {
    re: git(String.raw`(commit|push|add|stage)\b`),
    why: 'AGENTS.md: commits, pushes and staging need explicit user approval'
  },
  { re: git(String.raw`(rebase|filter-branch|filter-repo)\b`), why: 'rewrites git history' },
  { re: git(String.raw`reset\s+.*--hard\b`), why: 'discards uncommitted changes' },
  { re: git(String.raw`clean\s+-\w*f`), why: 'deletes untracked files' },
  {
    re: git(String.raw`(checkout|restore)\s+(--\s+)?\.(\s|$)`),
    why: 'discards working-tree changes'
  },
  { re: git(String.raw`branch\s+-D\b`), why: 'force-deletes a branch' },
  { re: git(String.raw`stash\s+(drop|clear)\b`), why: 'deletes stashed work' },
  { re: RM, why: 'recursive force delete' },
  {
    re: /\b(?:Remove-Item|ri)\b.*\s-r(?:e(?:c(?:u(?:r(?:s(?:e)?)?)?)?)?)?\b/i,
    why: 'recursive delete (PowerShell)'
  }
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
