---
description: TypeScript style, type safety, naming, comments and issue annotations (TODO / FIXME / NOTE / WONTDO).
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# TypeScript

## Formatting & imports

- Prettier owns formatting (`semi: false`, `singleQuote`, `printWidth: 100`, `trailingComma: none`); run `npm run format` or `npx prettier --write <files>`.
- Imports are sorted by `simple-import-sort`; unused imports are errors. Prefer `@/…` over deep relative paths (packages under `packages/` use their own relative imports).

## Type safety

- `strict: true`. No `any` in new code — use `unknown` + narrowing, or a precise type.
- Prefix intentionally unused params with `_`.
- `console.*` only in CLI entry points (`scripts/*.ts`, with a file-level `eslint-disable no-console`) and the framework reporting layer; elsewhere use the logger / formatter.

## Simplicity

- KISS / DRY / YAGNI: reuse an existing helper before adding one; no speculative abstractions or single-implementation interfaces (see `ponytail` skill).
- Delete dead code instead of commenting it out — git keeps history; put the reason for a change in the commit message.

## Naming

- Descriptive, no articles in identifiers, test titles or comments (`getSessionRow`, not `getTheSessionRow`). Exception: literal UI/API text matched verbatim.
- Page Object locators: `private readonly` with a role suffix consistent with existing pages (`loginBtn`, `signupNameInput`, `loginErrorMsg`, `signupForm`).

## Comments

- `//` for a short local remark; `/** … */` for rationale, a non-obvious constraint or public API docs. Don't stack several `/** */` blocks back to back — merge them.
- Comment the _why_, not the _what_.

## Issue annotations (greppable)

- `TODO:` — missing information blocks the task; state what is missing instead of guessing (`// TODO: need real endpoint — not in API docs`).
- `FIXME:` — test works around a confirmed bug in the app under test: what is broken, where, what should happen once fixed. Prefer `test.fixme()` for the whole test over partial workarounds.
- `NOTE: possible bug, left to devs -` — behavior looks wrong but isn't confirmed: assert it as is, describe the observation and `(confirmed live <YYYY-MM-DD>)`.
- `WONTDO:` — an MD step that will never be automated (no observable signal, deliberately out of scope), with the reason it is permanent.
