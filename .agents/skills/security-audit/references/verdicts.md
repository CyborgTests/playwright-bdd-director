# Verdicts, Severity and Anti-patterns

Adapted from [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill), Copyright (c) 2025-2026 Cloudflare, Inc., MIT License (full notice in `THIRD_PARTY_NOTICES.md`).

## Verdicts

- `confirmed` - complete source trace plus a bounded local result. Only these get a severity.
- `needs_validation` - a source-grounded hypothesis blocked by one exact fact outside the repo (browser behaviour, OS firewall, registry, GitHub settings). State the fact and a safe way to check it; no severity.
- `rejected` - the candidate was disproved; say which control stops it.

## Severity (confirmed only, never above the demonstrated impact)

- **critical** - an unauthenticated actor gains code execution, full data access or account takeover.
- **high** - an explicit control is fully defeated with real consequences: authentication bypass, script execution affecting other users, code execution with some precondition, remote stop of a shared service.
- **medium** - a real boundary violation with limited blast radius or uncommon preconditions.
- **low** - disclosure of non-secret internals, or an effect needing sustained effort for little gain.
- **informational** - a confirmed minimal-impact observation, mostly useful as part of a larger finding.

High or medium: does the result fully defeat a control for an action with real consequences, or only weaken it? If you cannot state the concrete damage, the severity is lower than it feels.

## Finding record

Title; verdict and severity; actor → input → missing control → boundary → result; `file:line` trace; local reproduction (command and input, dummy data only); smallest fix and its regression test.

## Anti-patterns

1. Checklist deviations or missing best practices presented as vulnerabilities.
2. Defense-in-depth advice where another layer already stops the attack.
3. Live or shared-environment testing where local evidence would do.
4. Guessing browser, OS, registry or hosting behaviour that the repo does not show.
5. Same-user actions or self-impact presented as crossing a boundary.
6. Reporting a stronger effect than the one observed.
7. A finding confirmed by the agent that found it, without an independent disproof attempt.
8. Severity on `needs_validation`; a report whose prose and findings disagree.
