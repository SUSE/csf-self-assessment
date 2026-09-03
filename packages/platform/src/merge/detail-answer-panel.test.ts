import { describe, expect, it } from 'vitest';
import type { AnswerLedgerRecord } from '../schema';
import { answerPanel, snapshotReading } from './detail-answer';
import { authorityLabel } from './authority';
import { claimPhrase } from './ledger';
import { recordRef } from './record-ref';
import { AGREED, EXIT, G, JANE_SNAP, PARTIES, QUESTION, RESOLVED, WORKBOOK, ctx } from './detail-fixture';

const decided = (decision: AnswerLedgerRecord['decision']): AnswerLedgerRecord => ({ ...RESOLVED, decision });
const headline = (decision: AnswerLedgerRecord['decision']): string => answerPanel(decided(decision), EXIT, ctx).decision;

describe('what stood before and what stands after', () => {
  it('an absent snapshot is absent, never SEAL-0', () => {
    expect(snapshotReading(null, WORKBOOK, QUESTION)).toEqual({ kind: 'absent' });
  });

  it('a present snapshot reads its state, rung and provenance', () => {
    expect(snapshotReading(JANE_SNAP, WORKBOOK, QUESTION)).toEqual({
      kind: 'present',
      stateLabel: 'answered',
      seal: 3,
      sealLevel: 'Verified',
      placement: 'individual',
      evidence: 'Security review 2026-08',
      reason: null,
    });
    expect(snapshotReading({ state: 'dont-know', gesture: { groupId: 'g2', placement: 'group' } }, WORKBOOK, QUESTION)).toEqual({
      kind: 'present',
      stateLabel: 'don’t know',
      seal: null,
      sealLevel: null,
      placement: 'group',
      evidence: null,
      reason: null,
    });
    expect(snapshotReading({ state: 'na', reason: 'Out of scope', gesture: G }, WORKBOOK, QUESTION)).toEqual({
      kind: 'present',
      stateLabel: 'not applicable',
      seal: null,
      sealLevel: null,
      placement: 'individual',
      evidence: null,
      reason: 'Out of scope',
    });
  });
});

describe('the action between', () => {
  it('the decision headline names the exact human action', () => {
    expect(headline({ kind: 'agreed', among: ['Alex', 'Jane'], kept: 'Alex' })).toBe('Agreed by Alex and Jane');
    expect(headline({ kind: 'sole-source', from: 'Alex' })).toBe('Only Alex answered');
    const resolvedBy = (choice: Extract<AnswerLedgerRecord['decision'], { kind: 'resolved' }>['choice'], clash: 'divergence' | 'grain') =>
      headline({ kind: 'resolved', clash, choice, by: 'facilitator', note: '' });
    expect(resolvedBy({ kind: 'take', from: 'Jane' }, 'divergence')).toBe('Took Jane’s answer');
    expect(resolvedBy({ kind: 'reanswer', rungId: 'choice-1' }, 'divergence')).toBe('Facilitator set “Documented.” (SEAL 2)');
    expect(resolvedBy({ kind: 'grain', keep: 'strata' }, 'grain')).toBe('Kept the per-stratum answers');
    expect(resolvedBy({ kind: 'grain', keep: 'roll-up' }, 'grain')).toBe('Kept the whole-dimension answer');
  });
});

describe('the answer panel', () => {
  it('carries its identity, effect and process once', () => {
    const panel = answerPanel(RESOLVED, EXIT, ctx);
    expect(panel.label).toBe('SOV-2.q1 · whole estate');
    expect(panel.objectiveId).toBe('SOV-2');
    expect(panel.objectiveName).toBe('Exit');
    expect(panel.questionText).toBe('Can the estate withdraw within 90 days?');
    expect(panel.targetLabel).toBe('whole estate');
    expect(panel.effect).toBe('changed');
    expect(panel.process).toBe('resolved');
    expect(panel.clash).toBe('divergence');
    expect(panel.before).toMatchObject({ kind: 'present', seal: 2 });
    expect(panel.after).toMatchObject({ kind: 'present', seal: 3 });
    expect(panel.rationale).toBe('Jane’s claim names the security dimension');
    expect(panel.candidatesOpen).toBe(true);
    expect(panel.ref).toEqual(recordRef(RESOLVED));
  });

  it('an agreement has no clash, no rationale and closed candidates', () => {
    const panel = answerPanel(AGREED, { id: 'SOV-1', name: 'Transparency' }, ctx);
    expect(panel.clash).toBeNull();
    expect(panel.rationale).toBeNull();
    expect(panel.candidatesOpen).toBe(false);
    expect(panel.effect).toBe('unchanged');
  });

  it('an empty resolution note is no rationale', () => {
    const panel = answerPanel(
      decided({ kind: 'resolved', clash: 'divergence', choice: { kind: 'take', from: 'Jane' }, by: 'facilitator', note: '' }),
      EXIT,
      ctx,
    );
    expect(panel.rationale).toBeNull();
  });

  it('candidates say who stood behind what, and which one became the answer', () => {
    const panel = answerPanel(RESOLVED, EXIT, ctx);
    expect(panel.candidates).toHaveLength(2);
    expect(panel.candidates[1]).toEqual({
      from: 'Jane',
      answer: '“Verified.” (SEAL 3)',
      claim: claimPhrase(RESOLVED.candidates[1], WORKBOOK, PARTIES),
      authority: 'owner',
      authorityLabel: authorityLabel('owner'),
      evidence: 'Security review 2026-08',
      placement: 'individual',
      standing: true,
    });
    expect(panel.candidates[0].standing).toBe(false);
  });
});
