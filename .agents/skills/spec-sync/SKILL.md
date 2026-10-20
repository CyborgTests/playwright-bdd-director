---
name: spec-sync
description: Use when adding or changing guidance for AI agents in this repo — a new convention, procedure, persona or guard — to place it in the right component and keep every tool's entry point in sync.
---

# Change the AI Specification

## Before you start

- Rules: `ai-spec-architecture` (components, admission test, placement) and `ai-spec-formats` (file formats, hook protocol).
- Prefer editing an existing rule/skill over adding a file; prefer a hook over prose when the constraint is mechanical.

## Steps

1. **Classify** the guidance:
   - repo-wide fact needed before reading files → `AGENTS.md` (passes the admission test);
   - glob-scoped standard → `.claude/rules/<topic>.md`;
   - procedure / checklist → `.agents/skills/<name>/SKILL.md`;
   - needs own tools or MCP → `.claude/agents/<name>.md` + `.devin/agents/<name>/AGENT.md`;
   - mechanically checkable → `scripts/hooks/checks/<name>.js` + `checks/index.js` + a test in `tests/unit/ai-hooks.test.ts`.
2. **Write it** in the target format; remove anything it duplicates elsewhere (one fact, one place).
3. **Wire it**:
   - new/renamed rule → index in `AGENTS.md` + `.cursor/rules/00-rules.mdc`;
   - new skill → frontmatter `name` = directory; mention in `AGENTS.md` only if it is a key entry point;
   - subagent → identical body in the Devin mirror;
   - hook config → only `scripts/hooks/dispatch.js` is registered (`.claude/settings.json`, `.devin/hooks.v1.json`); Codex runs it through `scripts/codex-preflight.js`.
4. **Budgets**: `AGENTS.md` ≤ 100 lines; rules, skills, agents ≤ 70. Over budget → split or move detail to `references/`.
5. **Verify**: `node scripts/spec-drift-audit.js` (0 failures) and `npx vitest run tests/unit/ai-hooks.test.ts` if hooks changed.

Done when: the guidance lives in exactly one place, all pointers reference it, and `node scripts/spec-drift-audit.js` passes.
