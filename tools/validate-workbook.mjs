#!/usr/bin/env node
// Standalone validator CLI for CSF Workbooks (v2.0).
// Usage:
//   node tools/validate-workbook.mjs path/to/workbook.json
//   node tools/validate-workbook.mjs --json path/to/workbook.json
//   node tools/validate-workbook.mjs samples/learn-basics/workbook.json

import './ts-loader.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function validateWorkbook(input) {
  let data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (err) {
      return {
        ok: false,
        issues: [
          {
            kind: 'json',
            path: '',
            message: `JSON syntax error: ${err.message}`,
          },
        ],
      };
    }
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      ok: false,
      issues: [
        {
          kind: 'schema',
          path: '',
          message: 'Workbook root must be a JSON object.',
        },
      ],
    };
  }

  const { WorkbookSchema } = await import('../packages/platform/src/schema/workbook.ts');
  const { WORKBOOK_RULES } = await import('../packages/platform/src/schema/workbook-rules.ts');

  const baseSchema = WorkbookSchema._def.schema;
  const baseResult = baseSchema.safeParse(data);

  const issues = [];

  if (!baseResult.success) {
    for (const issue of baseResult.error.issues) {
      issues.push({
        kind: 'schema',
        path: issue.path.join('.'),
        message: issue.message,
      });
    }
    return { ok: false, issues };
  }

  const wb = baseResult.data;

  // Run all cross-record relational invariants R1–R23
  for (const rule of WORKBOOK_RULES) {
    rule.check(wb, {
      addIssue(issue) {
        issues.push({
          kind: 'rule',
          ruleId: rule.id,
          ruleName: rule.name,
          path: issue.path.join('.'),
          message: issue.message,
        });
      },
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const questionsCount = wb.objectives.reduce((sum, o) => sum + o.questions.length, 0);

  return {
    ok: true,
    issues: [],
    summary: {
      id: wb.meta.id,
      title: wb.meta.title,
      version: wb.meta.version,
      objectives: wb.objectives.length,
      questions: questionsCount,
      dimensions: wb.dimensions.length,
      roles: wb.roles.length,
      parties: wb.parties.length,
      testEstates: wb.testEstates.length,
      recommendations: wb.recommendations.length,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  let jsonOutput = false;
  let quiet = false;
  const files = [];

  for (const arg of args) {
    if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--quiet') {
      quiet = true;
    } else if (arg === '-' || !arg.startsWith('-')) {
      files.push(arg);
    }
  }

  if (files.length === 0) {
    console.error('Usage: node tools/validate-workbook.mjs [--json] [--quiet] <path-to-workbook.json | ->...');
    process.exit(1);
  }

  let anyFailed = false;
  const results = [];

  for (const file of files) {
    const isStdin = file === '-';
    const label = isStdin ? 'stdin' : file;
    let content;

    if (isStdin) {
      try {
        content = readFileSync(0, 'utf8');
      } catch (err) {
        anyFailed = true;
        const res = {
          file: label,
          ok: false,
          issues: [{ kind: 'io', path: '', message: `Could not read stdin: ${err.message}` }],
        };
        results.push(res);
        if (!jsonOutput) {
          console.error(`✗ ${label} — could not read stdin: ${err.message}`);
        }
        continue;
      }
    } else {
      if (!existsSync(file)) {
        anyFailed = true;
        const res = {
          file: label,
          ok: false,
          issues: [{ kind: 'io', path: '', message: `File not found: ${file}` }],
        };
        results.push(res);
        if (!jsonOutput) {
          console.error(`✗ ${label} — file not found`);
        }
        continue;
      }

      try {
        content = readFileSync(file, 'utf8');
      } catch (err) {
        anyFailed = true;
        const res = {
          file: label,
          ok: false,
          issues: [{ kind: 'io', path: '', message: `Could not read file: ${err.message}` }],
        };
        results.push(res);
        if (!jsonOutput) {
          console.error(`✗ ${label} — could not read file: ${err.message}`);
        }
        continue;
      }
    }

    const res = await validateWorkbook(content);
    results.push({ file: label, ...res });

    if (!res.ok) {
      anyFailed = true;
      if (!jsonOutput) {
        console.error(`\n✗ ${label} — FAILED validation with ${res.issues.length} issue(s):`);
        res.issues.forEach((issue, idx) => {
          const prefix = issue.ruleId ? `[${issue.ruleId}: ${issue.ruleName}]` : `[${issue.kind}]`;
          const location = issue.path ? ` path: ${issue.path}` : '';
          console.error(`  ${idx + 1}. ${prefix}${location}`);
          console.error(`     ${issue.message}`);
        });
      }
    } else if (!quiet && !jsonOutput) {
      const s = res.summary;
      console.log(`\n✓ ${label} — valid CSF Workbook (v2.0)`);
      console.log(`  "${s.title}" (id: ${s.id}, v${s.version})`);
      console.log(
        `  ${s.objectives} objectives | ${s.questions} questions | ${s.dimensions} dimensions | ${s.roles} roles | ${s.parties} parties | ${s.testEstates} test estates | ${s.recommendations} recommendations`,
      );
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  }

  if (anyFailed) {
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('Validation error:', err);
    process.exit(1);
  });
}
