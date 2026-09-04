import { describe, expect, it } from 'vitest';
import { AssessmentSchema, WorkbookSchema } from '../schema';
import type { TestEstate, Workbook } from '../schema';
import { assessmentOf, AUTHOR_QA_PROVENANCE, claimWalk } from '../assessment';
import { evaluate } from '../score-engine';
import { authorGauges } from './gauges';
import { ladderLint } from './lint';
import { duplicateRadar } from './similarity';
import { estateAnswers, testEstateReadings } from './estates';
import { csfWorkbookRaw } from '../test-fixtures';

// S11 (spec §9): the REAL instrument, locked to the author gauges and to the
// audit-profile outcomes. This file is the successor of
// score-engine/audit-profiles.test.ts for the rewritten content: the F-1
// inversion (sovereign BASE ordered below hyperscaler A) must be dead, and
// none of the six audit floor-traps may ever floor BASE again.

const WB: Workbook = WorkbookSchema.parse(csfWorkbookRaw);
const INST = { id: 'inst', name: 'Institution', type: 'institution', serves: [] };

function estateOf(id: string): TestEstate {
  const estate = WB.testEstates.find((e) => e.id === id);
  if (!estate) throw new Error(`missing test estate ${id}`);
  return estate;
}

function bottomRungOf(questionId: string) {
  for (const objective of WB.objectives) {
    const question = objective.questions.find((q) => q.id === questionId);
    if (question) return question.ladder[0];
  }
  throw new Error(`missing question ${questionId}`);
}

function overallOf(wb: Workbook, id: string) {
  const reading = testEstateReadings(wb).find((r) => r.estateId === id);
  if (!reading) throw new Error(`missing reading ${id}`);
  return reading.overall;
}

