import { describe, expect, it } from 'vitest';
import type { CheckId, ConsistencyCheck } from './second-look';
import { CHECK_COUNT, CHECK_META, secondLookTile } from './second-look';
import { SUBJECT_A, SUBJECT_C } from './subjects-fixture';

const checksOf = (subject: typeof SUBJECT_A): ConsistencyCheck[] => {
  const view = secondLookTile(subject.result, subject.workbook, subject.parties);
  if (view.kind !== 'flagged') throw new Error('expected flagged');
  return view.checks;
};

const check = (subject: typeof SUBJECT_A, id: CheckId): ConsistencyCheck => {
  const found = checksOf(subject).find((c) => c.id === id);
  if (found === undefined) throw new Error(`expected the ${id} check to fire`);
  return found;
};

describe('the worth-a-second-look tile model', () => {
  it('names how many checks found something', () => {
    const a = secondLookTile(SUBJECT_A.result, SUBJECT_A.workbook, SUBJECT_A.parties);
    expect(a.kind).toBe('flagged');
    if (a.kind !== 'flagged') throw new Error('expected flagged');
    expect(a.headline).toBe('5 of 5 checks found something to ask about.');
    expect(a.checks.map((c) => c.id)).toEqual([
      'concentration',
      'chain-visibility',
      'unserved-dimension',
      'hidden-layer',
      'undefended-claim',
    ]);

    const c = secondLookTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (c.kind !== 'flagged') throw new Error('expected flagged');
    expect(c.headline).toBe('3 of 5 checks found something to ask about.');
    expect(c.checks.map((x) => x.id)).toEqual(['concentration', 'hidden-layer', 'undefended-claim']);
  });

  it('concentration — the rung against the roster', () => {
    const found = check(SUBJECT_C, 'concentration');
    expect(found.title).toBe('Concentration');
    expect(found.asserted).toBe(
      'SEAL-1 · Non-EU-controlled providers underlie every critical dimension; the concentration is spread across two or three of them.',
    );
    expect(found.structural).toBe('The roster puts Acme Cloud EU under 6 of 6 critical dimensions.');
    expect(found.question).toBe('Is one provider really carrying this?');
    expect(found.opens).toHaveLength(1);
    expect(found.opens[0]!.questionId).toBe('SOV-1.concentration');
    expect(found.opens[0]!.label).toBe('whole estate');
    expect(found.opens[0]!.questionText).toBe(
      'How many critical dimensions of this estate stand on a single non-EU-controlled provider?',
    );
  });

  it('chain visibility — the claim against the named roster', () => {
    const found = check(SUBJECT_A, 'chain-visibility');
    expect(found.asserted).toBe(
      'SEAL-2 · Every sub-contractor is enumerated; hardware, software suppliers are mapped for the critical dimensions.',
    );
    expect(found.structural).toBe(
      'The roster names 3 third parties; IAM, Platform (Containers, PaaS) and Security each stand on exactly one of them.',
    );
    expect(found.question).toBe('Can the chain really be named below these providers?');
    expect(found.opens).toHaveLength(1);
    expect(found.opens[0]!.questionId).toBe('SOV-5.chain-visibility');
    expect(checksOf(SUBJECT_C).some((c) => c.id === 'chain-visibility')).toBe(false);
  });

  it('unserved dimension — structural only', () => {
    const found = check(SUBJECT_A, 'unserved-dimension');
    expect(found.asserted).toBeNull();
    expect(found.structural).toBe(
      'Software supply & development is declared in scope, and no party on the roster serves it.',
    );
    expect(found.question).toBe('Who runs this?');
    expect(found.opens).toEqual([]);
    expect(checksOf(SUBJECT_C).some((c) => c.id === 'unserved-dimension')).toBe(false);
  });

  it('hidden layer — a critical dimension answered whole while others split', () => {
    const c = check(SUBJECT_C, 'hidden-layer');
    expect(c.asserted).toBe(
      'Network, IAM, Platform (Containers, PaaS) and Security were each answered whole.',
    );
    expect(c.structural).toBe(
      'Compute and Storage are split into layers; each of these declares layers of its own.',
    );
    expect(c.question).toBe('Is the weakness hiding at one layer?');
    expect(c.opens.map((o) => [o.label, o.questionId])).toEqual([
      ['Network', 'SOV-4.withdrawal-survival'],
      ['IAM', 'SOV-7.iam-authority'],
      ['Platform (Containers, PaaS)', 'SOV-4.withdrawal-survival'],
      ['Security', 'SOV-6.independent-build'],
    ]);

    const a = check(SUBJECT_A, 'hidden-layer');
    expect(a.asserted).toBe(
      'Storage, Network, IAM, Platform (Containers, PaaS) and Security were each answered whole.',
    );
    expect(a.structural).toBe(
      'Compute is split into layers; each of these declares layers of its own.',
    );
    expect(a.opens.map((o) => o.questionId)).toEqual([
      'SOV-3.verified-deletion',
      'SOV-3.data-residency',
      'SOV-7.iam-authority',
      'SOV-4.withdrawal-survival',
      'SOV-6.independent-build',
    ]);
  });

  it('undefended claim — the strong claims with nothing behind them', () => {
    const c = check(SUBJECT_C, 'undefended-claim');
    expect(c.asserted).toBe('14 gating answers claim SEAL-3 or SEAL-4.');
    expect(c.structural).toBe('12 of them record no evidence note.');
    expect(c.question).toBe('Would these hold up if someone asked for the document?');
    expect(c.opens).toHaveLength(12);
    expect(c.opens[0]!.questionId).toBe('SOV-2.compellability');
    expect(c.opens[0]!.label).toBe('SiliconWare Corp.');

    const a = check(SUBJECT_A, 'undefended-claim');
    expect(a.asserted).toBe('17 gating answers claim SEAL-3 or SEAL-4.');
    expect(a.structural).toBe('15 of them record no evidence note.');
    expect(a.opens).toHaveLength(15);
  });

  it('opens carry the exact answer unit, so each is its own selection', () => {
    const concentration = check(SUBJECT_C, 'concentration');
    expect(concentration.opens[0]!.target).toEqual({ kind: 'assessment' });

    // A hidden layer is asked of the dimension answered whole, not of the estate.
    const hidden = check(SUBJECT_C, 'hidden-layer');
    expect(hidden.opens.every((o) => o.target.kind === 'dimension')).toBe(true);

    // Two checks list the same question under different parties; the keys must differ
    // or the rail cannot tell which unit was pressed.
    const undefended = check(SUBJECT_C, 'undefended-claim');
    expect(new Set(undefended.opens.map((o) => o.key)).size).toBe(undefended.opens.length);
  });

  it('carries the ratio its dial draws, in the units CHECK_META names', () => {
    // Concentration fires only where one party carries EVERY critical dimension, so
    // its dial is always full — that is the finding, not a rounding.
    expect(check(SUBJECT_C, 'concentration').ratio).toEqual({ part: 6, whole: 6 });
    expect(check(SUBJECT_A, 'chain-visibility').ratio).toEqual({ part: 3, whole: 6 });
    expect(check(SUBJECT_A, 'unserved-dimension').ratio).toEqual({ part: 1, whole: 10 });
    // Four dimensions taken whole against two answered at a layer.
    expect(check(SUBJECT_C, 'hidden-layer').ratio).toEqual({ part: 4, whole: 6 });
    expect(check(SUBJECT_C, 'undefended-claim').ratio).toEqual({ part: 12, whole: 14 });

    // A part can never exceed the whole it is a share of, or the arc overdraws.
    for (const c of [...checksOf(SUBJECT_A), ...checksOf(SUBJECT_C)]) {
      expect(c.ratio.whole).toBeGreaterThan(0);
      expect(c.ratio.part).toBeLessThanOrEqual(c.ratio.whole);
    }
  });

  it('names every check, so a clear one still has a dial', () => {
    expect(CHECK_META.map((m) => m.id)).toEqual([
      'concentration',
      'chain-visibility',
      'unserved-dimension',
      'hidden-layer',
      'undefended-claim',
    ]);
    expect(CHECK_META).toHaveLength(CHECK_COUNT);
    // The tile takes its titles from here, so a fired check must agree with them.
    for (const c of checksOf(SUBJECT_A)) {
      expect(c.title).toBe(CHECK_META.find((m) => m.id === c.id)!.title);
    }
  });

  it('moves no number', () => {
    const before = structuredClone(SUBJECT_C.result.overall);
    const view = secondLookTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'flagged') throw new Error('expected flagged');
    expect(SUBJECT_C.result.overall).toEqual(before);
    expect(view.checks.every((c) => c.question.endsWith('?'))).toBe(true);
  });

  it('says so when a file shows no daylight', () => {
    const view = secondLookTile(
      { ...SUBJECT_C.result, facts: [], gating: [] },
      SUBJECT_C.workbook,
      SUBJECT_C.parties,
    );
    expect(view.kind).toBe('clear');
    if (view.kind !== 'clear') throw new Error('expected clear');
    expect(view.reason.length).toBeGreaterThan(0);
  });
});
