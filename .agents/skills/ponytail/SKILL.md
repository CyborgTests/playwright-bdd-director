---
name: ponytail
description: Use when writing or refactoring code, tests, Page Objects or framework modules and tempted to add a helper, abstraction or dependency — applies a YAGNI decision ladder to keep the change minimal.
---

# Ponytail — YAGNI Decision Ladder

Run the ladder before adding any new function, class, file, option or dependency.

## Steps

1. **Necessity** — is it required by the current task? Hypothetical future use → don't write it.
2. **Reuse** — search `src/framework/utils`, `src/test-helpers`, `src/test-utils`, `src/pages`, `src/clients`, `src/fixtures`. Exists → reuse or extend it; don't fork a variant.
3. **Native first** — can Playwright, Node, TypeScript or an existing dependency (glob, faker, Cucumber Expressions) do it? Prefer built-ins over new helpers or packages.
4. **Minimal shape** — the shortest code that passes verification: no interface with one implementation, no options nobody passes, no extra inheritance layer, no config for a constant.
5. **Clean up** — remove temporary code, debug output, unused imports and dead code (don't comment it out); `npx eslint --fix <files>` and `npx prettier --write <files>`.

Done when: every added symbol is used by the task, nothing duplicates an existing helper, and lint passes.
