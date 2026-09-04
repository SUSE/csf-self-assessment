import { describe, expect, it } from 'vitest';
import { AnswerSchema, AssessmentSchema, TargetSchema } from './index';
import { BASE, G, GG, INST, META } from './fixtures';

// The answer under test, inside the smallest envelope that carries it.
const withAnswer = (answer: unknown) =>
  AssessmentSchema.safeParse({ meta: META, workbook: BASE, parties: [INST], answers: [answer] });

const parseAnswer = (answer: unknown) =>
  AssessmentSchema.parse({ meta: META, workbook: BASE, parties: [INST], answers: [answer] }).answers[0];

describe('answer targets', () => {
  it('parses a dimension target with a group gesture', () => {
    const a = parseAnswer({
      questionId: 'SOV-2.q1',
      target: { kind: 'dimension', dimension: 'compute' },
      state: 'answered',
      rungId: 'choice-2',
      gesture: GG,
    });
    expect(a.target).toEqual({ kind: 'dimension', dimension: 'compute' });
    expect(a.gesture.placement).toBe('group');
  });

  it('parses a party target answer', () => {
    const a = parseAnswer({
      questionId: 'SOV-2.q1',
      target: { kind: 'party', party: 'idp' },
      state: 'answered',
      rungId: 'choice-1',
      gesture: G,
    });
    expect(a.target).toEqual({ kind: 'party', party: 'idp' });
  });

  it('parses an answer targeting a dimension/stratum refinement (S7)', () => {
    expect(
      AnswerSchema.safeParse({
        questionId: 'O.q1',
        target: { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' },
        state: 'answered',
        rungId: 'choice-2',
        gesture: G,
      }).success,
    ).toBe(true);
  });

  it('rejects a dimension target with no dimension id', () => {
    expect(
      withAnswer({ questionId: 'SOV-2.q1', target: { kind: 'dimension' }, state: 'answered', rungId: 'choice-2', gesture: GG })
        .success,
    ).toBe(false);
  });

  it('rejects a party target with no party id', () => {
    expect(
      withAnswer({ questionId: 'SOV-2.q1', target: { kind: 'party' }, state: 'answered', rungId: 'choice-2', gesture: G }).success,
    ).toBe(false);
  });

  it('rejects a stratum target missing its dimension', () => {
    expect(TargetSchema.safeParse({ kind: 'dimension-stratum', stratum: 'chips' }).success).toBe(false);
  });

  it('rejects an unknown target kind', () => {
    expect(
      withAnswer({ questionId: 'SOV-2.q1', target: { kind: 'zzz' }, state: 'answered', rungId: 'choice-2', gesture: G }).success,
    ).toBe(false);
  });
});

describe('answer states', () => {
  it('parses dont-know and na answers (each with a gesture)', () => {
    const parsed = AssessmentSchema.parse({
      meta: META,
      workbook: BASE,
      parties: [INST],
      answers: [
        { questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'dont-know', gesture: G },
        { questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'na', gesture: G },
      ],
    });
    expect(parsed.answers[0].state).toBe('dont-know');
    expect('rungId' in parsed.answers[0]).toBe(false);
    expect(parsed.answers[1].state).toBe('na');
  });

  it('parses an n/a answer carrying a reason, preserved verbatim', () => {
    const a = parseAnswer({
      questionId: 'SOV-2.q1',
      target: { kind: 'assessment' },
      state: 'na',
      reason: 'this estate holds no personal data',
      gesture: G,
    });
    expect(a.state).toBe('na');
    if (a.state === 'na') expect(a.reason).toBe('this estate holds no personal data');
  });

  it('rejects an empty reason', () => {
    expect(
      withAnswer({ questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'na', reason: '', gesture: G })
        .success,
    ).toBe(false);
  });

  it('rejects an answered answer with no rung', () => {
    expect(
      withAnswer({ questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'answered', gesture: G }).success,
    ).toBe(false);
  });

  it('rejects an unknown answer state', () => {
    expect(withAnswer({ questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'maybe', gesture: G }).success).toBe(
      false,
    );
  });

  it('rejects an answer with no gesture', () => {
    expect(
      withAnswer({ questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'answered', rungId: 'choice-2' }).success,
    ).toBe(false);
  });
});

describe('answer evidence (S8)', () => {
  const answered = {
    questionId: 'O.q1',
    target: { kind: 'dimension', dimension: 'compute' },
    state: 'answered',
    rungId: 'choice-2',
    gesture: GG,
  };

  it('an answered answer may carry an evidence note — or none at all', () => {
    expect(AnswerSchema.safeParse({ ...answered, evidence: 'contract §12 escrow' }).success).toBe(true);
    expect(AnswerSchema.safeParse(answered).success).toBe(true);
  });

  it('rejects an empty evidence note — absent, never blank', () => {
    expect(AnswerSchema.safeParse({ ...answered, evidence: '' }).success).toBe(false);
  });

  it("a don't-know never carries evidence — the key is stripped on parse", () => {
    const parsed = AnswerSchema.parse({
      questionId: 'O.q1',
      target: { kind: 'dimension', dimension: 'compute' },
      state: 'dont-know',
      evidence: 'smuggled',
      gesture: G,
    });
    expect('evidence' in parsed).toBe(false);
  });
});
