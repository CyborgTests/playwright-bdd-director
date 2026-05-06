#!/usr/bin/env node
import { glob } from "glob";
import path from "path";
import { parseMdFile } from "../src/framework/md-parser";
import { parseTestFile } from "../src/framework/ts-parser";
import {
  validateSync,
  ValidationResult,
} from "../src/framework/sync-validator";

function main() {
  console.log("🔍 Validating MD ↔ Test sync...\n");

  // 1. Find all files in tests/ directory
  // No extension filtering - language agnostic
  // Assumes tests/ contains ONLY test files (no helpers/utils)
  const testFiles = glob.sync("tests/**/*", { nodir: true });

  if (testFiles.length === 0) {
    console.log("⚠️ No test files found");
    process.exit(0);
  }

  const results: ValidationResult[] = [];

  // 2. Validate each file
  for (const testFile of testFiles) {
    // Extract base name: take everything before first dot
    // auth.test.ts → auth
    // auth.something.test.ts → auth
    // auth.something.else.test.ts → auth

    const baseName = path.basename(testFile).split(".")[0];

    try {
      // Parse MD
      const mdData = parseMdFile(baseName);

      // Parse TS
      const tsData = parseTestFile(testFile);

      // Validate
      const result = validateSync(testFile, mdData, tsData);
      results.push(result);
    } catch (error: any) {
      results.push({
        file: testFile,
        valid: false,
        errors: [error.message],
      });
    }
  }

  // 3. Print report
  const passed = results.filter((r) => r.valid);
  const failed = results.filter((r) => !r.valid);

  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} file(s)\n`);

    for (const result of failed) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`❌ ${path.basename(result.file)}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`File: ${result.file}`);
      console.log();
      result.errors.forEach((err) => console.log(err));
      console.log();
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n💡 Fix: Update test files to match MD exactly\n`);

    process.exit(1);
  }

  console.log(`✅ All ${results.length} file(s) are in sync with MD!\n`);
  process.exit(0);
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("❌ Error:", message);
  process.exit(1);
}
