import { glob } from "glob";
import path from "path";
import { parseMdFile } from "../src/framework/md-parser";
import { parseTestFile } from "../src/framework/ts-parser";
import {
  validateSync,
  ValidationResult,
} from "../src/framework/sync-validator";
import { generateManualTestFile } from "../src/framework/manual-generator";
import { generateAutoTestFile } from "../src/framework/auto-generator";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getMarkdownBaseName(mdFilePath: string): string {
  return path.basename(mdFilePath, ".md");
}

try {
  main();
} catch (error: unknown) {
  console.error("[ERROR]", getErrorMessage(error));
  process.exit(1);
}

function main() {
  const markdownFiles = glob.sync("test-cases/**/*.md");

  if (markdownFiles.length === 0) {
    console.log("[WARN] No MD test files found");
    process.exit(0);
  }

  const markdownByBaseName = new Map<string, string[]>();
  for (const markdownFile of markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile);
    const existing = markdownByBaseName.get(baseName) ?? [];
    existing.push(markdownFile);
    markdownByBaseName.set(baseName, existing);
  }

  const duplicateBaseNames = [...markdownByBaseName.entries()].filter(
    ([, files]) => files.length > 1,
  );
  if (duplicateBaseNames.length > 0) {
    const details = duplicateBaseNames
      .map(
        ([baseName, files]) =>
          `- ${baseName}.md:\n${files.map((f) => `  ${f}`).join("\n")}`,
      )
      .join("\n");
    throw new Error(
      `Duplicate markdown base names are not supported.\n${details}\n\nUse unique MD filenames to avoid ambiguous test-to-MD mapping.`,
    );
  }

  const markdownByBaseNameUnique = new Map<string, string>(
    [...markdownByBaseName.entries()].map(([baseName, files]) => [
      baseName,
      files[0],
    ]),
  );

  const isMatchingTestFile = (
    testFilePath: string,
    baseName: string,
    kind: "auto" | "manual",
  ) => {
    const fileName = path.basename(testFilePath);
    const parts = fileName.split(".");

    if (parts[0] !== baseName) return false;
    if (parts.at(-1) !== "ts") return false;
    if (!parts.includes("test")) return false;
    return parts.includes(kind);
  };

  for (const markdownFile of markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile);
    const candidates = glob.sync(`tests/**/${baseName}*.ts`);

    const manualTestFiles = candidates.filter((f) =>
      isMatchingTestFile(f, baseName, "manual"),
    );
    const autoTestFiles = candidates.filter((f) =>
      isMatchingTestFile(f, baseName, "auto"),
    );

    if (manualTestFiles.length === 0) {
      generateManualTestFile(baseName);
    }

    if (autoTestFiles.length === 0) {
      generateAutoTestFile(baseName);
    }
  }

  const testFiles = glob.sync("tests/**/*.ts", { nodir: true });
  const results: ValidationResult[] = [];

  for (const testFile of testFiles) {
    const fileName = path.basename(testFile);
    const baseName = fileName.split(".")[0];

    const markdownFile = markdownByBaseNameUnique.get(baseName);
    if (!markdownFile) {
      continue;
    }

    try {
      const markdownData = parseMdFile(markdownFile);
      const typeScriptData = parseTestFile(testFile);
      const result = validateSync(testFile, markdownData, typeScriptData);
      results.push(result);
    } catch (error: unknown) {
      results.push({
        file: testFile,
        valid: false,
        errors: [getErrorMessage(error)],
      });
    }
  }

  const failedResults = results.filter((result) => !result.valid);

  if (failedResults.length > 0) {
    console.log(`[ERROR] Failed: ${failedResults.length} file(s)\n`);
    for (const result of failedResults) {
      console.log("-".repeat(64));
      console.log(`❌  ${path.basename(result.file)}`);
      console.log("-".repeat(64));
      console.log(`File: ${result.file}`);
      console.log();
      result.errors.forEach((err) => console.log(err));
      console.log();
    }

    console.log("-".repeat(64));
    console.log("\n💡  Fix: Update test files to match MD exactly\n");
    process.exit(1);
  }

  console.log(`✅  All ${results.length} file(s) are in sync with MD!\n`);
  process.exit(0);
}
