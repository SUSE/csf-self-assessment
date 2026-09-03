import { WorkbookSchema } from '../schema';
import type { Answer, Seal, Target, Workbook } from '../schema';
import { AUTHOR_QA_PROVENANCE, answerFor, assessmentOf } from '../assessment';
import { evaluate } from './index';

// Loose builders: plain objects go through WorkbookSchema.parse so any shape error
// surfaces at fixture-build time and the result is a real Workbook.
export const FULL = [0, 1, 2, 3, 4];

export const rungs = (seals: number[]) =>
  seals.map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal }));

// A(), dim() and the tests name a question by id and a rung by SEAL, so a fixture
// id must author one ladder across every workbook here — this registry enforces it.
const LADDERS = new Map<string, number[]>();

const ladderFor = (id: string, seals: number[]): number[] => {
  const seen = LADDERS.get(id);
  if (seen && seen.join() !== seals.join()) throw new Error(`fixture question ${id} authors two different ladders`);
  LADDERS.set(id, seals);
  return seals;
};

const rungIdFor = (id: string, seal: Seal): string => {
  const seals = LADDERS.get(id);
  if (!seals) throw new Error(`no fixture question ${id}`);
  const i = seals.indexOf(seal);
  if (i < 0) throw new Error(`no rung at SEAL ${seal} on ${id}`);
  return `choice-${i + 1}`;
};

/** An assessment-axis party question. */
export const q = (id: string, materiality: string, seals: number[]) => ({
  id,
  grain: 'party',
  text: id,
  why: 'why',
  role: 'ARCH',
  defaultMateriality: materiality,
  ladder: rungs(ladderFor(id, seals)),
});

/** A dimension question over the named dimensions. */
export const dimensionQ = (id: string, appliesTo: string[], materiality = 'material') => ({
  id,
  grain: 'dimension',
  appliesTo,
  text: id,
  why: 'why',
  role: 'ARCH',
  defaultMateriality: materiality,
  ladder: rungs(ladderFor(id, FULL)),
});

export const obj = (id: string, weight: number, questions: object[]) => ({ id, name: id, weight, questions });

export function wb(objectives: object[], dimensions: object[] = []): Workbook {
  return WorkbookSchema.parse({
    meta: { id: 'u', version: '1', title: 'U' },
    sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
    dimensions,
    roles: [
      { id: 'ARCH', name: 'Architecture' },
      { id: 'LEG', name: 'Legal' },
    ],
    parties: [
      { id: 'institution', name: 'Institution', kind: 'assessed' },
      { id: 'primary-provider', name: 'Primary provider', kind: 'third-party' },
      { id: 'subprocessor', name: 'Subprocessor', kind: 'third-party' },
      { id: 'supplier', name: 'Supplier', kind: 'third-party' },
    ],
    objectives,
  });
}

/** Single objective at weight 100: two material questions / one informational / one n/a-materiality. */
export const MAT2 = wb([obj('O', 100, [q('q1', 'material', FULL), q('q2', 'material', FULL)])]);
export const INFO = wb([obj('O', 100, [q('q1', 'material', FULL), q('q2', 'informational', FULL)])]);
export const NAM = wb([obj('O', 100, [q('q1', 'material', FULL), q('q2', 'na', FULL)])]);
export const RANK = wb([obj('O', 100, [q('q1', 'material', FULL), q('q2', 'ranking', FULL)])]);
export const RANKONLY = wb([obj('O', 100, [q('q1', 'ranking', FULL)])]);
export const SPARSE = wb([obj('O', 100, [q('sparse.q1', 'material', [0, 1, 3])])]);

/** Two objectives at 75 / 25, for weighting and renormalisation. */
export const WB2 = wb([obj('A', 75, [q('A.q1', 'material', FULL)]), obj('B', 25, [q('B.q1', 'material', FULL)])]);
export const WB3 = wb([obj('A', 75, [q('A.q1', 'material', FULL)]), obj('B', 25, [q('B.q1', 'na', FULL)])]);

export const T: Target = { kind: 'assessment' };
export const G = { groupId: 'g1', placement: 'individual' as const };

export const A = (id: string, seal: Seal): Answer =>
  answerFor(id, T, { state: 'answered', rungId: rungIdFor(id, seal) }, G);
export const dunno = (id: string): Answer => answerFor(id, T, { state: 'dont-know' }, G);
export const na = (id: string): Answer => answerFor(id, T, { state: 'na' }, G);

export const runOn = (workbook: Workbook, answers: Answer[]) =>
  evaluate(workbook, assessmentOf(workbook, 'u', [], answers, AUTHOR_QA_PROVENANCE));

/**
 * One dimension question over compute / network / edge, full ladders. Criticality is
 * the firm workbook flag (delivery-S2): compute + network critical, edge in scope but not.
 */
export const DW = wb([obj('O', 100, [dimensionQ('O.d1', ['compute', 'network', 'edge'])])], [
  { id: 'compute', name: 'Compute', critical: true },
  { id: 'network', name: 'Network', critical: true },
  { id: 'edge', name: 'Edge', critical: false },
]);

export const dim = (dimension: string, seal: Seal, placement: 'group' | 'individual' = 'group'): Answer =>
  answerFor(
    'O.d1',
    { kind: 'dimension', dimension },
    { state: 'answered', rungId: rungIdFor('O.d1', seal) },
    { groupId: 'g1', placement },
  );

export const dimDunno = (dimension: string): Answer =>
  answerFor('O.d1', { kind: 'dimension', dimension }, { state: 'dont-know' }, G);

export const runD = (answers: Answer[]) => runOn(DW, answers);
