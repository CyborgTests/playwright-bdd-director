/* eslint-disable no-undef */
'use strict'

/**
 * Line budgets of the AI spec (see .claude/rules/ai-spec-architecture.md).
 * PreToolUse reminds before content is written (portable — Devin supports only Pre);
 * PostToolUse measures the real result. Never blocks: an edit may be the one that shrinks the file.
 */
const TARGETS = [
  { re: /^AGENTS\.md$/, budget: 100, label: 'AGENTS.md (always-loaded core doc)' },
  { re: /^\.claude\/rules\/[^/]+\.md$/, budget: 70, label: 'rule' },
  { re: /^\.cursor\/rules\/[^/]+\.mdc$/, budget: 70, label: 'Cursor rule' },
  { re: /^\.agents\/skills\/[^/]+\/SKILL\.md$/, budget: 70, label: 'skill' },
  { re: /^\.claude\/agents\/[^/]+\.md$/, budget: 70, label: 'subagent' },
  { re: /^\.devin\/agents\/[^/]+\/AGENT\.md$/, budget: 70, label: 'subagent' }
]

const ADMISSION_TEST =
  'AGENTS.md admission test — content belongs here only if all three hold: (1) needed before any file is read, (2) applies repo-wide, (3) short fact or hard constraint, not a procedure or table. Otherwise: glob-scoped convention → .claude/rules/, procedure → .agents/skills/.'

function countLines(text) {
  if (!text) return 0
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length
}

module.exports = {
  name: 'check-spec-budget',
  kinds: ['edit'],
  events: ['PreToolUse', 'PostToolUse'],
  run({ event, relPath, readFile }) {
    const target = TARGETS.find((t) => t.re.test(relPath))
    if (!target) return null

    const text = readFile()
    const lines = text === null ? 0 : countLines(text)
    const { budget, label } = target
    const near = budget - 10
    const isCore = budget === 100

    if (event === 'PreToolUse') {
      if (isCore)
        return {
          context: `AGENTS.md is ${lines}/${budget} lines before this edit. ${ADMISSION_TEST}`
        }
      if (lines >= near) {
        return {
          context: `${relPath} (${label}) is ${lines}/${budget} lines — added content should displace something.`
        }
      }
      return null
    }

    if (lines > budget) {
      return {
        context: `${relPath} (${label}) is now ${lines} lines, over its ${budget}-line budget. Fix it in this task: split by topic or move detail to references/ or a skill.${isCore ? ` ${ADMISSION_TEST}` : ''}`
      }
    }
    if (lines >= near) {
      return {
        context: `${relPath} (${label}) is now ${lines}/${budget} lines — ${budget - lines} left.`
      }
    }
    return null
  }
}
