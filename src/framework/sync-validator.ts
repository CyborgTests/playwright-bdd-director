import { ParsedMd, TestCase as MdTestCase } from "./md-parser";
import {
  ParsedTest,
  ParsedTestCase as TsTestCase,
  StepCallKind,
} from "./ts-parser";

export interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

function jsonStringify(value: string): string {
  return JSON.stringify(value);
}

function formatDifference(
  expectedMarkdown: string,
  actualTest: string,
): string {
  return `  - expected (MD):   ${jsonStringify(expectedMarkdown)}\n  + actual (Test):   ${jsonStringify(actualTest)}`;
}

function formatTestCaseLabel(
  testCase: { id: string; title: string },
  fallbackIndex?: number,
): string {
  if (testCase.id) return `[${testCase.id}] ${testCase.title}`;
  if (typeof fallbackIndex === "number")
    return `#${fallbackIndex + 1} ${testCase.title}`;
  return testCase.title;
}

function formatHeader(title: string): string {
  return `\n${title}\n${"-".repeat(title.length)}`;
}

function inferStepCallKindFromFilename(testFile: string): StepCallKind {
  const file = testFile.toLowerCase();
  if (file.includes(".manual.")) return "manualStep";
  if (file.includes(".auto.")) return "test.step";
  if (file.includes(".hybrid.")) return "test.step";
  return "test.step";
}

function generateStepFixCode(kind: StepCallKind, stepText: string): string {
  if (kind === "manualStep") {
    return `await manualStep(${jsonStringify(stepText)});`;
  }
  if (kind === "playwrightTest.step") {
    return `await playwrightTest.step(${jsonStringify(stepText)}, async () => {\n      // TODO: Implement step logic\n    });`;
  }
  return `await test.step(${jsonStringify(stepText)}, async () => {\n      // TODO: Implement step logic\n    });`;
}

/**
 * Check if test ID matches MD ID (with optional suffix in test ID)
 *
 * MD ID is the reference (etalon). Test ID can have suffixes.
 *
 * Examples:
 * - MD: 'TC01-01', Test: 'TC01-01' → ✅ exact match
 * - MD: 'TC01-01', Test: 'TC01-01-MANUAL' → ✅ test has suffix
 * - MD: 'TC01-01', Test: 'TC01-02' → ❌ different IDs
 * - MD: 'TC01', Test: 'TC01-01' → ❌ test is not a suffix variant
 */
function testIDsMatch(markdownID: string, testID: string): boolean {
  if (markdownID === testID) return true;
  if (testID.startsWith(markdownID + "-")) return true;
  return false;
}

/**
 * Extract ID and title from step text with brackets
 *
 * Examples:
 * - '[01-01-01] Navigate' → { id: '01-01-01', title: 'Navigate' }
 * - '[01-01-01-CHECK] Navigate' → { id: '01-01-01-CHECK', title: 'Navigate' }
 * - 'Navigate' → { id: '', title: 'Navigate' }
 */
function parseStepText(stepText: string): { id: string; title: string } {
  const match = stepText.match(/^\[([^\]]+)\]\s*(.*)/);
  if (match) {
    return { id: match[1].trim(), title: match[2].trim() };
  }
  return { id: "", title: stepText.trim() };
}

/**
 * Validate that test file matches MD file
 */
