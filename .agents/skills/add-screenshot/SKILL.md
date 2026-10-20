---
name: add-screenshot
description: Use when considering a screenshot in an automated test — decide if one is justified, pick visual regression vs report evidence, mask dynamic regions, name and review baselines.
---

# Add a Screenshot to a Test

## Before you start

- Justify it: if a state/text/ARIA/count assertion proves the same thing, don't add a screenshot. Valid cases: layout, theming, charts/SVG, i18n rendering, rich text, print/export layout.
- Fewest shots that prove the visual claim — never one per `test.step`.

## Steps

1. **Pick the mechanism**:
   - Visual regression (future runs should flag change) → `await expect.soft(page).toHaveScreenshot('<name>.png', { fullPage, mask: [...], maxDiffPixelRatio: 0.03 })`; `expect.soft` keeps it off the functional gate.
   - Evidence only (picture in the report, no baseline) → `logFile` from `@/test-utils/logger` with `await page.screenshot()` output.
2. **Settle first**: place it after the web-first assertion that proves the state, inside its own `test.step('Screenshot …')`. No sleeps before the shot.
3. **Mask** every dynamic region: timestamps, generated names/emails, counters, ads, video. Expose mask locators from the Page Object (`get…Mask(): Locator[]`).
4. **Name**: `<suite>-<state>.png` (e.g. `auth-signup-form-error.png`).
5. **Baseline** (regression only): `npx playwright test <file> --update-snapshots`, then open every produced PNG — confirm the intended state and no leaked dynamic content. Baselines are per-OS (`-win32`, `-linux`); commit only reviewed ones.
6. **Verify**: re-run without `--update-snapshots`; it passes.

Done when: the screenshot is justified, masked, named, and its reviewed baseline passes on re-run.
