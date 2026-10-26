---
name: security-audit
description: Use when asked for a security review or audit of this repo, or when a change touches a trust boundary - the Director WebSocket server, Director UI rendering, the postinstall patch and forks, dependencies and release, agent hooks and MCP, reports that may carry secrets.
---

# Security Audit

Find vulnerabilities that cross a real trust boundary and hand over source evidence, a safe local reproduction and the smallest fix. Adapted from [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) (MIT, see `THIRD_PARTY_NOTICES.md`).

## Before you start

- The audit describes fixes; apply them only after the user approves.
- Evidence stays local: dummy data, loopback, temp dirs. Never probe automationexercise.com or other live services beyond what the test suite does; never publish, push or touch a release.
- Surfaces and attack classes: [references/attack-surface.md](references/attack-surface.md). Verdicts, severity, anti-patterns: [references/verdicts.md](references/verdicts.md).
- Scope: a focused question or a change → its surfaces only; "audit the repo" → every surface.
- Exploit details go to `.local-docs/security-audit/` (gitignored) or the chat, never into committed files or public issues.

## Steps

1. **Map** each in-scope surface: entry point, who can reach it (another site in the browser, another machine, a PR author, a dependency publisher, web content an agent reads) and what it can do (read, write, delete, execute, publish).
2. **Hunt** surface by surface with its attack classes. Start from the sink (file write, spawn, HTML rendering, publish, secret in output) and trace back to an input a lower-trust actor controls.
3. **Gate** every candidate: lower-trust actor, accepted input, the control that should stop it, the boundary crossed, the concrete result. One missing → not a finding (a hardening note at most).
4. **Reproduce** at the minimum effect: a unit test, a node script against a loopback server, a temp-dir fixture. Stop at the first proof (401 vs 200, a file written outside `test-suites/`, a secret in a report).
5. **Disprove**: hand every candidate to a fresh agent (Agent tool, none of the hunt's context) with the claim and `file:line`, asking it to refute the claim from source. Keep only what survives.
6. **Classify**: `confirmed`, `needs_validation` or `rejected` (`verdicts.md`); severity for `confirmed` only.
7. **Plan the fix** per confirmed finding: the invariant, the narrowest change at the last trusted decision point, the regression test that would have caught it. Invariants that must hold later go into the matching rule (`spec-sync`).
8. **Report**: findings by severity with `file:line`, reproduction and fix; then which surfaces were covered and which were not - one pass is never complete.

Done when: every in-scope surface is reported as covered or not, and every reported finding survived an independent disproof attempt.
