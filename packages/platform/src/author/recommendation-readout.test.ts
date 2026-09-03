import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { Recommendation, Seal, TestEstate, Workbook } from '../schema';
import { NO_ESTATES_REASON, recommendationReadout } from './recommendation-readout';

const LADDER = [
  { id: 'choice-1', description: 'none', points: 0, seal: 0 as const },
  { id: 'choice-2', description: 'partial', points: 25, seal: 1 as const },
  { id: 'choice-3', description: 'strong', points: 50, seal: 2 as const },
];

const rungIdFor = (seal: Seal): string => {
  const rung = LADDER.find((candidate) => candidate.seal === seal);
  if (rung === undefined) throw new Error(`no rung at SEAL ${seal}`);
  return rung.id;
};

const fixture = (recommendations: Recommendation[], testEstates: TestEstate[]): Workbook => ({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  frontSheet: [],
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
    { seal: 1, name: 'S1', description: 'd' },
    { seal: 2, name: 'S2', description: 'd' },
  ],
  dimensions: [{ id: 'compute', name: 'Compute', critical: true }],
  roles: [{ id: 'ARCH', name: 'Architect' }],
  parties: [],
  objectives: [
    {
      id: 'SOV-A',
      name: 'Alpha',
      weight: 100,
      questions: [
        {
          id: 'A.compute',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 'How is compute governed?',
          why: 'w',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: LADDER,
        },
      ],
    },
  ],
  testEstates,
  recommendations,
});

const recommendation = (id: string, whenAtOrBelow: 0 | 2): Recommendation => ({
  id,
  title: `Title ${id}`,
  action: `Action ${id}`,
  body: ['one'],
  links: [{ kind: 'dimension', id: 'compute' }],
  whenAtOrBelow,
  horizon: 'renewal',
  order: 10,
});

const estate = (id: string, name: string, seals: Seal[]): TestEstate => ({
  id,
  name,
  description: `${name} estate`,
  parties: [],
  answers: seals.map((seal) => ({ questionId: 'A.compute', rungId: rungIdFor(seal) })),
});

describe('recommendationReadout', () => {
  it('says nothing when the workbook authors no recommendation', () => {
    expect(recommendationReadout(fixture([], [estate('weak', 'Weak', [0])]))).toEqual({
      kind: 'none-authored',
    });
  });

  it('has nothing to measure against without a test estate', () => {
    expect(recommendationReadout(fixture([recommendation('rec-1', 2)], []))).toEqual({
      kind: 'no-estates',
      catalogue: [{ id: 'rec-1', title: 'Title rec-1' }],
      reason: NO_ESTATES_REASON,
    });
  });

  it('splits the catalogue per estate, in catalogue order', () => {
    const readout = recommendationReadout(
      fixture(
        [recommendation('rec-1', 2), recommendation('rec-2', 0)],
        [estate('weak', 'Weak', [0]), estate('strong', 'Strong', [2])],
      ),
    );
    expect(readout).toEqual({
      kind: 'readout',
      perEstate: [
        {
          estateId: 'weak',
          name: 'Weak',
          fired: [
            { id: 'rec-1', title: 'Title rec-1' },
            { id: 'rec-2', title: 'Title rec-2' },
          ],
        },
        { estateId: 'strong', name: 'Strong', fired: [{ id: 'rec-1', title: 'Title rec-1' }] },
      ],
      neverFires: [],
      catalogue: [
        { id: 'rec-1', title: 'Title rec-1' },
        { id: 'rec-2', title: 'Title rec-2' },
      ],
    });
  });

  it('names the recommendation no estate would ever hear', () => {
    const readout = recommendationReadout(
      fixture(
        [recommendation('rec-1', 2), recommendation('rec-2', 0)],
        [estate('weak', 'Weak', [1]), estate('strong', 'Strong', [2])],
      ),
    );
    if (readout.kind !== 'readout') throw new Error('expected readout');
    expect(readout.neverFires).toEqual([{ id: 'rec-2', title: 'Title rec-2' }]);
    expect(readout.perEstate[0]!.fired).toEqual([{ id: 'rec-1', title: 'Title rec-1' }]);
    expect(readout.perEstate[1]!.fired).toEqual([{ id: 'rec-1', title: 'Title rec-1' }]);
  });

  it('is silent about an unanswered question (invariant #3)', () => {
    const readout = recommendationReadout(
      fixture([recommendation('rec-1', 2)], [estate('blank', 'Blank', [])]),
    );
    if (readout.kind !== 'readout') throw new Error('expected readout');
    expect(readout.perEstate[0]!.fired).toEqual([]);
    expect(readout.neverFires).toEqual([{ id: 'rec-1', title: 'Title rec-1' }]);
  });
});

describe('the SUSE set over the real workbook', () => {
  const parse = (path: string): Workbook =>
    WorkbookSchema.parse(
      JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')),
    );
  const SUSE = parse('../../../../v2/csf-estate-workbook.json');
  const NEUTRAL = parse('../../../../samples/csf-workbook.json');

  it('measures every offer against every shipped profile', () => {
    const readout = recommendationReadout(SUSE);
    if (readout.kind !== 'readout') throw new Error('expected readout');
    expect(readout.perEstate.map((e) => [e.estateId, e.fired.length])).toEqual([
      ['profile-a', 11],
      ['profile-base', 7],
      ['profile-m', 11],
    ]);
    expect(readout.catalogue).toHaveLength(11);
  });

  it('tells the sovereign profile which seven it hears', () => {
    const readout = recommendationReadout(SUSE);
    if (readout.kind !== 'readout') throw new Error('expected readout');
    expect(readout.perEstate[1]!.fired.map((r) => r.id)).toEqual([
      'suse-strategic-digital-sovereignty',
      'suse-operational-sovereignty',
      'suse-supply-chain-sovereignty',
      'suse-technology-sovereignty',
      'suse-security-compliance-sovereignty',
      'suse-environmental-sustainability',
      'suse-application-collection',
    ]);
  });

  it('carries no dead ad in the shipped set', () => {
    const readout = recommendationReadout(SUSE);
    if (readout.kind !== 'readout') throw new Error('expected readout');
    expect(readout.neverFires).toEqual([]);
  });

  it('leaves the neutral instrument without a gauge (invariant #8)', () => {
    expect(recommendationReadout(NEUTRAL)).toEqual({ kind: 'none-authored' });
  });
});
