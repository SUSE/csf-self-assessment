import { describe, expect, it } from 'vitest';
import { WorkbookAssessmentSchema, WorkbookSchema } from '../schema';
import type { Assessment, EstateBase, Party, Workbook, WorkbookAssessment } from '../schema';
import { assessmentOf } from '../assessment';
import {
  absorb,
  nameTokens,
  pairSides,
  pairTitle,
  partyChoiceKey,
  partyOptionsFor,
  servesLabels,
  splitIdFor,
  suggestPartyPairs,
  upsertPartyDecision,
} from './parties';

const party = (id: string, name: string, type: string, serves: string[]): Party => ({
  id,
  name,
  type,
  serves,
});

const WB: Workbook = WorkbookSchema.parse({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage', critical: true },
    { id: 'edge', name: 'Edge (DDoS, CDN, DNS)', critical: true },
    { id: 'aiml', name: 'AI/ML', critical: true },
    { id: 'software-supply', name: 'Software supply & development', critical: true },
  ],
  roles: [{ id: 'SEC', name: 'Security' }],
  parties: [
    { id: 'assessed', name: 'The institution', kind: 'assessed' },
    { id: 'service-provider', name: 'Service provider (third-party)', kind: 'third-party' },
    { id: 'subcontractor', name: 'Subcontractor', kind: 'third-party' },
    { id: 'supplier', name: 'Supplier', kind: 'third-party' },
  ],
  objectives: [
    {
      id: 'SOV-1',
      name: 'Tech',
      weight: 100,
      questions: [
        {
          id: 'SOV-1.pq',
          grain: 'party',
          text: 'p?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: [0, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal })),
        },
      ],
    },
  ],
});

const INST = party('inst', 'The institution', 'assessed', []);

const WA: WorkbookAssessment = WorkbookAssessmentSchema.parse({
  meta: {
    id: 'wa-1',
    estate: 'E',
    workbookId: 'wb',
    workbookVersion: '1.0.0',
    createdAt: 'T0',
  },
  workbook: WB,
  parties: [INST],
});

const incomingWith = (partiesAdded: Party[]): Assessment =>
  assessmentOf(WB, 'E', [INST], [], {
    kind: 'partial',
    workbookAssessment: 'wa-1',
    participant: { name: 'Jane' },
    claims: [],
    partiesAdded,
  });

const baseOf = (parties: Party[]): EstateBase => ({ parties, answers: [] });

describe('name tokens', () => {
  it('drops legal forms, articles and single characters', () => {
    expect(nameTokens('Acme Cloud Europe SAS')).toEqual(['acme', 'cloud', 'europe']);
    expect(nameTokens('The institution')).toEqual(['institution']);
    expect(nameTokens('SiliconWare Corp.')).toEqual(['siliconware']);
  });
});

describe('splitIdFor', () => {
  it('keeps a free id and namespaces a taken one', () => {
    expect(splitIdFor('acme-eu', 'Jane', ['inst', 'acme-cloud'])).toBe('acme-eu');
    expect(splitIdFor('modelhouse', 'Jane', ['inst', 'modelhouse'])).toBe('modelhouse-jane');
    expect(splitIdFor('modelhouse', 'Jane', ['modelhouse', 'modelhouse-jane'])).toBe(
      'modelhouse-jane-2',
    );
  });
});

describe('absorb', () => {
  const survivor = party('mh', 'Modelhouse AI', 'subcontractor', ['aiml']);
  const absorbed = party('mh2', 'Modelhouse AI GmbH', 'supplier', ['aiml', 'software-supply']);

  it('keeps the survivor id and type, takes the name and the union of serves', () => {
    expect(absorb(survivor, absorbed, 'Modelhouse AI GmbH')).toEqual({
      party: {
        id: 'mh',
        name: 'Modelhouse AI GmbH',
        type: 'subcontractor',
        serves: ['aiml', 'software-supply'],
      },
      servesAdded: ['software-supply'],
    });
  });

  it('inherits nothing from a subset', () => {
    expect(absorb(absorbed, survivor, 'Modelhouse AI').servesAdded).toEqual([]);
  });
});

