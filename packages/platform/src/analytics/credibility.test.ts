import { describe, expect, it } from 'vitest';
import { contributorInspection, credibilityTile, provenanceInspection } from './credibility';
import { SUBJECT_A, SUBJECT_C, SUBJECT_EMPTY } from './subjects-fixture';

describe('credibilityTile — SUBJECT_C', () => {
  const view = credibilityTile(SUBJECT_C.result, SUBJECT_C.workbook);

  it('counts the swept share against the answers, never against the units', () => {
    expect(view.swept).toEqual({
      kind: 'measured',
      swept: 9,
      answered: 84,
      percent: '10.7%',
      line: '9 of 84 answers were placed by a group gesture — 10.7%.',
    });
  });

  it('cannot drift from the engine’s own swept ratio', () => {
    if (view.swept.kind !== 'measured') throw new Error('expected a measured reading');
    expect(view.swept.swept / view.swept.answered).toBe(SUBJECT_C.result.credibility.sweptRatio);
  });

  it('reads the ledger and ranks who placed what stands', () => {
    if (view.ledger.kind !== 'landed') throw new Error('expected a landed ledger');
    expect(view.ledger.records).toBe(149);
    expect(view.ledger.units).toBe(94);
    expect(view.ledger.disputed).toBe(34);
    expect(view.ledger.coverage).toBe('The ledger covers 94 answer units.');
    expect(view.ledger.disputes).toHaveLength(34);
    expect(view.ledger.disputes[0]).toMatch(
      /^Alex said “.+” \(SEAL 2\); Jane said “.+” \(SEAL 1\) → kept Jane — “.+” \(SEAL 1\)$/,
    );

    // Ranked by what STANDS, so a contributor whose answers were all superseded
    // does not rank on the traffic they made getting there.
    const units = view.ledger.contributors.reduce((total, c) => total + c.units, 0);
    expect(units).toBe(view.ledger.standing);
    expect(view.ledger.standing).toBeLessThanOrEqual(view.ledger.units);
    expect([...view.ledger.contributors].sort((a, b) => b.units - a.units)).toEqual(
      view.ledger.contributors,
    );
    // `facilitator` ranks like anyone else: a re-answer at the queue is authorship,
    // and leaving it out would be the one provenance omission that flatters.
    expect(view.ledger.contributors.map((c) => c.name).sort()).toEqual([
      'Alex',
      'Jane',
      'facilitator',
    ]);
    for (const contributor of view.ledger.contributors) {
      expect(contributor.fraction).toBeCloseTo(contributor.units / view.ledger.standing, 10);
    }
    expect(view.ledger.line).toBe(
      `3 contributors placed the ${view.ledger.standing} answers that stand.`,
    );
    expect(view.ledger.disputedLine).toBe('34 of 149 records were disputed on landing.');
  });
});

describe('contributorInspection — SUBJECT_C', () => {
  const { result, workbook, parties } = SUBJECT_C;
  const view = credibilityTile(result, workbook);

  it('opens one contributor’s slice as the units standing because they placed them', () => {
    if (view.ledger.kind !== 'landed') throw new Error('expected a landed ledger');
    for (const contributor of view.ledger.contributors) {
      const opened = contributorInspection(result, workbook, parties, contributor.name);
      if (opened === null) throw new Error(`${contributor.name} ranks but opens to nothing`);
      // The rail cannot disagree with the arc it was opened from.
      expect(opened.units).toHaveLength(contributor.units);
      expect(opened.count).toBe(`${contributor.units} of ${view.ledger.standing}`);
      expect(opened.units.every((unit) => unit.questionText !== '')).toBe(true);
      expect(opened.units.every((unit) => unit.label !== '')).toBe(true);
      expect(
        opened.units.every((unit) =>
          ['sole source', 'agreed', 'resolved a clash'].includes(unit.settled),
        ),
      ).toBe(true);
    }
  });

  it('reads the answer that stands, not the one it replaced', () => {
    const opened = contributorInspection(result, workbook, parties, 'Jane');
    if (opened === null) throw new Error('expected Jane to hold units');
    const sealed = opened.units.filter((unit) => unit.state === 'answered');
    expect(sealed.length).toBeGreaterThan(0);
    expect(
      sealed.every(
        (unit) =>
          unit.seal !== null &&
          unit.answer.startsWith('“') &&
          unit.answer.endsWith(`(SEAL ${unit.seal})`),
      ),
    ).toBe(true);
    expect(opened.units.every((unit) => (unit.state === 'answered') === (unit.seal !== null))).toBe(
      true,
    );
  });

  it('resolves a name the ledger no longer stands behind to nothing', () => {
    // The resolver seam: a stale selection is not a reason to show an empty rail.
    expect(contributorInspection(result, workbook, parties, 'Nobody')).toBe(null);
  });
});

