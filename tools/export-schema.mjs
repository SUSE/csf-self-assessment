#!/usr/bin/env node
// Generates standard JSON Schema (Draft 7) from packages/platform/src/schema/workbook.ts.
// Usage:
//   node tools/export-schema.mjs            # Writes tools/csf-workbook.schema.json
//   node tools/export-schema.mjs --check    # Verifies schema is up to date (CI)
//   node tools/export-schema.mjs --out <file>

import './ts-loader.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';

const DEFAULT_OUT = fileURLToPath(new URL('./csf-workbook.schema.json', import.meta.url));

export async function generateWorkbookSchema() {
  const { WorkbookSchema } = await import('../packages/platform/src/schema/workbook.ts');
  const raw = zodToJsonSchema(WorkbookSchema, {
    target: 'jsonSchema7',
  });

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'CSFWorkbook',
    description: 'Cloud Sovereignty Framework (CSF) Self-Assessment Workbook Schema (v2.0)',
    ...raw,
  };
}

export function serializeSchema(schema) {
  return JSON.stringify(schema, null, 2) + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const outIndex = args.indexOf('--out');
  const outPath = outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : DEFAULT_OUT;

  const schema = await generateWorkbookSchema();
  const serialized = serializeSchema(schema);

  if (checkOnly) {
    if (!existsSync(outPath)) {
      console.error(`✗ Schema check failed: ${outPath} does not exist. Run "node tools/export-schema.mjs" to generate it.`);
      process.exit(1);
    }
    const current = readFileSync(outPath, 'utf8');
    if (current !== serialized) {
      console.error(`✗ Schema check failed: ${outPath} is out of date. Run "node tools/export-schema.mjs" to update it.`);
      process.exit(1);
    }
    console.log(`✓ Schema check passed: ${outPath} is up to date.`);
    return;
  }

  writeFileSync(outPath, serialized, 'utf8');
  console.log(`✓ Exported CSF workbook JSON schema to ${outPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('export-schema failed:', err);
    process.exit(1);
  });
}
