#!/usr/bin/env node
// Standalone migration CLI twin for CSF workbooks and assessments (v1 -> v2 schemaVersion: '2.0').
// Usage:
//   node tools/migrate.mjs samples/
//   node tools/migrate.mjs --check samples/
//   node tools/migrate.mjs --write-copy samples/some-file.json

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

function isRecord(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function sniffPayload(payload) {
  if (!isRecord(payload)) {
    return { fileType: 'unknown', version: 'unknown', hasLegacyGrain: false };
  }

  const isAssessment =
    Array.isArray(payload.answers) ||
    (isRecord(payload.meta) &&
      (typeof payload.meta.workbookAssessment === 'string' || isRecord(payload.meta.participant)));

  const isWorkbookAssessment =
    !isAssessment && isRecord(payload.workbook) && Array.isArray(payload.parties);

  const isWorkbook =
    !isAssessment &&
    !isWorkbookAssessment &&
    Array.isArray(payload.objectives) &&
    Array.isArray(payload.sealLevels);

  const fileType = isAssessment
    ? 'assessment'
    : isWorkbookAssessment
      ? 'workbook-assessment'
      : isWorkbook
        ? 'workbook'
        : 'unknown';

  let hasGrain = false;

  const checkQuestions = (objectives) => {
    if (!Array.isArray(objectives)) return;
    for (const obj of objectives) {
      if (isRecord(obj) && Array.isArray(obj.questions)) {
        for (const q of obj.questions) {
          if (isRecord(q)) {
            if ('grain' in q) hasGrain = true;
          }
        }
      }
    }
  };

  if (Array.isArray(payload.objectives)) {
    checkQuestions(payload.objectives);
  }
  if (isRecord(payload.workbook) && Array.isArray(payload.workbook.objectives)) {
    checkQuestions(payload.workbook.objectives);
  }

  if (Array.isArray(payload.ledger)) {
    for (const landing of payload.ledger) {
      if (isRecord(landing) && Array.isArray(landing.records)) {
        for (const rec of landing.records) {
          if (isRecord(rec) && isRecord(rec.decision)) {
            if (rec.decision.clash === 'scope' || rec.decision.clash === 'grain') {
              hasGrain = true;
            }
            if (isRecord(rec.decision.choice) && rec.decision.choice.kind === 'grain') {
              hasGrain = true;
            }
          }
        }
      }
    }
  }

  let version = 'unknown';
  if (fileType !== 'unknown') {
    if (payload.schemaVersion === '2.0' && !hasGrain) {
      version = '2.0';
    } else {
      version = '1.0';
    }
  }

  return {
    fileType,
    version,
    hasLegacyGrain: hasGrain || version === '1.0',
  };
}

export function migrateV1ToV2(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return { ok: false, error: `Invalid JSON: ${err.message}` };
    }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Input is not a valid JSON object' };
  }

  const sniff = sniffPayload(parsed);
  if (sniff.fileType === 'unknown') {
    return { ok: false, error: 'Unrecognized file format: expected a workbook or assessment JSON' };
  }

  const rawCloned = structuredClone(parsed);
  let questionsMigrated = 0;
  let clashesUpdated = 0;

  const migrateQuestions = (objectives) => {
    if (!Array.isArray(objectives)) return;
    for (const obj of objectives) {
      if (isRecord(obj) && Array.isArray(obj.questions)) {
        for (const q of obj.questions) {
          if (isRecord(q) && 'grain' in q) {
            q.scope = q.grain;
            delete q.grain;
            questionsMigrated++;
          }
        }
      }
    }
  };

  if (Array.isArray(rawCloned.objectives)) {
    migrateQuestions(rawCloned.objectives);
  }

  if (isRecord(rawCloned.workbook)) {
    if (Array.isArray(rawCloned.workbook.objectives)) {
      migrateQuestions(rawCloned.workbook.objectives);
    }
    rawCloned.workbook = {
      schemaVersion: '2.0',
      ...rawCloned.workbook,
    };
  }

  if (Array.isArray(rawCloned.ledger)) {
    for (const landing of rawCloned.ledger) {
      if (isRecord(landing) && Array.isArray(landing.records)) {
        for (const rec of landing.records) {
          if (isRecord(rec) && isRecord(rec.decision) && rec.decision.kind === 'resolved') {
            if (rec.decision.clash === 'scope') {
              rec.decision.clash = 'applicability';
              clashesUpdated++;
            } else if (rec.decision.clash === 'grain') {
              rec.decision.clash = 'depth';
              clashesUpdated++;
            }
            if (isRecord(rec.decision.choice) && rec.decision.choice.kind === 'grain') {
              rec.decision.choice.kind = 'depth';
              clashesUpdated++;
            }
          }
        }
      }
    }
  }

  const migrated = {
    schemaVersion: '2.0',
    ...rawCloned,
  };

  return {
    ok: true,
    migrated,
    stats: {
      detectedType: sniff.fileType,
      fromVersion: sniff.version,
      toVersion: '2.0',
      questionsMigrated,
      clashesUpdated,
    },
  };
}

