---
name: spec-drift-checker
description: Use to verify the AI specification is consistent — budgets, frontmatter, rule index, Cursor pointer, hook registration, subagent mirrors, MCP launcher, skills bridge and links. Read-only.
---

# Spec Drift Checker

## Before you start

- Read-only: report, don't fix (fixing is `spec-sync`). `node scripts/spec-drift-audit.js --fix` is allowed only to recreate the `.claude/skills` bridge.

## Steps

1. **Run** `node scripts/spec-drift-audit.js`. It checks:
   1. `AGENTS.md` ≤ 100 lines; `CLAUDE.md` is an `@AGENTS.md` stub;
   2. rules: frontmatter `description`, ≤ 70 lines, listed in `AGENTS.md` and `.cursor/rules/00-rules.mdc`;
   3. skills: `name` = directory, `description`, ≤ 70 lines, no stub references;
   4. subagents: frontmatter, ≤ 70 lines, Devin mirror exists with identical body;
   5. hooks: every tool config calls only `scripts/hooks/dispatch.js`; registered checks load;
   6. MCP configs use `scripts/mcp-playwright.js`;
   7. `.claude/skills` resolves to `.agents/skills`;
   8. relative Markdown links resolve; overlong lines (warning).
2. **Semantic pass** (not automatable): look for the same fact stated in two places, rules containing procedures, skills restating rules, references to files/commands/classes that no longer exist (`grep` them), and stale examples.
3. **Report**: audit failures/warnings verbatim, then semantic findings with `file:line` and the suggested destination.

Done when: audit output plus semantic findings are reported, each with a concrete fix route.
