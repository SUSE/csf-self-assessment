import { describe, expect, it } from 'vitest';
import type { Answer, AnswerLedgerRecord, Landing, Seal } from '../schema';
import { answerFor, assessmentOf } from '../assessment';
import { snapshotOf } from '../merge/snapshot';
import { evaluate } from './index';
import { G, MAT2, T, dimensionQ, obj, q, runOn, wb, FULL } from './fixtures';

// A dimension question over compute (critical, splittable) and network (in scope, NOT
// critical), plus a material assessment-axis question — so gating (compute, O.e1) and
// non-gating (network) answers coexist.
const CRED_WB = wb([obj('O', 100, [dimensionQ('O.d1', ['compute', 'network']), q('O.e1', 'material', FULL)])], [
  { id: 'compute', name: 'Compute', strata: ['software', 'chips'], critical: true },
  { id: 'network', name: 'Network', critical: false },
]);

// Every ladder here is FULL, so SEAL n is the (n + 1)th rung.
const dimA = (dimension: string, seal: Seal, placement: 'group' | 'individual', evidence?: string): Answer =>
  answerFor(
    'O.d1',
    { kind: 'dimension', dimension },
    evidence === undefined
      ? { state: 'answered', rungId: `choice-${seal + 1}` }
      : { state: 'answered', rungId: `choice-${seal + 1}`, evidence },
    { groupId: 'g1', placement },
  );

const runCred = (answers: Answer[]) => runOn(CRED_WB, answers);

const GATING_AND_NOT = [
  dimA('compute', 2, 'group', 'contract §12 escrow'),
  dimA('network', 3, 'individual'),
  answerFor('O.e1', T, { state: 'answered', rungId: 'choice-5' }, G),
];

describe('evaluate() — gating answers carry their evidence (S8)', () => {
  it('a staircase binding names its evidence', () => {
    expect(runCred(GATING_AND_NOT).staircase).toEqual([
      {
        floor: 2,
        unlocksTo: 4,
        binding: [
          {
            questionId: 'O.d1',
            objectiveId: 'O',
            role: 'ARCH',
            dimension: 'compute',
            stratum: null,
            party: null,
            seal: 2,
            evidence: 'contract §12 escrow',
          },
        ],
      },
    ]);
  });

  it('a stratum refinement gates with its own evidence', () => {
    const r = runCred([
      answerFor(
        'O.d1',
        { kind: 'dimension-stratum', dimension: 'compute', stratum: 'software' },
        { state: 'answered', rungId: 'choice-2', evidence: 'sbom attestation' },
        { groupId: 'g2', placement: 'individual' },
      ),
      dimA('network', 3, 'group'),
    ]);
    expect(r.staircase[0].binding).toEqual([
      {
        questionId: 'O.d1',
        objectiveId: 'O',
        role: 'ARCH',
        dimension: 'compute',
        stratum: 'software',
        party: null,
        seal: 1,
        evidence: 'sbom attestation',
      },
    ]);
  });

  it("per-objective don't-know density counts every in-scope don't-know, not just gating ones", () => {
    const r = runCred([
      answerFor('O.d1', { kind: 'dimension', dimension: 'network' }, { state: 'dont-know' }, G),
      dimA('compute', 3, 'group'),
    ]);
    expect(r.objectives[0].dontKnowCount).toBe(1); // network is non-critical — no floor hole, still density
    expect(r.overall.unknowns).toEqual([]);
  });
});

describe('evaluate() — the credibility block (S8)', () => {
  it('sweptRatio is the group-placed share of in-scope answered answers; coverage counts gating answers', () => {
    const r = runCred(GATING_AND_NOT);
    expect(r.credibility.sweptRatio).toBeCloseTo(1 / 3, 4);
    expect(r.credibility.evidenceCoverage).toEqual({ evidenced: 1, total: 2 }); // compute + O.e1 gate; network does not
    expect(r.credibility.dontKnowCount).toBe(0);
  });

  it('an empty assessment has a null swept ratio and 0-of-0 coverage — never NaN', () => {
    const r = runCred([]);
    expect(r.credibility.sweptRatio).toBeNull();
    expect(r.credibility.evidenceCoverage).toEqual({ evidenced: 0, total: 0 });
  });

  it('a non-critical dimension answer sweeps and counts but never gates', () => {
    const r = runCred([dimA('network', 0, 'group'), dimA('compute', 3, 'individual', 'audit report 2026')]);
    expect(r.credibility.sweptRatio).toBe(0.5); // network group, compute individual → 1 of 2
    expect(r.credibility.evidenceCoverage).toEqual({ evidenced: 1, total: 1 }); // only compute gates
    expect(r.overall.floor).toBe(3); // compute gates; network@0 non-critical does not
  });
});

describe('evaluate() — credibility.ledger (S10)', () => {
  it('passes ledger records through verbatim (same reference)', () => {
    const answer = answerFor('q1', T, { state: 'answered', rungId: 'choice-3' }, G);
    const record: AnswerLedgerRecord = {
      kind: 'answer',
      questionId: 'q1',
      target: T,
      before: null,
      after: snapshotOf(answer),
      candidates: [{ from: 'Alice', answer: snapshotOf(answer), claim: null, authority: 'out-of-claim' }],
      decision: { kind: 'sole-source', from: 'Alice' },
    };
    const landing: Landing = {
      id: '11111111-1111-4111-8111-111111111111',
      at: 'T1',
      participant: 'Alice',
      records: [record],
    };
    const landed = assessmentOf(MAT2, 'u', [], [], { kind: 'finalized', workbookAssessment: 'wa-1', ledger: [landing] });
    expect(evaluate(MAT2, landed).credibility.ledger).toBe(landed.ledger);
    expect(evaluate(MAT2, landed).credibility.ledger).toHaveLength(1);

    const bare = assessmentOf(MAT2, 'u', [], [], { kind: 'finalized', workbookAssessment: 'wa-1', ledger: [] });
    expect(evaluate(MAT2, bare).credibility.ledger).toEqual([]);
  });
});
