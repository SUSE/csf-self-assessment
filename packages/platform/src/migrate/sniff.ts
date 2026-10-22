import type { DetectedFileType, SchemaVersion, SniffResult } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sniffPayload(payload: unknown): SniffResult {
  if (!isRecord(payload)) {
    return { fileType: 'unknown', version: 'unknown', hasLegacyGrain: false };
  }

  // Detect file type
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

  const fileType: DetectedFileType = isAssessment
    ? 'assessment'
    : isWorkbookAssessment
      ? 'workbook-assessment'
      : isWorkbook
        ? 'workbook'
        : 'unknown';

  let hasGrain = false;

  const checkQuestions = (objectives: unknown) => {
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

  let version: SchemaVersion = 'unknown';
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
