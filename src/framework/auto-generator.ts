import fs from "fs";
import path from "path";
import { parseMdFile } from "./md-parser";

export function generateAutoTestFile(baseName: string) {
  const mdData = parseMdFile(baseName);

  const outputDir = path.join("tests", "automated");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const autoTestPath = path.join(outputDir, `${baseName}.auto.test.ts`);
  // Build file content

  // Do not overwrite existing files (generation should be idempotent).
  if (fs.existsSync(autoTestPath)) {
    return;
  }

  const testCases = mdData.testCases
    .map((tc) => {
      const testTitle = tc.id ? `[${tc.id}-AUTO-UI] ${tc.title}` : tc.title;
      const testTitleLiteral = JSON.stringify(testTitle);
      const steps = tc.stepTitles
        .map((step) => {
          // Escape step title so the generated TS is always syntactically valid.
          const stepLiteral = JSON.stringify(step);
          return `    await test.step(${stepLiteral}, async () => {
      // TODO: Implement step logic
    });`;
        })
        .join("\n");
      return `

  test(${testTitleLiteral}, async ({ page }) => {
${steps}
  });`;
    })
    .join("\n\n");
  const suiteTitleLiteral = JSON.stringify(mdData.suiteTitle);
  const content = `import { test } from '@playwright/test';


test.describe(${suiteTitleLiteral}, () => {
${testCases}
});
`;

  // Write file to disk.
  fs.writeFileSync(autoTestPath, content);
  console.log(`✅  Generated: ${autoTestPath}`);
}
