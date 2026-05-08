import fs from "fs";

export interface ParsedTestCase {
  id: string; // TC-001
  title: string; // User login with valid credentials
  stepTitles: string[];
  stepCallKinds: StepCallKind[];
}

export type StepCallKind = "manualStep" | "test.step" | "playwrightTest.step";

export interface ParsedTest {
  suiteTitle: string;
  testCases: ParsedTestCase[];
}

/**
 * Parse TypeScript test file and extract test suite with test cases
 *
 * IDs are extracted "as is" from brackets without any modifications:
 * - test('[TC01-01] Title') → id: 'TC01-01'
 * - test('[TC01-01-MANUAL] Title') → id: 'TC01-01-MANUAL' (kept as is)
 * - test('[USER-LOGIN-E2E] Title') → id: 'USER-LOGIN-E2E' (kept as is)
 * - test('Title') → id: '' (no brackets, cannot determine id)
 * - test('TC01-01: Title') → id: '' (not in brackets format)
 *
 * Validator will handle suffix matching by comparing against MD ID as reference
 */
export function parseTestFile(filePath: string): ParsedTest {
  const content = fs.readFileSync(filePath, "utf-8");

  const describeMatch = content.match(
    /test\.describe\s*\(\s*['"`]([^'"`]+)['"`]/,
  );
  if (!describeMatch) {
    throw new Error(`No test.describe() found in ${filePath}`);
  }

  const suiteTitle = describeMatch[1];
  const testCases: ParsedTestCase[] = [];

  const testBlocks = content.split(/\n\s*test(?!\.describe)(?:\.\w+)?\s*\(/);

  for (let i = 1; i < testBlocks.length; i++) {
    const testBlock = testBlocks[i];

    const quoteMatch = testBlock.match(/^\s*(['"`])/);
    if (!quoteMatch) continue;

    const quote = quoteMatch[1];

    let endPos = quoteMatch.index! + quoteMatch[0].length;
    let escaped = false;

    while (endPos < testBlock.length) {
      const char = testBlock[endPos];

      if (escaped) {
        escaped = false;
        endPos++;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        endPos++;
        continue;
      }

      if (char === quote) {
        break;
      }

      endPos++;
    }

    let fullTitle = testBlock.slice(
      quoteMatch.index! + quoteMatch[0].length,
      endPos,
    );

    fullTitle = fullTitle
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\`/g, "`")
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");

    const bracketedIDMatch = fullTitle.match(/^\[([^\]]+)\]\s*(.+)$/);
    let testCaseID = "";
    let testCaseTitle = "";

    if (bracketedIDMatch) {
      testCaseID = bracketedIDMatch[1].trim();
      testCaseTitle = bracketedIDMatch[2].trim();
    } else {
      testCaseID = "";
      testCaseTitle = fullTitle.trim();
    }

    const stepPattern =
      /(manualStep|test\.step|playwrightTest\.step)\s*\(\s*(['"`])/g;
    const stepTitles: string[] = [];
    const stepCallKinds: StepCallKind[] = [];

    let match;
    while ((match = stepPattern.exec(testBlock)) !== null) {
      const callKind = match[1] as StepCallKind;
      const startPos = match.index + match[0].length - 1;
      const quote = match[2];

      let endPos = startPos + 1;
      let escaped = false;

      while (endPos < testBlock.length) {
        const char = testBlock[endPos];

        if (escaped) {
          escaped = false;
          endPos++;
          continue;
        }

        if (char === "\\") {
          escaped = true;
          endPos++;
          continue;
        }

        if (char === quote) {
          let stepTitle = testBlock.slice(startPos + 1, endPos);

          stepTitle = stepTitle
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\`/g, "`")
            .replace(/\\\\/g, "\\")
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t");

          stepTitles.push(stepTitle.trim());
          stepCallKinds.push(callKind);
          break;
        }

        endPos++;
      }
    }

    testCases.push({
      id: testCaseID,
      title: testCaseTitle,
      stepTitles,
      stepCallKinds,
    });
  }

  if (testCases.length === 0) {
    throw new Error(`No test cases found in ${filePath}`);
  }

  const idsWithBrackets = testCases
    .filter((tc) => tc.id !== "")
    .map((tc) => tc.id);
  const duplicateIDs = idsWithBrackets.filter(
    (id, index) => idsWithBrackets.indexOf(id) !== index,
  );

  if (duplicateIDs.length > 0) {
    const uniqueDuplicates = [...new Set(duplicateIDs)];
    throw new Error(
      `Duplicate test case IDs found in ${filePath}:\n` +
        uniqueDuplicates.map((id) => `  - [${id}]`).join("\n") +
        `\n\nEach test() must have a unique ID within the suite.`,
    );
  }

  return { suiteTitle, testCases };
}
