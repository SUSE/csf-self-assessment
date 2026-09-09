import { describe, expect, it } from 'vitest';
import type { Gesture, Target } from '../schema';
import { answerFor, setEvidence, setNaReason } from './index';
import { ASSESSMENT, G } from './fixtures';

describe('evidence on the answer (S8)', () => {
  const compute = { kind: 'dimension', dimension: 'compute' } as const;

  it('answerFor stores the note on an answered choice and omits the key otherwise', () => {
    expect(answerFor('q', compute, { state: 'answered', rungId: 'choice-2', evidence: 'audit report 2026' }, G)).toEqual({
      questionId: 'q',
      target: compute,
      state: 'answered',
      rungId: 'choice-2',
      evidence: 'audit report 2026',
      gesture: G,
    });
    expect('evidence' in answerFor('q', compute, { state: 'answered', rungId: 'choice-2' }, G)).toBe(false);
  });
});

describe('setEvidence', () => {
  const answered = (target: Target, rungId: string, gesture: Gesture, evidence?: string) =>
    answerFor(
      'q1',
      target,
      evidence === undefined ? { state: 'answered', rungId } : { state: 'answered', rungId, evidence },
      gesture,
    );
  const party = (id: string): Target => ({ kind: 'party', party: id });
  const G1 = { groupId: 'g1', placement: 'individual' as const };
  const G1_GROUP = { groupId: 'g1', placement: 'group' as const };
  const G2 = { groupId: 'g2', placement: 'individual' as const };
  const noteOf = (answer: { state: string; evidence?: string | undefined }) =>
    answer.state === 'answered' ? answer.evidence : undefined;

  it('sets the note on the matching answered answer', () => {
    expect(setEvidence([answered(ASSESSMENT, 'choice-3', G1)], 'q1', 'g1', 'Audit report 2026')[0]).toEqual({
      questionId: 'q1',
      target: ASSESSMENT,
      state: 'answered',
      rungId: 'choice-3',
      evidence: 'Audit report 2026',
      gesture: G1,
    });
  });

  it('drops the key when the note is whitespace-only', () => {
    const r = setEvidence([answered(ASSESSMENT, 'choice-3', G1, 'old')], 'q1', 'g1', '   ');
    expect('evidence' in r[0]).toBe(false);
    expect(r[0]).toEqual(answered(ASSESSMENT, 'choice-3', G1));
  });

  it('drops the key when the note is empty', () => {
    expect('evidence' in setEvidence([answered(ASSESSMENT, 'choice-3', G1, 'old')], 'q1', 'g1', '')[0]).toBe(false);
  });

  it('stores the note verbatim, never trimming', () => {
    expect(noteOf(setEvidence([answered(ASSESSMENT, 'choice-3', G1)], 'q1', 'g1', '  spaced  ')[0])).toBe('  spaced  ');
  });

  it('rewrites the whole group and preserves the groupId', () => {
    const r = setEvidence([answered(party('a'), 'choice-4', G1_GROUP), answered(party('b'), 'choice-4', G1_GROUP)], 'q1', 'g1', 'note');
    expect(r.map(noteOf)).toEqual(['note', 'note']);
    expect(r.map((a) => a.gesture)).toEqual([G1_GROUP, G1_GROUP]);
  });

  it('leaves other groups and other questions untouched', () => {
    const otherGroup = answered(party('x'), 'choice-4', G2);
    expect(setEvidence([answered(ASSESSMENT, 'choice-3', G1), otherGroup], 'q1', 'g1', 'note')[1]).toEqual(otherGroup);
    expect(setEvidence([answered(ASSESSMENT, 'choice-3', G1)], 'q9', 'g1', 'note')[0]).toEqual(answered(ASSESSMENT, 'choice-3', G1));
  });

  it('leaves non-answered answers in the group as-is', () => {
    const dontKnow = answerFor('q1', ASSESSMENT, { state: 'dont-know' }, G1);
    expect(setEvidence([dontKnow], 'q1', 'g1', 'note')[0]).toEqual(dontKnow);
  });

  it('never mutates the input array', () => {
    const src = [answered(ASSESSMENT, 'choice-3', G1)];
    setEvidence(src, 'q1', 'g1', 'note');
    expect('evidence' in src[0]).toBe(false);
  });
});

describe('setNaReason', () => {
  const GROUP = { groupId: 'g1', placement: 'group' as const };
  const dimension = (id: string): Target => ({ kind: 'dimension', dimension: id });
  const na = (id: string, reason?: string, gesture: Gesture = GROUP) =>
    answerFor('q1', dimension(id), reason === undefined ? { state: 'na' } : { state: 'na', reason }, gesture);
  const answered = (id: string, gesture: Gesture = GROUP) =>
    answerFor('q1', dimension(id), { state: 'answered', rungId: 'choice-2' }, gesture);

  it('writes the reason on every na answer of the group', () => {
    const result = setNaReason([na('a'), na('b'), answered('c')], 'q1', 'g1', 'no personal data');
    expect(result.slice(0, 2)).toEqual([na('a', 'no personal data'), na('b', 'no personal data')]);
    expect(result[2]).toEqual(answered('c'));
    expect('reason' in result[2]).toBe(false);
  });

  it('drops the reason key on empty/whitespace', () => {
    const r = setNaReason([na('a', 'x'), na('b', 'x')], 'q1', 'g1', '   ');
    expect('reason' in r[0]).toBe(false);
    expect('reason' in r[1]).toBe(false);
  });

  it('touches only the matching group and question', () => {
    const otherGroup = na('a', 'keep', { groupId: 'g2', placement: 'group' });
    const otherQuestion = answerFor('q2', dimension('a'), { state: 'na', reason: 'keep' }, GROUP);
    const r = setNaReason([na('a'), na('b'), otherGroup, otherQuestion], 'q1', 'g1', 'why');
    expect(r[2]).toEqual(otherGroup);
    expect(r[3]).toEqual(otherQuestion);
  });

  it('is a no-op array-content-wise when the group holds no na', () => {
    const answers = [answered('a'), answered('b')];
    expect(setNaReason(answers, 'q1', 'g1', 'why')).toEqual(answers);
  });
});
