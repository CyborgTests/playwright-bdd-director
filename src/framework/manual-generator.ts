import fs from "fs";
import path from "path";
import { parseMdFile } from "./md-parser";

export function generateManualTestFile(baseName: string) {
  const mdData = parseMdFile(baseName);

  const outputDir = path.join("tests", "manual");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const manualTestPath = path.join(outputDir, `${baseName}.manual.test.ts`);
  // Build file content

  // Do not overwrite existing files (generation should be idempotent).
  if (fs.existsSync(manualTestPath)) {
    return;
  }

  const testCases = mdData.testCases
    .map((tc) => {
      const testTitle = tc.id ? `[${tc.id}-MANUAL] ${tc.title}` : tc.title;
      const testTitleLiteral = JSON.stringify(testTitle);
      const steps = tc.stepTitles
        .map((step) => {
          // Escape step title so the generated TS is always syntactically valid.
          const stepLiteral = JSON.stringify(step);
          return `    await manualStep(${stepLiteral});`;
        })
        .join("\n");
      return `

  test(${testTitleLiteral}, async ({ page, manualStep }) => {
${steps}
  });`;
    })
    .join("\n\n");
  const suiteTitleLiteral = JSON.stringify(mdData.suiteTitle);

  const content = `import test from '@cyborgtests/test';


test.describe(${suiteTitleLiteral}, () => {
${testCases}
});
`;

  // Write file to disk.
  fs.writeFileSync(manualTestPath, content);
  console.log(`[OK] Generated: ${manualTestPath}`);
}
