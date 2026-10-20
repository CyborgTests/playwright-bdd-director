---
name: codex-runtime-bridge
description: Use at the start of Codex (or any tool without native hooks/rules) work in this repo when the task touches files — loads matching .claude/rules and runs the shared hook dispatcher manually around edits and risky commands.
---

# Codex Runtime Bridge

Codex reads `AGENTS.md` and `.agents/skills/**` natively; rules and hooks need this bridge.

## Steps

1. **Load rules**: read the frontmatter of every `.claude/rules/*.md` and fully read each rule whose `paths` match a file you will touch. For AI-spec changes also read `ai-spec-architecture` and `ai-spec-formats`.
2. **Guard edits and commands** with `scripts/codex-preflight.js` (same checks as Claude Code hooks):
   - before editing: `node scripts/codex-preflight.js edit <path>`;
   - after editing: `node scripts/codex-preflight.js post-edit <path>`;
   - before risky shell commands (git write operations, deletes): `node scripts/codex-preflight.js bash "<command>"`.
   - Exit `2` (deny) → abort; `3` (ask) → get user confirmation; printed context → apply it before continuing.
3. **Browser work**: the Playwright MCP server is configured in `.codex/config.toml`; follow the `ui-explorer` / `ui-mapper` skills (the `.claude/agents` personas describe their limits).
4. **Spec changes** → `spec-sync` skill.

Done when: every edited file passed pre/post preflight and matching rules were applied.
