import type { EngineResult, Party, Workbook } from '@csf/platform';
import type { InspectSubject } from '@csf/platform/ui/inspector';

// The estate reading every QA inspection is given — the same triple the tiles
// read, plus the jump into the editor.
export type QaReading = {
  result: EngineResult | null;
  workbook: Workbook | null;
  parties: Party[];
  onOpenQuestion: (id: string) => void;
};

// The subject kinds read against the test estate on the canvas: every rail view
// whose props are a QaReading plus the subject's own fields.
export type QaSubjectKind =
  | 'open-units'
  | 'heat-mark'
  | 'estate-spoke'
  | 'staircase-rung'
  | 'dont-know'
  | 'consistency-check'
  | 'contributor'
  | 'provenance-fact'
  | 'evidence'
  | 'recommendation';

export type QaSubject = Extract<InspectSubject, { kind: QaSubjectKind }>;
