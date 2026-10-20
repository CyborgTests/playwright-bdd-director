---
description: File formats for rules, skills, subagents and hooks — frontmatter, required sections, hook I/O protocol.
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
  - 'scripts/codex-preflight.js'
---

# AI Specification Formats

## Rules (`.claude/rules/<topic>.md`)

- Frontmatter: `description` (required) and `paths` (globs; omit only for truly repo-wide topics).
- Body: short headed sections of declarative bullets. Explain the reason in a clause when it is not obvious; avoid shouting (`MUST`/`NEVER` in caps) — state the rule plainly.
- Add each new rule to the index in `AGENTS.md` and the pointer in `.cursor/rules/00-rules.mdc` (audited).

## Skills (`.agents/skills/<kebab-name>/SKILL.md`)

- Frontmatter: `name` equal to the directory name; `description` starting with "Use when…" that names the trigger. Add `disable-model-invocation: true` for skills that must run only on explicit request.
- Body: `# Title`, one line of purpose, `## Before you start` (preconditions, read-only boundaries), `## Steps` (numbered, imperative), `Done when:` one line with a verifiable outcome.
- No filler intros ("Procedural workflow for…"). Point to rules instead of restating them.
- `references/<topic>.md` only for templates or tables that would break the budget; no stubs, one topic per file.

## Subagents (`.claude/agents/<name>.md`)

- Frontmatter: `name`, `description` (trigger), `tools`, `mcpServers` when needed.
- Body: role in one paragraph, the skill to follow, `## Do not` list. Keep the Devin mirror (`.devin/agents/<name>/AGENT.md`, `allowed-tools` lowercased: `read write edit exec grep glob`) with an identical body — audit compares them.

## Hooks (`scripts/hooks/`)

- One entry point: `node scripts/hooks/dispatch.js edit|bash`. A check is a module in `checks/` exporting `{ name, kinds, events, run(ctx) }`; register it in `checks/index.js` only.
- `ctx` gives `event` (`PreToolUse` / `PostToolUse`), `kind`, `relPath` (repo-relative, forward slashes), `incoming` (new text of Write/Edit), `command` (Bash), `readFile()`.
- `run` returns `null` or `{ decision?: 'allow' | 'ask' | 'deny', reason?, context? }`. The dispatcher merges results: `deny` > `ask` > `allow`, and joins contexts.
- Warn by default (`context`); `ask` for risky but legitimate actions; `deny` only for hard boundaries (e.g. `node_modules`).
- Checks are pure and fast: no network, no spawning, never throw (the dispatcher fails open). Cover each check in `tests/unit/ai-hooks.test.ts`.
- Output: the dispatcher writes `hookSpecificOutput` JSON and lets the process exit on its own — an explicit `process.exit()` right after writing can truncate stdout on Windows.
