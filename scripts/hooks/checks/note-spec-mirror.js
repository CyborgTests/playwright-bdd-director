/* eslint-disable no-undef */
'use strict'

/** Points to the files that must change together with an AI-spec file (see spec-sync skill). */
const MIRRORS = [
  {
    test: /^CLAUDE\.md$/,
    note: () =>
      'CLAUDE.md is a thin `@AGENTS.md` import stub — core instructions belong in AGENTS.md. Only Claude-Code-only guidance goes here, below the import.'
  },
  {
    test: /^\.claude\/agents\/([^/]+)\.md$/,
    note: (m) => `Mirror: keep .devin/agents/${m[1]}/AGENT.md body identical (audit compares).`
  },
  {
    test: /^\.devin\/agents\/([^/]+)\/AGENT\.md$/,
    note: (m) => `Mirror: keep .claude/agents/${m[1]}.md body identical (audit compares).`
  },
  {
    test: /^(\.claude\/settings\.json|\.devin\/(config|hooks\.v1)\.json)$/,
    note: () =>
      'Hook/permission config exists per tool (.claude/settings.json, .devin/hooks.v1.json, .devin/config.json). All of them call only scripts/hooks/dispatch.js — add new checks to scripts/hooks/checks/index.js instead.'
  },
  {
    test: /^\.claude\/rules\/([^/]+)\.md$/,
    note: (m) =>
      `If rule "${m[1]}" is new or renamed: update the index in AGENTS.md and .cursor/rules/00-rules.mdc (audit checks both).`
  },
  {
    test: /^\.agents\/skills\/([^/]+)\/SKILL\.md$/,
    note: (m, incoming) => {
      const name = /^name:\s*['"]?([\w-]+)/m.exec(incoming)
      return name && name[1] !== m[1]
        ? `Skill frontmatter name "${name[1]}" must equal the directory name "${m[1]}".`
        : null
    }
  }
]

module.exports = {
  name: 'note-spec-mirror',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath, incoming }) {
    for (const mirror of MIRRORS) {
      const match = mirror.test.exec(relPath)
      if (!match) continue
      const context = mirror.note(match, incoming)
      return context ? { context } : null
    }
    return null
  }
}
