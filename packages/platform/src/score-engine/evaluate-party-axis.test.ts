import { describe, expect, it } from 'vitest';
import type { Answer, Party, Seal, Workbook } from '../schema';
import { AUTHOR_QA_PROVENANCE, answerFor, assessmentOf } from '../assessment';
import { evaluate } from './index';
import { FULL, G, obj, rungs, wb } from './fixtures';

/** A party-AXIS question: one unit per party on the roster. */
const partyQ = (id: string, materiality: string, seals: number[]) => ({
  id,
  grain: 'party',
  axis: 'party',
  text: id,
  why: 'why',
  role: 'LEG',
  defaultMateriality: materiality,
  ladder: rungs(seals),
});

const EW = wb([obj('O', 100, [partyQ('O.e1', 'material', FULL)])], [
  { id: 'compute', name: 'Compute', critical: true },
  { id: 'iam', name: 'IAM', critical: true },
]);

const ROSTER: Party[] = [
  { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
  { id: 'hyper', name: 'Hyperscaler', type: 'primary-provider', serves: ['compute', 'iam'] },
  { id: 'idp', name: 'IdP', type: 'subprocessor', serves: ['iam', 'compute'] },
];

// Every question here authors FULL, so SEAL n is the (n + 1)th rung.
const onParty = (questionId: string, party: string, seal: Seal): Answer =>
  answerFor(questionId, { kind: 'party', party }, { state: 'answered', rungId: `choice-${seal + 1}` }, G);

const partyDunno = (questionId: string, party: string): Answer =>
  answerFor(questionId, { kind: 'party', party }, { state: 'dont-know' }, G);

const runE = (parties: Party[], answers: Answer[], workbook: Workbook = EW) =>
  evaluate(workbook, assessmentOf(workbook, 'x', parties, answers, AUTHOR_QA_PROVENANCE));

const SPREAD = [onParty('O.e1', 'inst', 4), onParty('O.e1', 'hyper', 0), onParty('O.e1', 'idp', 2)];

describe('evaluate() — party axis', () => {
  it('fans a party-axis question over the parties; every material answer gates', () => {
    const r = runE(ROSTER, SPREAD);
    expect(r.overall.floor).toBe(0); // hyper's SEAL-0 gates
    expect(r.overall.binding).toEqual(['O.e1']);
    expect(r.overall.score).toBe(50); // earned (4+0+2)×25=150 / max 3×100=300
  });

  it('exposure: an edge per served dimension, coloured by the party worst seal, not painted into the heat map', () => {
    const r = runE(ROSTER, SPREAD);
    expect(r.exposure).toEqual([
      { party: 'hyper', dimension: 'compute', worstSeal: 0 },
      { party: 'hyper', dimension: 'iam', worstSeal: 0 },
      { party: 'idp', dimension: 'iam', worstSeal: 2 },
      { party: 'idp', dimension: 'compute', worstSeal: 2 },
    ]);
    expect(r.heatmap).toEqual([]); // party answers never paint dimension cells (spec §2.2.6)
    expect(r.declaredParties).toEqual([
      { id: 'inst', name: 'Institution', type: 'institution', kind: 'assessed', serves: [] },
      { id: 'hyper', name: 'Hyperscaler', type: 'primary-provider', kind: 'third-party', serves: ['compute', 'iam'] },
      { id: 'idp', name: 'IdP', type: 'subprocessor', kind: 'third-party', serves: ['iam', 'compute'] },
    ]);
  });

  it('a party serving a dimension the workbook does not carry yields no edge', () => {
    const parties: Party[] = [{ id: 'idp', name: 'IdP', type: 'subprocessor', serves: ['iam', 'ghost'] }];
    expect(runE(parties, [onParty('O.e1', 'idp', 1)]).exposure).toEqual([
      { party: 'idp', dimension: 'iam', worstSeal: 1 },
    ]);
  });

  it("exposure worstSeal is the MIN across a party's material party-axis answers; an unanswered served edge is null", () => {
    const twoQuestions = wb(
      [obj('O', 100, [partyQ('O.e1', 'material', FULL), partyQ('O.e2', 'material', FULL)])],
      [{ id: 'compute', name: 'Compute', critical: true }],
    );
    const hyper: Party[] = [{ id: 'hyper', name: 'H', type: 'primary-provider', serves: ['compute'] }];
    const answered = runE(hyper, [onParty('O.e1', 'hyper', 3), onParty('O.e2', 'hyper', 1)], twoQuestions);
    expect(answered.exposure).toEqual([{ party: 'hyper', dimension: 'compute', worstSeal: 1 }]);
    expect(runE(hyper, [], twoQuestions).exposure).toEqual([
      { party: 'hyper', dimension: 'compute', worstSeal: null },
    ]);
  });

  it("a per-provider don't-know is a floor hole, counts in the grand total, and sets no exposure colour", () => {
    const r = runE(ROSTER, [onParty('O.e1', 'inst', 4), partyDunno('O.e1', 'hyper'), onParty('O.e1', 'idp', 2)]);
    expect(r.overall.floor).toBe(2); // inst 4, idp 2; hyper's don't-know is off the floor
    expect(r.overall.unknowns).toEqual(['O.e1']);
    expect(r.overall.dontKnowCount).toBe(1);
    expect(r.exposure.filter((e) => e.party === 'hyper')).toEqual([
      { party: 'hyper', dimension: 'compute', worstSeal: null },
      { party: 'hyper', dimension: 'iam', worstSeal: null },
    ]);
  });

  it('the staircase tags the provider for a per-provider gating answer', () => {
    const bound = (party: string, seal: Seal) => ({
      questionId: 'O.e1',
      objectiveId: 'O',
      role: 'LEG',
      dimension: null,
      stratum: null,
      party,
      seal,
      evidence: null,
    });
    expect(runE(ROSTER, SPREAD).staircase).toEqual([
      { floor: 0, unlocksTo: 2, binding: [bound('hyper', 0)] },
      { floor: 2, unlocksTo: 4, binding: [bound('idp', 2)] },
    ]);
  });

  it('the assessed party is omitted from exposure even when it serves a dimension (invariant #6)', () => {
    const parties: Party[] = [
      { id: 'inst', name: 'Institution', type: 'institution', serves: ['compute', 'iam'] },
      { id: 'hyper', name: 'Hyperscaler', type: 'primary-provider', serves: ['compute'] },
    ];
    const r = runE(parties, [onParty('O.e1', 'inst', 0), onParty('O.e1', 'hyper', 2)]);
    expect(r.exposure).toEqual([{ party: 'hyper', dimension: 'compute', worstSeal: 2 }]);
    expect(r.declaredParties.find((p) => p.id === 'inst')?.kind).toBe('assessed');
  });
});