describe('csf workbook — the real content (S11)', () => {
  it('budget gauge: 39 questions within target; 92.5 estimated minutes under all-in-scope', () => {
    const gauges = authorGauges(WB);
    expect(gauges.budget.questionCount).toBe(39);
    expect(gauges.budget.questionCount).toBeLessThanOrEqual(gauges.budget.questionTarget);
    // delivery-S2: the budget now counts EVERY appliesTo dimension (edge/facilities
    // included), so the real instrument estimates 92.5 min — 2.5 over the 90-min
    // heuristic. Pinned exactly (a regression lock); flagged in the plan Deviations.
    expect(gauges.budget.estimatedMinutes).toBe(92.5);
  });

  it('covers every core dimension (audit F-7 closed: iam, network, facilities, chips-via-strata)', () => {
    expect(authorGauges(WB).coverage.uncoveredDimensions).toEqual([]);
  });

  it('role readout lists the six roles with counts + minutes, and renders no verdict', () => {
    const readout = authorGauges(WB).roleReadout;
    expect(readout.loads.map((l) => l.role)).toEqual(['ARCH', 'OPS', 'SEC', 'LEG', 'PROC', 'FAC']);
    expect(readout.loads.map((l) => l.questionCount)).toEqual([7, 9, 9, 5, 6, 3]);
    for (const l of readout.loads) expect(l.estimatedMinutes).toBeGreaterThan(0);
    expect('missing' in readout).toBe(false);
    expect('overloaded' in readout).toBe(false);
  });

  it('a seventh authored role flows through validation, walk, and readout', () => {
    const q0 = WB.objectives[0].questions[0];
    const withDpo = WorkbookSchema.parse({
      ...WB,
      roles: [...WB.roles, { id: 'DPO', name: 'Data protection officer' }],
      objectives: WB.objectives.map((o, oi) =>
        oi === 0 ? { ...o, questions: [{ ...o.questions[0], role: 'DPO' }, ...o.questions.slice(1)] } : o,
      ),
    });
    // validation: the retagged workbook is valid; a role not in `roles` is not.
    expect(withDpo.roles.map((r) => r.id)).toContain('DPO');
    expect(
      WorkbookSchema.safeParse({ ...withDpo, roles: withDpo.roles.filter((r) => r.id !== 'DPO') }).success,
    ).toBe(false);
    // walk: the DPO claim surfaces DPO's retagged question.
    const sections = claimWalk(withDpo, [INST], { roles: ['DPO'], dimensions: [], parties: [] });
    expect(sections.flatMap((s) => s.questions.map((qq) => qq.id))).toContain(q0.id);
    // readout: DPO appears last (workbook order) with its one question.
    const readout = authorGauges(withDpo).roleReadout;
    const dpo = readout.loads.find((l) => l.role === 'DPO');
    expect(dpo?.questionCount).toBe(1);
  });

  it('the CSF workbook declares the EC-four party taxonomy with exactly one assessed', () => {
    expect(WB.parties.map((p) => p.id)).toEqual(['institution', 'primary-provider', 'subprocessor', 'supplier']);
    expect(WB.parties.filter((p) => p.kind === 'assessed').map((p) => p.id)).toEqual(['institution']);
  });

  it('a fifth party type flows through validation and onto the exposure map (keystone)', () => {
    const wb = WorkbookSchema.parse({ ...WB, parties: [...WB.parties, { id: 'sovereign-cloud', name: 'Sovereign-cloud partner', kind: 'third-party' }] });
    expect(wb.parties.map((p) => p.id)).toContain('sovereign-cloud');
    const parties = [INST, { id: 'scp', name: 'SCP', type: 'sovereign-cloud', serves: ['compute'] }];
    const assessment = AssessmentSchema.parse(assessmentOf(wb, 'E', parties, [], AUTHOR_QA_PROVENANCE));
    const r = evaluate(wb, assessment);
    expect(r.exposure).toEqual([{ party: 'scp', dimension: 'compute', worstSeal: null }]);
    // removing the type while a concrete party still names it fails validation.
    expect(AssessmentSchema.safeParse(assessmentOf(WB, 'E', parties, [], AUTHOR_QA_PROVENANCE)).success).toBe(false);
  });

  it('passes the ladder lint clean: no compound stems, no hedged quantifiers, every why present', () => {
    expect(ladderLint(WB)).toEqual([]);
  });

  it('duplicate radar stays within its cap (report-only; the warning list goes to the plan Deviations)', () => {
    const warnings = duplicateRadar(WB);
    expect(warnings.length).toBeLessThanOrEqual(10);
    // Report only — the radar warns, the author judges (audit F-5 discipline).
    console.log('duplicate radar:', JSON.stringify(warnings));
  });

  it('kills the F-1 inversion: BASE floors ABOVE the hyperscaler estate', () => {
    const a = overallOf(WB, 'profile-a');
    const base = overallOf(WB, 'profile-base');
    const m = overallOf(WB, 'profile-m');

    expect(a.floor).toBe(0);
    expect(base.floor).toBe(1);
    expect(m.floor).toBe(0);

    expect([...a.binding].sort()).toEqual([
      'SOV-2.sanctions-exposure',
      'SOV-5.reliance',
      'SOV-6.build-capability',
      'SOV-7.identity-root',
    ]);
    expect([...base.binding].sort()).toEqual(['SOV-5.supply-audit', 'SOV-6.exit-tested']);
    expect([...m.binding].sort()).toEqual([
      'SOV-5.reliance',
      'SOV-6.build-capability',
      'SOV-7.identity-root',
    ]);
  });

  it('gate-vs-rank: the score spreads and orders BASE > A > M', () => {
    const a = overallOf(WB, 'profile-a').score;
    const base = overallOf(WB, 'profile-base').score;
    const m = overallOf(WB, 'profile-m').score;
    if (a === null || base === null || m === null) throw new Error('score must exist');
    expect(base).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(m);
  });

  it('R-1 regression: no audit floor-trap descendant can floor BASE (the six flips, dead)', () => {
    const descendants = [
      'SOV-2.transparency', // was SOV-2.q6
      'SOV-4.continuity-plan', // was SOV-4.q7
      'SOV-6.upstream-influence', // was SOV-6.q4 (+ SOV-1.q5 governance)
      'SOV-7.certifications', // was SOV-7.q5
      'SOV-8.stewardship', // was SOV-8.q1 (+ q3/q4/q6)
      'SOV-8.supply-policy', // was SOV-8.q5
    ];
    for (const questionId of descendants) {
      const bottom = bottomRungOf(questionId);
      expect(bottom.seal).toBe(0);
      const flipped: Workbook = {
        ...WB,
        testEstates: WB.testEstates.map((estate) =>
          estate.id !== 'profile-base'
            ? estate
            : {
                ...estate,
                answers: estate.answers.map((answer) =>
                  answer.questionId === questionId ? { ...answer, rungId: bottom.id } : answer,
                ),
              },
        ),
      };
      expect(overallOf(flipped, 'profile-base').floor).toBe(1);
    }
  });

  it('SOV-8 is recorded context: informational-only objective yields no seal and no score', () => {
    const base = estateOf('profile-base');
    const result = evaluate(
      WB,
      assessmentOf(WB, base.name, base.parties, estateAnswers(WB, base), AUTHOR_QA_PROVENANCE),
    );
    const sov8 = result.objectives.find((o) => o.id === 'SOV-8');
    if (!sov8) throw new Error('SOV-8 missing');
    expect(sov8.seal).toBeNull();
    expect(sov8.score).toBeNull();
  });

  it('carries the R-7 front sheet: ceiling declared, don’t-know semantics, pre-work', () => {
    expect(WB.frontSheet.length).toBe(4);
    expect(WB.frontSheet.some((line) => line.includes('SEAL-3'))).toBe(true);
  });
});
