import { sniffPayload } from './sniff';
import type { MigrationResult } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrateV1ToV2(input: unknown): MigrationResult {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return { ok: false, error: `Invalid JSON: ${(err as Error).message}` };
    }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Input is not a valid JSON object' };
  }

  const sniff = sniffPayload(parsed);
  if (sniff.fileType === 'unknown') {
    return { ok: false, error: 'Unrecognized file format: expected a workbook or assessment JSON' };
  }

  const rawCloned = structuredClone(parsed) as Record<string, unknown>;
  let questionsMigrated = 0;
  let clashesUpdated = 0;

  const migrateQuestions = (objectives: unknown) => {
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
    // Also ensure embedded workbook carries schemaVersion
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

  // Ensure root-level schemaVersion is '2.0' (placed at top)
  const migrated: Record<string, unknown> = {
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
