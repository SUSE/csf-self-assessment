import { describe, expect, it } from 'vitest';
import type { Answer, Claim, Target, Workbook } from '../schema';
import { WorkbookSchema } from '../schema';
import { authorityLabel, authorityOf, candidateProvenance } from './authority';

const question = (id: string, role: string, extra: Record<string, unknown>) => ({
  id,
  text: 'q?',
  why: 'b',
  role,
  defaultMateriality: 'material',
  ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal })),
  ...extra,
});

const WORKBOOK: Workbook = WorkbookSchema.parse({
  meta: { id: 'wb', version: '1.0.0', title: 'W' },
  sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
  roles: [
    { id: 'ARCH', name: 'Architect' },
    { id: 'SEC', name: 'Security' },
  ],
  parties: [
    { id: 'institution', name: 'Institution', kind: 'assessed' },
    { id: 'subprocessor', name: 'Subprocessor', kind: 'third-party' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', strata: ['chips', 'servers'] },
    { id: 'storage', name: 'Storage' },
  ],
  objectives: [
    {
      id: 'SOV-1',
      name: 'O',
      weight: 100,
      questions: [
        question('qd', 'ARCH', { grain: 'dimension', appliesTo: ['compute', 'storage'] }),
        question('qp', 'SEC', { grain: 'party', axis: 'party' }),
      ],
    },
  ],
});

const QD = WORKBOOK.objectives[0].questions[0];
const QP = WORKBOOK.objectives[0].questions[1];

const COMPUTE: Target = { kind: 'dimension', dimension: 'compute' };
const CHIPS: Target = { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' };
const AWS: Target = { kind: 'party', party: 'aws' };
const WHOLE: Target = { kind: 'assessment' };

const claim = (roles: string[], dimensions: string[], parties: string[]): Claim => ({
  roles,
  dimensions,
  parties,
});

const answerOn = (questionId: string, target: Target): Answer => ({
  questionId,
  target,
  state: 'answered',
  rungId: 'choice-3',
  gesture: { groupId: 'g1', placement: 'individual' },
});

describe('authorityOf', () => {
  it('a claim whose roles do not include the question role covers nothing', () => {
    expect(authorityOf([claim(['SEC'], ['compute'], [])], QD, COMPUTE)).toBe('out-of-claim');
  });

  it('a subject-naming claim confers owner on the dimension it names', () => {
    const claims = [claim(['ARCH'], ['compute'], [])];
    expect(authorityOf(claims, QD, COMPUTE)).toBe('owner');
    expect(authorityOf(claims, QD, CHIPS)).toBe('owner');
    expect(authorityOf(claims, QD, { kind: 'dimension', dimension: 'storage' })).toBe('out-of-claim');
  });

  it('a party-naming claim confers owner on the party it names', () => {
    const claims = [claim(['SEC'], [], ['aws'])];
    expect(authorityOf(claims, QP, AWS)).toBe('owner');
    expect(authorityOf(claims, QP, { kind: 'party', party: 'gcp' })).toBe('out-of-claim');
  });

  it('an empty-subject claim confers blanket, including on the whole assessment', () => {
    expect(authorityOf([claim(['ARCH'], [], [])], QD, COMPUTE)).toBe('blanket');
    expect(authorityOf([claim(['ARCH'], [], [])], QD, WHOLE)).toBe('blanket');
    expect(authorityOf([claim(['ARCH'], ['compute'], [])], QD, WHOLE)).toBe('out-of-claim');
  });

  it('the tiers do not shadow each other', () => {
    const claims = [claim(['ARCH'], [], []), claim(['ARCH'], ['compute'], [])];
    expect(authorityOf(claims, QD, COMPUTE)).toBe('owner');
  });
});

describe('candidateProvenance', () => {
  it('records the claim that conferred the rung, not the first that covered', () => {
    const blanket = claim(['ARCH'], [], []);
    const owner = claim(['ARCH'], ['compute'], []);
    expect(candidateProvenance(WORKBOOK, [blanket, owner], answerOn('qd', COMPUTE))).toEqual({
      claim: owner,
      authority: 'owner',
    });
    expect(candidateProvenance(WORKBOOK, [blanket], answerOn('qd', COMPUTE))).toEqual({
      claim: blanket,
      authority: 'blanket',
    });
  });

  it('no claims and an unknown question both yield no provenance', () => {
    expect(candidateProvenance(WORKBOOK, [], answerOn('qd', COMPUTE))).toEqual({
      claim: null,
      authority: 'out-of-claim',
    });
    expect(
      candidateProvenance(WORKBOOK, [claim(['ARCH'], [], [])], answerOn('nope', COMPUTE)),
    ).toEqual({ claim: null, authority: 'out-of-claim' });
  });
});

describe('authorityLabel', () => {
  it('names each rung', () => {
    expect(authorityLabel('owner')).toBe('claim owner');
    expect(authorityLabel('blanket')).toBe('blanket claim');
    expect(authorityLabel('out-of-claim')).toBe('outside their claims');
  });
});
