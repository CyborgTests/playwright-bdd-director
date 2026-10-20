---
name: ui-explorer
description: Use whenever a task depends on real UI behavior or DOM — before writing a UI test or Page Object method, before fixing a failing/flaky UI test, or when checking a bug report. Drives a browser through Playwright MCP instead of guessing from code or summaries.
---

# Explore Live UI Before Writing or Fixing Code

Every claim about DOM, copy, behavior or a failure's cause must come from a browser observation made in this task.

## Before you start

- Target the configured `baseURL` from `playwright.config.ts` (the example suite uses automationexercise.com) — never a guessed URL or a production system you weren't pointed at.
- Need an account? Create it the way tests do (`AuthClient.register` with faker data) and delete it afterwards.
- Scope: one targeted check inside a task. Whole-page cataloging → `ui-mapper`.

## Steps

1. **Reproduce the flow** with MCP browser tools (navigate, click, type) exactly as the test or bug report describes.
2. **Snapshot each meaningful state** — resting, after the action, validation/error, modal. Use the accessibility snapshot (roles, names, labels): that is what locators are built from.
3. **Compare** with the existing Page Object locators and test assertions; name every mismatch (renamed label, moved element, changed copy, new field, new timing) before editing.
4. **Then change code** grounded in step 2, following `add-page-object` / `add-test`.
5. **Failure investigation** (from `pw-triager`): state the confirmed root cause from what you reproduced.

## Do not

- Conclude a root cause or "expected behavior" from code, comments or a prior summary alone.
- Confirm destructive actions just to see a dialog — open, snapshot, cancel.

Done when: the change (or diagnosis) cites concrete observations from this session.
