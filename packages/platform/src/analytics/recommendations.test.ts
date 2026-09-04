import { describe, expect, it } from 'vitest';
import { AssessmentSchema, WorkbookSchema } from '../schema';
import type { Party, Recommendation } from '../schema';
import { evaluate } from '../score-engine';
import type { EngineResult } from '../score-engine';
import type { Workbook } from '../schema';
import {
  bodyBlocks,
  firedLinks,
  recommendationsPage,
  recommenderReading,
  type BandView,
  type RecommendationCard,
  type TriggerTarget,
} from './recommendations';
import { SUBJECT_A, SUBJECT_C, SUBJECT_EMPTY, SUBJECT_ONE, type Subject } from './subjects-fixture';

// The page is the one entry point now, so a band assertion asks it for the
// chapter it is about.
const band = (
  horizon: 'renewal' | 'strategic',
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): BandView =>
  recommendationsPage(result, workbook, parties).chapters.find((c) => c.horizon === horizon)!.band;
// Every answered target on a card, across its grouped questions.
const targetsOf = (card: RecommendationCard): TriggerTarget[] =>
  card.questions.flatMap((q) => q.targets);
const quickWins = (result: EngineResult, workbook: Workbook, parties: Party[]): BandView =>
  band('renewal', result, workbook, parties);
const strategicMoves = (result: EngineResult, workbook: Workbook, parties: Party[]): BandView =>
  band('strategic', result, workbook, parties);

const LADDER = [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal }));

const RAW_BASE = {
  meta: { id: 'wb', version: '1', title: 'T' },
  frontSheet: [],
  sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
  dimensions: [
    { id: 'compute', name: 'Compute', strata: ['chips', 'servers'], critical: true },
    { id: 'storage', name: 'Storage', critical: true },
  ],
  roles: [{ id: 'SEC', name: 'Security' }],
  parties: [{ id: 'institution', name: 'Institution', kind: 'assessed' }],
  objectives: [
    {
      id: 'SOV-A',
      name: 'Alpha',
      weight: 50,
      questions: [
        {
          id: 'A.compute',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 'How is compute governed?',
          why: 'w',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: LADDER,
        },
        {
          id: 'A.storage',
          grain: 'dimension',
          appliesTo: ['storage'],
          text: 'How is storage governed?',
          why: 'w',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: LADDER,
        },
      ],
    },
    {
      id: 'SOV-B',
      name: 'Beta',
      weight: 50,
      questions: [
        {
          id: 'B.info',
          grain: 'dimension',
          appliesTo: ['storage'],
          text: 'What does the storage inventory say?',
          why: 'w',
          role: 'SEC',
          defaultMateriality: 'informational',
          ladder: LADDER,
        },
      ],
    },
  ],
  testEstates: [],
};

const RECS = [
  { id: 'r-obj', links: [{ kind: 'objective', id: 'SOV-A' }], whenAtOrBelow: 1, horizon: 'strategic', order: 20 },
  { id: 'r-dim', links: [{ kind: 'dimension', id: 'compute' }], whenAtOrBelow: 2, horizon: 'renewal', order: 10 },
  { id: 'r-q', links: [{ kind: 'question', id: 'B.info' }], whenAtOrBelow: 2, horizon: 'renewal', order: 10 },
  { id: 'r-high', links: [{ kind: 'objective', id: 'SOV-B' }], whenAtOrBelow: 0, horizon: 'strategic', order: 1 },
  {
    id: 'r-union',
    links: [
      { kind: 'question', id: 'A.storage' },
      { kind: 'dimension', id: 'storage' },
      { kind: 'objective', id: 'SOV-A' },
    ],
    whenAtOrBelow: 1,
    horizon: 'strategic',
    order: 5,
  },
].map((r) => ({ ...r, title: `Title ${r.id}`, action: `Action ${r.id}`, body: ['one', 'two'] }));

const RECOMMENDER = {
  name: 'Vendor',
  disclosure: 'Vendor authored this instrument.',
  contact: { label: 'Contact us', url: 'https://example.invalid/contact' },
};

const WB = WorkbookSchema.parse({ ...RAW_BASE, recommender: RECOMMENDER, recommendations: RECS });
const WB_BARE = WorkbookSchema.parse(RAW_BASE);