describe('provenanceInspection — SUBJECT_C', () => {
  const { result, workbook, parties } = SUBJECT_C;
  const view = credibilityTile(result, workbook);

  it('opens the swept bar as the answers that bar measured', () => {
    if (view.swept.kind !== 'measured') throw new Error('expected a measured reading');
    const opened = provenanceInspection(result, workbook, parties, 'swept');
    if (opened === null) throw new Error('expected a swept share to open');
    // The rail cannot disagree with the bar it was opened from.
    expect(opened.units).toHaveLength(view.swept.swept);
    expect(opened.count).toBe(`${view.swept.swept} of ${view.swept.answered}`);
    expect(opened.units.every((unit) => unit.questionText !== '')).toBe(true);
    expect(opened.units.every((unit) => unit.settled === '')).toBe(true);
    expect(opened.units.every((unit) => unit.reading?.state === 'answered')).toBe(true);
  });

  it('opens the disputed bar as records, so one unit disputed twice is two rows', () => {
    if (view.ledger.kind !== 'landed') throw new Error('expected a landed ledger');
    const opened = provenanceInspection(result, workbook, parties, 'disputed');
    if (opened === null) throw new Error('expected disputes to open');
    expect(opened.units).toHaveLength(view.ledger.disputed);
    expect(opened.count).toBe(`${view.ledger.disputed} of ${view.ledger.records}`);
    expect(new Set(opened.units.map((unit) => unit.key)).size).toBe(opened.units.length);
    // Every one settled somehow — that is what makes it a dispute rather than a record.
    expect(opened.units.every((unit) => unit.settled !== '')).toBe(true);
    expect(opened.units.every((unit) => unit.label !== '')).toBe(true);
  });
});

describe('provenanceInspection — SUBJECT_A', () => {
  const { result, workbook, parties } = SUBJECT_A;

  it('resolves a ratio with no numerator to nothing rather than an empty rail', () => {
    // The resolver seam: SUBJECT_A has landed nothing, so there is no dispute to read.
    expect(provenanceInspection(result, workbook, parties, 'disputed')).toBe(null);
    expect(provenanceInspection(result, workbook, parties, 'swept')).not.toBe(null);
  });
});

describe('credibilityTile — SUBJECT_A', () => {
  const view = credibilityTile(SUBJECT_A.result, SUBJECT_A.workbook);

  it('reads a single contributor’s swept share', () => {
    expect(view.swept).toMatchObject({ swept: 2, answered: 74, percent: '2.7%' });
    if (view.swept.kind !== 'measured') throw new Error('expected a measured reading');
    expect(view.swept.line).toBe('2 of 74 answers were placed by a group gesture — 2.7%.');
  });

  it('says there is no ledger rather than reading an empty one', () => {
    if (view.ledger.kind !== 'unlanded') throw new Error('expected an unlanded ledger');
    expect(view.ledger.reason).toBe(
      'One contributor, nothing merged — no partial has landed, so there is no ledger to read.',
    );
  });
});

describe('credibilityTile — SUBJECT_EMPTY', () => {
  const view = credibilityTile(SUBJECT_EMPTY.result, SUBJECT_EMPTY.workbook);

  it('reads neither a share nor a ledger from nothing', () => {
    expect(view.swept.kind).toBe('none');
    expect(view.ledger.kind).toBe('unlanded');
  });
});
