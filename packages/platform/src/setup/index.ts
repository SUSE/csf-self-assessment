import type { Party, Workbook, WorkbookAssessment } from '../schema';
import type { IntegrityResult } from '../assessment';

// Pure construction and integrity of workbook-assessments (delivery §2.2 / §4.1):
// a workbook prepared for one named estate with its seeded providers, the
// workbook embedded verbatim. The app shell stamps `id` and `createdAt` (the pure
// core never reads the clock).
export type WorkbookAssessmentParts = {
  workbook: Workbook;
  estate: string;
  parties: Party[];
  id: string;
  createdAt: string;
};

export function workbookAssessmentOf(parts: WorkbookAssessmentParts): WorkbookAssessment {
  return {
    meta: {
      id: parts.id,
      estate: parts.estate,
      workbookId: parts.workbook.meta.id,
      workbookVersion: parts.workbook.meta.version,
      createdAt: parts.createdAt,
    },
    workbook: parts.workbook,
    parties: parts.parties,
  };
}

// Version-match guard (delivery §2.2.2): a workbook-assessment's declared workbook
// identity must equal its embedded workbook's identity. A mismatch is refused.
export function checkWorkbookAssessmentIntegrity(wa: WorkbookAssessment): IntegrityResult {
  const declared = { id: wa.meta.workbookId, version: wa.meta.workbookVersion };
  const embedded = { id: wa.workbook.meta.id, version: wa.workbook.meta.version };
  if (declared.id !== embedded.id || declared.version !== embedded.version) {
    return { ok: false, declared, embedded };
  }
  return { ok: true };
}