const PARTIES: Party[] = [
  { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
];

const META = {
  workbookId: 'wb',
  workbookVersion: '1',
  estate: 'E',
  workbookAssessment: 'wa-1',
};

const G = { groupId: 'g1', placement: 'individual' as const };

const TARGETS = [
  { questionId: 'A.compute', target: { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' }, rungId: 'choice-1' },
  { questionId: 'A.compute', target: { kind: 'dimension-stratum', dimension: 'compute', stratum: 'servers' }, rungId: 'choice-4' },
  { questionId: 'A.storage', target: { kind: 'dimension', dimension: 'storage' }, rungId: 'choice-3' },
  { questionId: 'B.info', target: { kind: 'dimension', dimension: 'storage' }, rungId: 'choice-2' },
];

const ANSWERED = AssessmentSchema.parse({
  meta: META,
  workbook: WB,
  parties: PARTIES,
  answers: TARGETS.map((t) => ({ ...t, state: 'answered', gesture: G })),
});

const DONT_KNOW = AssessmentSchema.parse({
  meta: META,
  workbook: WB,
  parties: PARTIES,
  answers: TARGETS.map((t) => ({
    questionId: t.questionId,
    target: t.target,
    state: 'dont-know',
    gesture: G,
  })),
});

const RESULT = evaluate(WB, ANSWERED);
const RESULT_UNKNOWN = evaluate(WB, DONT_KNOW);

const rec = (id: string): Recommendation => {
  const found = WB.recommendations.find((r) => r.id === id);
  if (found === undefined) throw new Error(`no recommendation ${id}`);
  return found;
};

describe('the synthetic subject', () => {
  it('carries the four asserted facts the model tests read', () => {
    expect(
      RESULT.facts.map((f) => [
        f.objective,
        f.questionId,
        f.dimension,
        f.stratum,
        f.state,
        f.seal,
        f.materiality,
      ]),
    ).toEqual([
      ['SOV-A', 'A.compute', 'compute', 'chips', 'answered', 0, 'material'],
      ['SOV-A', 'A.compute', 'compute', 'servers', 'answered', 3, 'material'],
      ['SOV-A', 'A.storage', 'storage', null, 'answered', 2, 'material'],
      ['SOV-B', 'B.info', 'storage', null, 'answered', 1, 'informational'],
    ]);
  });
});

describe('firedLinks', () => {
  it('fires each link kind on the minimum asserted seal it covers', () => {
    expect(firedLinks(rec('r-obj'), RESULT.facts, WB)).toEqual([
      { link: { kind: 'objective', id: 'SOV-A' }, label: 'Alpha', seal: 0 },
    ]);
    expect(firedLinks(rec('r-dim'), RESULT.facts, WB)).toEqual([
      { link: { kind: 'dimension', id: 'compute' }, label: 'Compute', seal: 0 },
    ]);
    expect(firedLinks(rec('r-q'), RESULT.facts, WB)).toEqual([
      { link: { kind: 'question', id: 'B.info' }, label: 'B.info', seal: 1 },
    ]);
  });

  it('does not consult materiality — an informational answer fires a link', () => {
    expect(RESULT.facts.find((f) => f.questionId === 'B.info')?.materiality).toBe('informational');
    expect(firedLinks(rec('r-q'), RESULT.facts, WB)).toHaveLength(1);
  });

  it('stays silent above the threshold', () => {
    expect(firedLinks(rec('r-high'), RESULT.facts, WB)).toEqual([]);
  });

  it('unions its links, each judged on its own reading', () => {
    expect(firedLinks(rec('r-union'), RESULT.facts, WB)).toEqual([
      { link: { kind: 'dimension', id: 'storage' }, label: 'Storage', seal: 1 },
      { link: { kind: 'objective', id: 'SOV-A' }, label: 'Alpha', seal: 0 },
    ]);
  });

  it('fires nothing when nothing is answered (invariant #3)', () => {
    for (const r of WB.recommendations) {
      expect(firedLinks(r, RESULT_UNKNOWN.facts, WB)).toEqual([]);
    }
  });
});

describe('the horizon chapters', () => {
  it('builds the card from the weakest fired link', () => {
    const view = strategicMoves(RESULT, WB, PARTIES);
    if (view.kind !== 'cards') throw new Error('expected cards');
    const card = view.cards.find((c) => c.id === 'r-union');
    expect(card?.trigger.link).toEqual({ kind: 'objective', id: 'SOV-A' });
    expect(card?.trigger.seal).toBe(0);
    // Grouped by question, weakest first, and each question's own targets with it:
    // the compute question is asked once and carries both of its strata.
    expect(card?.questions).toEqual([
      {
        questionId: 'A.compute',
        questionText: 'How is compute governed?',
        seal: 0,
        targets: [
          { key: 'A.compute|compute|chips|null', targetLabel: 'Compute · chips', seal: 0 },
          { key: 'A.compute|compute|servers|null', targetLabel: 'Compute · servers', seal: 3 },
        ],
      },
      {
        questionId: 'A.storage',
        questionText: 'How is storage governed?',
        seal: 2,
        targets: [{ key: 'A.storage|storage|null|null', targetLabel: 'Storage', seal: 2 }],
      },
    ]);
  });

  it('sorts each band by authored order, then id', () => {
    const strategic = strategicMoves(RESULT, WB, PARTIES);
    if (strategic.kind !== 'cards') throw new Error('expected cards');
    expect(strategic.cards.map((c) => c.id)).toEqual(['r-union', 'r-obj']);
    const renewal = quickWins(RESULT, WB, PARTIES);
    if (renewal.kind !== 'cards') throw new Error('expected cards');
    expect(renewal.cards.map((c) => c.id)).toEqual(['r-dim', 'r-q']);
  });

  it('says which empty state it is in', () => {
    expect(strategicMoves(RESULT_UNKNOWN, WB, PARTIES)).toEqual({
      kind: 'none-fired',
      authored: 3,
      reason:
        '3 strategic recommendations are authored; none matches this estate’s answers yet.',
    });
    expect(quickWins(RESULT, WB_BARE, PARTIES)).toEqual({
      kind: 'none-authored',
      reason: 'No renewal-scale recommendations in this workbook.',
    });
  });
});

describe('recommenderReading', () => {
  it('names who is speaking and how much of the catalogue is live', () => {
    expect(recommenderReading(RESULT, WB)).toEqual({
      kind: 'recommender',
      name: 'Vendor',
      headline: 'Recommendations from Vendor',
      disclosure: 'Vendor authored this instrument.',
      contact: { label: 'Contact us', url: 'https://example.invalid/contact' },
      live: 4,
      catalogue: 5,
      reading: '4 of 5 live on this estate',
    });
  });

  // The contact is optional: attribution still reads in
  // full, and `contact: null` is what makes both surfaces drop their button.
  it('reads a recommender that offers no contact', () => {
    const wb = WorkbookSchema.parse({
      ...RAW_BASE,
      recommender: { name: 'Vendor', disclosure: 'Vendor authored this instrument.' },
      recommendations: RECS,
    });
    expect(recommenderReading(RESULT, wb)).toEqual({
      kind: 'recommender',
      name: 'Vendor',
      headline: 'Recommendations from Vendor',
      disclosure: 'Vendor authored this instrument.',
      contact: null,
      live: 4,
      catalogue: 5,
      reading: '4 of 5 live on this estate',
    });
  });

  it('is absent when the workbook names no recommender', () => {
    expect(recommenderReading(RESULT, WB_BARE)).toEqual({
      kind: 'absent',
      reason: 'This workbook names no recommender, so nothing here is attributed.',
    });
  });
});

describe('bodyBlocks', () => {
  it('classifies runs of bullet lines into one block', () => {
    expect(
      bodyBlocks(['Intro paragraph.', '- first', '- second', 'Closing paragraph.', '- lone']),
    ).toEqual([
      { kind: 'paragraph', key: 'p:0', text: 'Intro paragraph.' },
      { kind: 'bullets', key: 'b:1', items: ['first', 'second'] },
      { kind: 'paragraph', key: 'p:3', text: 'Closing paragraph.' },
      { kind: 'bullets', key: 'b:4', items: ['lone'] },
    ]);
    expect(bodyBlocks([])).toEqual([]);
  });
});

describe('the SUSE set over the real fixtures', () => {
  it('fires eight strategic cards on the landed union', () => {
    const view = strategicMoves(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'cards') throw new Error('expected cards');
    expect(view.cards).toHaveLength(8);
    expect(view.cards.map((c) => c.id)).toEqual([
      'suse-strategic-digital-sovereignty',
      'suse-legal-jurisdictional-sovereignty',
      'suse-data-ai-sovereignty',
      'suse-operational-sovereignty',
      'suse-supply-chain-sovereignty',
      'suse-technology-sovereignty',
      'suse-security-compliance-sovereignty',
      'suse-environmental-sustainability',
    ]);
    expect(view.cards.map((c) => c.trigger.link)).toEqual([
      { kind: 'objective', id: 'SOV-1' },
      { kind: 'objective', id: 'SOV-2' },
      { kind: 'objective', id: 'SOV-3' },
      { kind: 'objective', id: 'SOV-4' },
      { kind: 'objective', id: 'SOV-5' },
      { kind: 'objective', id: 'SOV-6' },
      { kind: 'objective', id: 'SOV-7' },
      { kind: 'objective', id: 'SOV-8' },
    ]);
    expect(view.cards.map((c) => c.trigger.seal)).toEqual([0, 0, 1, 0, 1, 1, 0, 2]);
    expect(view.cards.map((c) => c.trigger.label)).toEqual([
      'Strategic Sovereignty',
      'Legal & Jurisdictional Sovereignty',
      'Data & AI Sovereignty',
      'Operational Sovereignty',
      'Supply Chain Sovereignty',
      'Technology Sovereignty',
      'Security & Compliance Sovereignty',
      'Environmental Sustainability',
    ]);
    expect(view.cards.map((c) => c.fired.length)).toEqual([1, 1, 2, 1, 2, 1, 1, 2]);
    expect(view.cards.map((c) => targetsOf(c).length)).toEqual([10, 9, 11, 22, 13, 8, 8, 3]);
    expect(view.cards.map((c) => c.body.length)).toEqual([2, 9, 7, 7, 7, 7, 8, 3]);
  });

  it('leaves the SOV-1 card exactly as it was', () => {
    const view = strategicMoves(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'cards') throw new Error('expected cards');
    const card = view.cards[0]!;
    expect(card.title).toBe('Strategic Digital Sovereignty');
    expect([...targetsOf(card).map((t) => t.seal)].sort()).toEqual([0, 1, 1, 1, 1, 2, 2, 2, 3, 3]);
    // Weakest question first, and its weakest target first inside it.
    expect(card.questions[0]!.questionId).toBe('SOV-1.decisive-authority');
    expect(card.questions[0]!.questionText).toBe(
      "Where does ultimate decisive authority over this party's strategic, financial, operational decisions reside?",
    );
    expect(card.questions[0]!.targets[0]).toEqual({
      key: 'SOV-1.decisive-authority|null|null|acme-eu',
      targetLabel: 'Acme Cloud Europe SAS',
      seal: 0,
    });
  });

  it('fires three quick wins on the landed union, led by Multi Linux Support', () => {
    const view = quickWins(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'cards') throw new Error('expected cards');
    expect(view.cards).toHaveLength(3);
    expect(view.cards.map((c) => c.id)).toEqual([
      'suse-multi-linux-support',
      'suse-application-collection',
      'suse-sovereign-premium-support',
    ]);
    expect(view.cards.map((c) => c.trigger)).toEqual([
      {
        link: { kind: 'question', id: 'SOV-4.licence-tether' },
        label: 'SOV-4.licence-tether',
        seal: 2,
      },
      {
        link: { kind: 'question', id: 'SOV-5.upstream-cutoff' },
        label: 'SOV-5.upstream-cutoff',
        seal: 1,
      },
      {
        link: { kind: 'question', id: 'SOV-1.decisive-authority' },
        label: 'SOV-1.decisive-authority',
        seal: 0,
      },
    ]);
    expect(view.cards.map((c) => c.fired.length)).toEqual([2, 2, 3]);
    expect(view.cards.map((c) => targetsOf(c).length)).toEqual([3, 1, 5]);
  });

  it('shows the answers behind the lead quick win, under their one question', () => {
    const view = quickWins(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'cards') throw new Error('expected cards');
    const text =
      'For this dimension, does continued operation depend on contact with a non-EU-controlled licence or entitlement server?';
    expect(view.cards[0]!.questions).toEqual([
      {
        questionId: 'SOV-4.licence-tether',
        questionText: text,
        seal: 2,
        targets: [
          { key: 'SOV-4.licence-tether|compute|null|null', targetLabel: 'Compute', seal: 2 },
          { key: 'SOV-4.licence-tether|security|null|null', targetLabel: 'Security', seal: 2 },
          {
            key: 'SOV-4.licence-tether|platform|null|null',
            targetLabel: 'Platform (Containers, PaaS)',
            seal: 3,
          },
        ],
      },
    ]);
  });

  it('attributes the pitch to SUSE', () => {
    expect(recommenderReading(SUBJECT_C.result, SUBJECT_C.workbook)).toEqual({
      kind: 'recommender',
      name: 'SUSE',
      headline: 'Recommendations from SUSE',
      disclosure:
        'SUSE authored this instrument and sells the offers below. A recommendation moves no number in this assessment.',
      contact: { label: 'Talk to an Expert', url: 'https://www.suse.com/contact/' },
      live: 11,
      catalogue: 11,
      reading: '11 of 11 live on this estate',
    });
  });

  it('already fires on one participant’s own answers', () => {
    const strategic = strategicMoves(SUBJECT_A.result, SUBJECT_A.workbook, SUBJECT_A.parties);
    if (strategic.kind !== 'cards') throw new Error('expected cards');
    expect(strategic.cards).toHaveLength(8);
    expect(strategic.cards.map((c) => c.trigger.seal)).toEqual([1, 1, 1, 1, 1, 1, 1, 2]);
    expect(strategic.cards.map((c) => targetsOf(c).length)).toEqual([7, 7, 12, 19, 11, 8, 7, 3]);
    const renewal = quickWins(SUBJECT_A.result, SUBJECT_A.workbook, SUBJECT_A.parties);
    if (renewal.kind !== 'cards') throw new Error('expected cards');
    expect(renewal.cards).toHaveLength(3);
    expect(renewal.cards.map((c) => c.trigger.seal)).toEqual([2, 1, 1]);
  });

  it('carries the per-dimension minimum asserted seal §2.3 quotes', () => {
    const minima: Record<string, number> = {};
    for (const fact of SUBJECT_C.result.facts) {
      if (fact.state !== 'answered' || fact.seal === null || fact.dimension === null) continue;
      const seen = minima[fact.dimension];
      minima[fact.dimension] = seen === undefined ? fact.seal : Math.min(seen, fact.seal);
    }
    expect(minima).toEqual({
      compute: 0,
      storage: 0,
      network: 1,
      iam: 0,
      platform: 1,
      aiml: 1,
      'software-supply': 1,
      security: 1,
      edge: 1,
      facilities: 2,
    });
  });

  it('stays silent with nothing answered (invariant #3)', () => {
    expect(
      quickWins(SUBJECT_EMPTY.result, SUBJECT_EMPTY.workbook, SUBJECT_EMPTY.parties),
    ).toEqual({
      kind: 'none-fired',
      authored: 3,
      reason: '3 renewal recommendations are authored; none matches this estate’s answers yet.',
    });
    expect(
      strategicMoves(SUBJECT_EMPTY.result, SUBJECT_EMPTY.workbook, SUBJECT_EMPTY.parties),
    ).toEqual({
      kind: 'none-fired',
      authored: 8,
      reason: '8 strategic recommendations are authored; none matches this estate’s answers yet.',
    });
    const tile = recommenderReading(SUBJECT_EMPTY.result, SUBJECT_EMPTY.workbook);
    if (tile.kind !== 'recommender') throw new Error('expected recommender');
    expect(tile.live).toBe(0);
    expect(tile.reading).toBe('0 of 11 live on this estate');
  });

  it('reads the same after one landing as the participant read alone', () => {
    const chips = (subject: Subject, tile: typeof strategicMoves) => {
      const view = tile(subject.result, subject.workbook, subject.parties);
      if (view.kind !== 'cards') throw new Error('expected cards');
      return view.cards.map((c) => ({
        id: c.id,
        chip: `${c.trigger.label} · SEAL-${c.trigger.seal}`,
        targets: targetsOf(c).length,
      }));
    };

    expect(recommenderReading(SUBJECT_ONE.result, SUBJECT_ONE.workbook)).toMatchObject({
      kind: 'recommender',
      reading: '11 of 11 live on this estate',
    });

    const strategic = chips(SUBJECT_ONE, strategicMoves);
    expect(strategic).toHaveLength(8);
    expect(strategic.map((c) => c.chip)).toEqual([
      'Strategic Sovereignty · SEAL-1',
      'Legal & Jurisdictional Sovereignty · SEAL-1',
      'Data & AI Sovereignty · SEAL-1',
      'Operational Sovereignty · SEAL-1',
      'Supply Chain Sovereignty · SEAL-1',
      'Technology Sovereignty · SEAL-1',
      'Security & Compliance Sovereignty · SEAL-1',
      'Environmental Sustainability · SEAL-2',
    ]);

    const renewal = chips(SUBJECT_ONE, quickWins);
    expect(renewal).toHaveLength(3);
    expect(renewal.map((c) => c.chip)).toEqual([
      'SOV-4.licence-tether · SEAL-2',
      'SOV-5.upstream-cutoff · SEAL-1',
      'SOV-1.decisive-authority · SEAL-1',
    ]);

    expect(strategic).toEqual(chips(SUBJECT_A, strategicMoves));
    expect(renewal).toEqual(chips(SUBJECT_A, quickWins));
  });
});