export function validateSync(
  testFile: string,
  markdownData: ParsedMd,
  typeScriptData: ParsedTest,
): ValidationResult {
  const errors: string[] = [];

  // 1. Validate suite title
  if (markdownData.suiteTitle !== typeScriptData.suiteTitle) {
    errors.push(
      `${formatHeader("Suite title mismatch")}\n${formatDifference(markdownData.suiteTitle, typeScriptData.suiteTitle)}\n\n  Fix: test.describe(${jsonStringify(markdownData.suiteTitle)}, ...)`,
    );
  }

  // 2. Validate test case count
  if (markdownData.testCases.length !== typeScriptData.testCases.length) {
    const diff =
      typeScriptData.testCases.length - markdownData.testCases.length;
    const action =
      diff > 0
        ? `Remove ${diff} extra test case(s) from test file`
        : `Add ${Math.abs(diff)} missing test case(s) to test file`;
    errors.push(
      `${formatHeader("Test case count mismatch")}\n  - expected (MD):   ${markdownData.testCases.length} test case(s)\n  + actual (Test):   ${typeScriptData.testCases.length} test case(s)\n\n  Fix: ${action}`,
    );
  }

  // 3. Validate each test case
  const maxCount = Math.max(
    markdownData.testCases.length,
    typeScriptData.testCases.length,
  );

  for (let i = 0; i < maxCount; i++) {
    const markdownTestCase = markdownData.testCases[i];
    const typeScriptTestCase = typeScriptData.testCases[i];

    if (!markdownTestCase) {
      const label = formatTestCaseLabel(typeScriptTestCase, i);
      errors.push(
        `${formatHeader("Extra test case in test file")}\n  Where: test case #${i + 1}\n  + actual (Test):   ${label}\n\n  Fix: Remove this test case or add it to MD`,
      );
      continue;
    }

    if (!typeScriptTestCase) {
      const label = formatTestCaseLabel(markdownTestCase, i);
      const testExample = markdownTestCase.id
        ? `test(${jsonStringify(`[${markdownTestCase.id}] ${markdownTestCase.title}`)}, ...)`
        : `test(${jsonStringify(markdownTestCase.title)}, ...)`;
      errors.push(
        `${formatHeader("Missing test case in test file")}\n  Where: test case #${i + 1}\n  - expected (MD):   ${label}\n\n  Fix: ${testExample}`,
      );
      continue;
    }

    // Validate test case ID
    if (
      (markdownTestCase.id && !typeScriptTestCase.id) ||
      (!markdownTestCase.id && typeScriptTestCase.id)
    ) {
      const markdownLabel = formatTestCaseLabel(markdownTestCase, i);
      const typeScriptLabel = formatTestCaseLabel(typeScriptTestCase, i);
      const fix = markdownTestCase.id
        ? `test(${jsonStringify(`[${markdownTestCase.id}] ${markdownTestCase.title}`)}, ...)`
        : `Remove [${typeScriptTestCase.id}] from test or add to MD: ## [${typeScriptTestCase.id}] ${markdownTestCase.title}`;
      errors.push(
        `${formatHeader("Test case ID inconsistency")}\n  Where: test case #${i + 1}\n${formatDifference(markdownLabel, typeScriptLabel)}\n\n  Problem: only one side has an ID.\n  Fix: ${fix}`,
      );
    }

    if (
      markdownTestCase.id &&
      typeScriptTestCase.id &&
      !testIDsMatch(markdownTestCase.id, typeScriptTestCase.id)
    ) {
      errors.push(
        `${formatHeader("Test case ID mismatch")}\n  Where: test case #${i + 1}\n  - expected (MD):   ${jsonStringify(markdownTestCase.id)}\n  + actual (Test):   ${jsonStringify(typeScriptTestCase.id)}\n\n  Rule: test ID must be ${jsonStringify(markdownTestCase.id)} or ${jsonStringify(`${markdownTestCase.id}-SUFFIX`)}\n  Fix: test(${jsonStringify(`[${markdownTestCase.id}] ${markdownTestCase.title}`)}, ...)`,
      );
    }

    // Validate test case title
    if (markdownTestCase.title !== typeScriptTestCase.title) {
      const label = markdownTestCase.id || `#${i + 1}`;
      const fixExample = markdownTestCase.id
        ? `test(${jsonStringify(`[${markdownTestCase.id}] ${markdownTestCase.title}`)}, ...)`
        : `test(${jsonStringify(markdownTestCase.title)}, ...)`;
      errors.push(
        `${formatHeader("Test case title mismatch")}\n  Where: test case ${label}\n${formatDifference(markdownTestCase.title, typeScriptTestCase.title)}\n\n  Fix: ${fixExample}`,
      );
    }

    // Validate step count
    if (
      markdownTestCase.stepTitles.length !==
      typeScriptTestCase.stepTitles.length
    ) {
      const label = markdownTestCase.id || markdownTestCase.title;
      const diff =
        typeScriptTestCase.stepTitles.length -
        markdownTestCase.stepTitles.length;
      const action =
        diff > 0
          ? `Remove ${diff} extra step(s)`
          : `Add ${Math.abs(diff)} missing step(s)`;
      errors.push(
        `${formatHeader("Step count mismatch")}\n  Where: test case ${label}\n  - expected (MD):   ${markdownTestCase.stepTitles.length} step(s)\n  + actual (Test):   ${typeScriptTestCase.stepTitles.length} step(s)\n\n  Fix: ${action}`,
      );
    }

    // Validate step titles
    const maxSteps = Math.max(
      markdownTestCase.stepTitles.length,
      typeScriptTestCase.stepTitles.length,
    );
    const stepMismatches: string[] = [];

    for (let j = 0; j < maxSteps; j++) {
      const markdownStepText = markdownTestCase.stepTitles[j];
      const typeScriptStepText = typeScriptTestCase.stepTitles[j];

      if (!markdownStepText || !typeScriptStepText) {
        const fix = !markdownStepText
          ? `Remove extra step from test`
          : `Add missing step: ${generateStepFixCode(inferStepCallKindFromFilename(testFile), markdownStepText)}`;
        stepMismatches.push(
          `  Step #${j + 1}:\n  - expected (MD):   ${markdownStepText ? jsonStringify(markdownStepText) : "(missing)"}\n  + actual (Test):   ${typeScriptStepText ? jsonStringify(typeScriptStepText) : "(missing)"}\n  Fix: ${fix}`,
        );
        continue;
      }

      const markdownStep = parseStepText(markdownStepText);
      const typeScriptStep = parseStepText(typeScriptStepText);

      if (
        (markdownStep.id && !typeScriptStep.id) ||
        (!markdownStep.id && typeScriptStep.id)
      ) {
        const callKind =
          typeScriptTestCase.stepCallKinds[j] ??
          inferStepCallKindFromFilename(testFile);
        const fix = markdownStep.id
          ? generateStepFixCode(callKind, markdownStepText)
          : `Remove [${typeScriptStep.id}] from step or add to MD: ### ${typeScriptStepText}`;
        stepMismatches.push(
          `  Step #${j + 1} ID inconsistency:\n${formatDifference(markdownStepText, typeScriptStepText)}\n\n  Problem: only one side has an ID.\n  Fix: ${fix}`,
        );
        continue;
      }

      const idsValid =
        !markdownStep.id ||
        !typeScriptStep.id ||
        testIDsMatch(markdownStep.id, typeScriptStep.id);
      const titlesValid = markdownStep.title === typeScriptStep.title;

      if (!idsValid || !titlesValid) {
        const problems: string[] = [];
        if (!idsValid)
          problems.push(
            `ID must be ${jsonStringify(markdownStep.id)} or ${jsonStringify(`${markdownStep.id}-SUFFIX`)}`,
          );
        if (!titlesValid) problems.push("Title must match exactly");
        const callKind =
          typeScriptTestCase.stepCallKinds[j] ??
          inferStepCallKindFromFilename(testFile);
        stepMismatches.push(
          `  Step #${j + 1} mismatch:\n${formatDifference(markdownStepText, typeScriptStepText)}\n\n  Problem: ${problems.join("; ")}\n  Fix: ${generateStepFixCode(callKind, markdownStepText)}`,
        );
      }
    }

    if (stepMismatches.length > 0) {
      const label = markdownTestCase.id || markdownTestCase.title;
      errors.push(
        `${formatHeader("Step mismatch")}\n  Where: test case ${label}\n\n${stepMismatches.join("\n\n")}`,
      );
    }
  }

  return {
    file: testFile,
    valid: errors.length === 0,
    errors,
  };
}