describe('suggestPartyPairs', () => {
  const ACME_BASE = baseOf([
    INST,
    party('acme-cloud', 'Acme Cloud EU', 'service-provider', ['compute', 'storage']),
    party('northstar', 'Northstar Edge', 'service-provider', ['edge']),
  ]);

  it('proposes an alias pair only where the names share identity tokens', () => {
    const pairs = suggestPartyPairs(
      ACME_BASE,
      incomingWith([
        party('acme-eu', 'Acme Cloud Europe SAS', 'service-provider', ['compute', 'edge']),
        party('zeta', 'Zeta Holdings', 'service-provider', ['compute']),
      ]),
    );
    expect(pairs).toHaveLength(1);
    const pair = pairs[0];
    expect(pair.kind).toBe('alias');
    if (pair.kind !== 'alias') throw new Error('expected an alias pair');
    expect(pair.base.id).toBe('acme-cloud');
    expect(pair.incoming.id).toBe('acme-eu');
    expect(pair.sharedTokens).toEqual(['acme', 'cloud']);
    expect(pair.score).toBe(5);
    expect(pair.serves).toEqual({
      shared: ['compute'],
      baseOnly: ['storage'],
      incomingOnly: ['edge'],
    });
    expect(pair.splitId).toBe('acme-eu');
  });

  it('the assessed party is never an alias candidate', () => {
    expect(
      suggestPartyPairs(
        ACME_BASE,
        incomingWith([party('inst-two', 'The institution annex', 'service-provider', [])]),
      ),
    ).toEqual([]);
  });

  it('id collisions come first, aliases by score', () => {
    const pairs = suggestPartyPairs(
      baseOf([
        party('mh', 'Modelhouse AI', 'subcontractor', ['aiml']),
        party('acme-cloud', 'Acme Cloud EU', 'service-provider', ['compute']),
        party('acme-north', 'Acme Northern', 'service-provider', []),
      ]),
      incomingWith([
        party('acme-eu', 'Acme Cloud Europe', 'service-provider', ['compute']),
        party('mh', 'Modelhouse AI GmbH', 'subcontractor', ['aiml', 'software-supply']),
      ]),
    );
    expect(
      pairs.map((p) =>
        p.kind === 'id-collision'
          ? `id-collision ${p.id}`
          : `alias ${p.incoming.id}↔${p.base.id}`,
      ),
    ).toEqual(['id-collision mh', 'alias acme-eu↔acme-cloud', 'alias acme-eu↔acme-north']);
    const [, first, second] = pairs;
    if (first.kind !== 'alias' || second.kind !== 'alias') throw new Error('expected alias pairs');
    expect(first.score).toBe(5);
    expect(second.score).toBe(2);
  });

  it('an identical same-id addition proposes nothing', () => {
    const base = baseOf([party('mh', 'Modelhouse AI', 'subcontractor', ['aiml'])]);
    expect(
      suggestPartyPairs(base, incomingWith([party('mh', 'Modelhouse AI', 'subcontractor', ['aiml'])])),
    ).toEqual([]);
    const pairs = suggestPartyPairs(
      base,
      incomingWith([party('mh', 'Modelhouse AI', 'subcontractor', ['aiml', 'software-supply'])]),
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('id-collision');
  });
});

describe('the enumerated party choices', () => {
  const aliasPair = suggestPartyPairs(
    baseOf([INST, party('acme-cloud', 'Acme Cloud EU', 'service-provider', ['compute', 'storage'])]),
    incomingWith([party('acme-eu', 'Acme Cloud Europe SAS', 'service-provider', ['compute', 'edge'])]),
  )[0];

  const collisionPair = suggestPartyPairs(
    baseOf([party('mh', 'Modelhouse AI', 'subcontractor', ['aiml'])]),
    incomingWith([party('mh', 'Modelhouse AI GmbH', 'subcontractor', ['aiml', 'software-supply'])]),
  )[0];

  it('offers two names and a split, nothing pre-selected', () => {
    const options = partyOptionsFor(aliasPair, 'Jane');
    expect(options.map((o) => o.key)).toEqual([
      'absorb:acme-cloud:Acme Cloud EU',
      'absorb:acme-cloud:Acme Cloud Europe SAS',
      'split:acme-eu',
    ]);
    expect(options.map((o) => o.label)).toEqual([
      'One provider — keep the estate’s name “Acme Cloud EU”',
      'One provider — keep Jane’s name “Acme Cloud Europe SAS”',
      'Two providers — Jane’s stays acme-eu',
    ]);
  });

  it('names the minted id when a split must rename', () => {
    const options = partyOptionsFor(collisionPair, 'Jane');
    expect(options[2].label).toBe('Two providers — Jane’s becomes mh-jane');
  });

  it('offers one absorb when both names are identical', () => {
    const pair = suggestPartyPairs(
      baseOf([party('mh', 'Modelhouse AI', 'subcontractor', ['aiml'])]),
      incomingWith([party('mh', 'Modelhouse AI', 'subcontractor', ['aiml', 'software-supply'])]),
    )[0];
    const options = partyOptionsFor(pair, 'Jane');
    expect(options).toHaveLength(2);
    expect(options[0].label).toBe('One provider — keep the name “Modelhouse AI”');
  });

  it('every option key round-trips through partyChoiceKey', () => {
    for (const pair of [aliasPair, collisionPair]) {
      for (const option of partyOptionsFor(pair, 'Jane')) {
        expect(partyChoiceKey(option.choice)).toBe(option.key);
      }
    }
  });

  it('reads the two sides estate first', () => {
    const sides = pairSides(aliasPair, WA, 'Jane');
    expect(sides[0].from).toBe('The estate');
    expect(sides[0].party.id).toBe('acme-cloud');
    expect(sides[0].typeName).toBe('Service provider (third-party)');
    expect(sides[1].from).toBe('Jane');
    expect(sides[1].party.id).toBe('acme-eu');
    const thin = WorkbookAssessmentSchema.parse({
      ...WA,
      workbook: { ...WB, parties: WB.parties.filter((t) => t.kind === 'assessed') },
    });
    expect(pairSides(aliasPair, thin, 'Jane')[0].typeName).toBe('service-provider');
  });

  it('titles each class', () => {
    expect(pairTitle(aliasPair)).toBe(
      'Same provider? — “Acme Cloud Europe SAS” (acme-eu) and “Acme Cloud EU” (acme-cloud)',
    );
    expect(pairTitle(collisionPair)).toBe('Same id, two providers — mh');
  });

  it('labels serves, falling back to the raw id', () => {
    expect(servesLabels(['compute', 'nope'], WA)).toEqual(['Compute', 'nope']);
  });
});

describe('upsertPartyDecision', () => {
  it('replaces a decision on the same addition and keeps the rest in order', () => {
    const first = {
      added: 'acme-eu',
      choice: { kind: 'absorb', into: 'acme-cloud', name: 'Acme Cloud EU' },
      note: '',
    } as const;
    const second = {
      added: 'acme-eu',
      choice: { kind: 'split', id: 'acme-eu', from: 'acme-cloud' },
      note: 'two',
    } as const;
    const third = {
      added: 'mh',
      choice: { kind: 'absorb', into: 'mh', name: 'Modelhouse AI GmbH' },
      note: '',
    } as const;
    expect(upsertPartyDecision(upsertPartyDecision([first], second), third)).toEqual([
      second,
      third,
    ]);
  });
});
