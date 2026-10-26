# Attack Surface of This Repo

Each surface: what it holds, who can reach it, the attack classes to hunt. Out of scope here: memory safety, cloud and infrastructure, multi-tenant isolation, message brokers.

## Director WebSocket server (`scripts/patch-playwright.js`)

Reads, writes and deletes specs, runs `scripts/md-ts-director.ts`. Reachable by any site open in the user's browser (WebSockets ignore the same-origin policy) and, if it binds wider than loopback, by other machines.

- Invariants (`framework-code` rule): starts in UI mode only, listens on `127.0.0.1`, accepts only the token from `uiMode.html`. Check all three still hold.
- Path traversal in `resolveSuitePath`: `..`, absolute paths, the `test-suites/` prefix, symlinks inside `test-suites/`, Windows drive letters and case.
- `RUN_STAGE` spawns with `shell: true`: can any message field reach the command line?
- Token exposure: console output, files readable by other local users, the served HTML read cross-origin.

## Director UI (`packages/director`, `packages/trace-viewer`)

Renders spec text (`react-markdown`, Gherkin) from files a PR author controls, and holds the WebSocket token: script running in the UI can read, write and delete specs.

- DOM XSS: `dangerouslySetInnerHTML`, raw HTML enabled in the Markdown renderer, `innerHTML`, `javascript:` / `data:` links.
- `postMessage` handlers without an exact origin check; data sent to `*`.

## Postinstall, forks and dependencies

`scripts/patch-playwright.js` rewrites `node_modules/playwright` on every install; `packages/*` forks are built into Playwright's UI; `package-lock.json` pins versions.

- Patch removal by marker: can file content shift the markers and leave or inject code?
- Lockfile `resolved` entries pointing to unexpected registries, git URLs or tarballs; install scripts of new dependencies.
- Forks of Playwright 1.60.0 missing upstream security fixes in the code they replace.
- `npm audit` results count only with a reachable path; dev-only tooling without one is a hardening note.

## Release and publishing

`npm version` with an annotated tag, pushed to GitHub; no CI workflows in the repo.

- What a package or archive would contain: `.env`, `.local-docs/`, `test-results/`, traces.
- Secrets in git history (`check-secret-leak` hook guards new edits only).

## AI agent tooling (`AGENTS.md`, `.claude/`, `.agents/`, `scripts/hooks/`, `scripts/mcp-playwright.js`)

Agents read web pages through Playwright MCP and spec or PR text, and can run shell commands.

- Indirect prompt injection from a page or spec into an agent with shell access. Prompt injection alone is not a finding: show the deterministic control that fails (hook, permission prompt).
- Hook bypasses: command matching defeated by quoting, chaining (`&&`, `;`), PowerShell vs Bash syntax, env prefixes, path spelling; checks that fail open where they should not.
- MCP launcher arguments and environment; secrets an agent can read (`.env`).

## Reports and test data

`test-results/` (Monocart, Cucumber JSON / HTML, JUnit, `generation-errors.md`, attachments from `logger.ts` and `APIExpect`) goes to CI artifacts and test management tools.

- Passwords, tokens, cookies and emails in attachments, request logs, traces (`trace.zip` holds cookies and storage) and screenshots; which keys and nesting `sanitizeObject` masks.
- Credentials committed in specs, step data or fixtures.

## Framework inputs (`src/framework/**`)

Specs and step definitions drive code generation into `.director/tests`.

- Spec text reaching generated code unescaped (string literals, template literals, comments): code execution in the test runner from a spec in a PR.
- Env path overrides (`CONFIG.paths`) act for the same user: not a boundary by themselves.