function collectJsonFiles(targetPath) {
  if (!existsSync(targetPath)) return [];
  const stat = statSync(targetPath);
  if (stat.isFile()) {
    return extname(targetPath).toLowerCase() === '.json' ? [targetPath] : [];
  }
  if (!stat.isDirectory()) return [];

  const results = [];
  const entries = readdirSync(targetPath);
  for (const entry of entries) {
    const full = join(targetPath, entry);
    results.push(...collectJsonFiles(full));
  }
  return results;
}

function main() {
  const args = process.argv.slice(2);
  let checkOnly = false;
  let writeCopy = false;
  const paths = [];

  for (const arg of args) {
    if (arg === '--check') {
      checkOnly = true;
    } else if (arg === '--write-copy') {
      writeCopy = true;
    } else if (!arg.startsWith('-')) {
      paths.push(arg);
    }
  }

  if (paths.length === 0) {
    console.error('Usage: node tools/migrate.mjs [--check] [--write-copy] <file-or-dir>...');
    process.exit(1);
  }

  const allFiles = [];
  for (const p of paths) {
    allFiles.push(...collectJsonFiles(p));
  }

  if (allFiles.length === 0) {
    console.log('No JSON files found.');
    return;
  }

  let totalScanned = 0;
  let totalMigrated = 0;
  let totalQuestions = 0;
  let totalClashes = 0;
  let errors = 0;
  const filesNeedingMigration = [];

  for (const file of allFiles) {
    totalScanned++;
    let raw;
    try {
      raw = readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`Error reading ${file}: ${e.message}`);
      errors++;
      continue;
    }

    const res = migrateV1ToV2(raw);
    if (!res.ok) {
      continue;
    }

    const needsMigration =
      res.stats.fromVersion !== '2.0' ||
      res.stats.questionsMigrated > 0 ||
      res.stats.clashesUpdated > 0;

    if (needsMigration) {
      totalMigrated++;
      totalQuestions += res.stats.questionsMigrated;
      totalClashes += res.stats.clashesUpdated;
      filesNeedingMigration.push(file);

      if (checkOnly) {
        console.log(`[CHECK] ${file} needs migration (${res.stats.fromVersion} -> 2.0, ${res.stats.questionsMigrated} questions, ${res.stats.clashesUpdated} clashes)`);
      } else {
        const dest = writeCopy ? file.replace(/\.json$/, '.migrated.json') : file;
        try {
          writeFileSync(dest, JSON.stringify(res.migrated, null, 2) + '\n', 'utf8');
          console.log(`[MIGRATED] ${file} -> ${dest} (${res.stats.fromVersion} -> 2.0, ${res.stats.questionsMigrated} questions, ${res.stats.clashesUpdated} clashes)`);
        } catch (e) {
          console.error(`Error writing ${dest}: ${e.message}`);
          errors++;
        }
      }
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Files scanned:          ${totalScanned}`);
  console.log(`Files ${checkOnly ? 'needing migration' : 'migrated'}: ${totalMigrated}`);
  console.log(`Questions migrated:     ${totalQuestions}`);
  console.log(`Clashes updated:        ${totalClashes}`);
  if (errors > 0) {
    console.log(`Errors encountered:     ${errors}`);
  }

  if (checkOnly && totalMigrated > 0) {
    process.exit(1);
  }
  if (errors > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.mjs')) {
  main();
}
