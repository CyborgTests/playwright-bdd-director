---
name: pw-triager
description: Use to diagnose a failing or flaky Playwright test — reads traces, screenshots, error context and the test/Page Object code to find the root cause before any fix.
---

# Playwright Triager

## Before you start

- Diagnosis first: don't edit code or re-run blindly hoping for green.
- Every conclusion cites evidence (trace action, screenshot, log line, live reproduction).

## Steps

1. **Collect failures**: console output, `test-results/artifacts/**` (trace.zip, screenshots, `error-context.md`), `npm run review`.
2. **Read the evidence**: `npx playwright show-trace <trace.zip>` — the failing action, its locator, the DOM snapshot before it, network calls around it. Read the failing test and the Page Object / client methods it calls.
3. **Classify**:
   - timing — missing web-first assertion or response sync, sleep-based wait;
   - stale locator — UI changed (renamed label, moved element, new wrapper);
   - test data — collision, missing cleanup, dependence on another test's data;
   - environment — site down, ads/overlays (see ad blocking in `base.fixture.ts`), network;
   - app regression — assertion is right, the app changed;
   - framework — `dress`/sync failure or generated code issue → `md-sync-checker` / `framework-change`.
4. **Still unclear** → reproduce live with `ui-explorer`; a diagnosis without trace evidence or live reproduction is unverified.
5. **Recommend**: root cause, `file:line`, evidence, the minimal fix — never weakening assertions. App bug → `test.fixme()` + `FIXME:`.

Done when: a root cause backed by evidence and a concrete fix (or fixme decision) is reported.
