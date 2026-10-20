---
description: AI specification architecture — the five components, their budgets, the AGENTS.md admission test, and where new guidance belongs.
paths:
  - 'AGENTS.md'
  - 'CLAUDE.md'
  - '.claude/**'
  - '.agents/**'
  - '.cursor/**'
  - '.codex/**'
  - '.devin/**'
  - 'scripts/hooks/**'
  - 'scripts/spec-drift-audit.js'
  - 'scripts/ensure-skills-link.js'
  - 'scripts/codex-preflight.js'
  - 'scripts/mcp-playwright.js'
---

# AI Specification Architecture

The spec is split into five components with one job each. Shorter is better: every always-loaded line costs context in every session and dilutes adherence.

| Component | Job                                          | Location                                                | Budget    | Must not contain                            |
| --------- | -------------------------------------------- | ------------------------------------------------------- | --------- | ------------------------------------------- |
| Core doc  | Repo facts, commands, boundaries, DoD, index | `AGENTS.md` (`CLAUDE.md` = `@AGENTS.md` stub)           | 100 lines | Glob-scoped conventions, procedures, tables |
| Rules     | Standards: what is allowed / forbidden       | `.claude/rules/*.md`                                    | 70 lines  | Step-by-step procedures                     |
| Skills    | Repeatable procedures: how to do it          | `.agents/skills/<name>/SKILL.md` (+ `references/`)      | 70 lines  | Global standards, personas                  |
| Subagents | Personas that need their own tools / MCP     | `.claude/agents/*.md` + `.devin/agents/<name>/AGENT.md` | 70 lines  | Procedures (point to a skill)               |
| Hooks     | Automated guards on tool events              | `scripts/hooks/checks/*.js` via `dispatch.js`           | —         | Business logic, workflows                   |

Budgets are enforced by `scripts/hooks/checks/check-spec-budget.js` and `node scripts/spec-drift-audit.js`. Audit warns on lines over 300 characters (tables excepted): the budget measures content, so don't cram paragraphs into one line.

## AGENTS.md admission test (all three must hold)

1. **Timing** — needed before any file is read, so a path-scoped rule cannot deliver it in time.
2. **Scope** — applies repo-wide, not to a file glob.
3. **Format** — a short fact or hard constraint, not a procedure or reference table.

If any fails: glob-scoped convention → rule; procedure or table → skill; tool-bound persona → subagent; mechanically checkable constraint → hook.

## Placement decisions

- A checklist or multi-step workflow is a skill, never a subagent or a rule.
- Create a subagent only when the task needs a different tool set or MCP binding; its body points to a skill instead of repeating steps.
- Prefer a hook over prose when a rule can be checked mechanically — prose is advice, hooks are enforced.
- One topic per rule. Merge rules that share identical `paths`: they always load together, so splitting saves nothing.
- Project facts (file paths, class names, commands) go in rules/skills of this repo; generic standards stay generic — don't mix them in one bullet.
- No changelog in the spec: dates, "moved on…", "removed in…", counts of skills/rules belong in git history.

## Cross-tool mapping

- Claude Code: `CLAUDE.md`, `.claude/rules`, `.claude/skills` (junction to `.agents/skills`, created by `node scripts/ensure-skills-link.js` / postinstall), `.claude/agents`, `.claude/settings.json` hooks.
- Codex: `AGENTS.md`, `.agents/skills`, rules and hooks through the `codex-runtime-bridge` skill + `scripts/codex-preflight.js`.
- Cursor: `.cursor/rules/00-rules.mdc` pointer to `AGENTS.md`, every rule and skills.
- Devin: `.devin/config.json` (reads Claude/Cursor config), `.devin/hooks.v1.json`, `.devin/agents`.
- All tools register only `scripts/hooks/dispatch.js`; MCP servers start through `scripts/mcp-playwright.js`.
