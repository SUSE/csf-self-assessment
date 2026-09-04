import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { Answer, DimensionQuestion, Party, Seal, Target } from '../schema';
import { assessmentOf, answerFor, applyPlacement, defaultParties, placeGroupParty, questionOf, AUTHOR_QA_PROVENANCE } from '../assessment';
import { evaluate } from './index';
import { sampleWorkbookRaw } from '../test-fixtures';

const WB = WorkbookSchema.parse(sampleWorkbookRaw);

// The six EC-floor criticals (now firm on the workbook) + a controlled provider
// set: the institution (serves nothing → no exposure), an EU primary provider, and
// a non-EU identity provider that serves everything — the kill-switch the heat map
// cannot show.
const PARTIES: Party[] = [
  { id: 'institution', name: 'Our institution', type: 'institution', serves: [] },
  { id: 'primary', name: 'Primary provider', type: 'primary-provider', serves: ['compute', 'storage', 'network', 'iam', 'platform', 'security'] },
  { id: 'idp', name: 'Non-EU IdP', type: 'subprocessor', serves: ['iam', 'compute', 'storage', 'network', 'platform', 'security'] },
];

const q5raw = WB.objectives.find((o) => o.id === 'SOV-6')?.questions.find((x) => x.id === 'SOV-6.q5');
if (!q5raw || q5raw.grain !== 'dimension') throw new Error('sample must carry the dimension question SOV-6.q5');
const q5: DimensionQuestion = q5raw;

const T: Target = { kind: 'assessment' };
const G = { groupId: 'g0', placement: 'individual' as const };
// The sample's ladders are sparse, so a SEAL never names a rung by position.
const rungIdFor = (questionId: string, seal: Seal): string => {
  const rung = questionOf(WB, questionId)?.ladder.find((r) => r.seal === seal);
  if (!rung) throw new Error(`no rung at SEAL ${seal} on ${questionId}`);
  return rung.id;
};

const ent = (id: string, seal: Seal): Answer =>
  answerFor(id, T, { state: 'answered', rungId: rungIdFor(id, seal) }, G);
const prov = (id: string, party: string, seal: Seal): Answer =>
  answerFor(id, { kind: 'party', party }, { state: 'answered', rungId: rungIdFor(id, seal) }, G);
const provDunno = (id: string, party: string): Answer =>
  answerFor(id, { kind: 'party', party }, { state: 'dont-know' }, G);
const q5group = (seal: Seal): Answer[] =>
  applyPlacement([], q5, WB, { kind: 'group', choice: { state: 'answered', rungId: rungIdFor('SOV-6.q5', seal) }, splitDimensions: [] }, 'g1');
const run = (parties: Party[], answers: Answer[]) => evaluate(WB, assessmentOf(WB, 'Sample estate', parties, answers, AUTHOR_QA_PROVENANCE));

// jurisdiction (q1, ladder 0/2/4) + ownership (q2, ladder 0/1/3), answered per provider:
// institution sovereign, EU primary sovereign, non-EU IdP compellable (SEAL-0).
const perProvider: Answer[] = [
  prov('SOV-2.q1', 'institution', 4), prov('SOV-2.q1', 'primary', 4), prov('SOV-2.q1', 'idp', 0),
  prov('SOV-2.q2', 'institution', 3), prov('SOV-2.q2', 'primary', 3), prov('SOV-2.q2', 'idp', 0),
];

describe('sample workbook — structure (S6+S7)', () => {
  it('jurisdiction + ownership fan over providers; exit + facilities are asked once', () => {
    const sov2 = WB.objectives.find((o) => o.id === 'SOV-2');
    const axisOf = (id: string): string | null => {
      const q = sov2?.questions.find((x) => x.id === id);
      return q && q.grain === 'party' ? q.axis : null;
    };
    expect(axisOf('SOV-2.q1')).toBe('party');
    expect(axisOf('SOV-2.q2')).toBe('party');
    expect(axisOf('SOV-2.q3')).toBe('assessment');
    expect(axisOf('SOV-2.q4')).toBe('assessment');
    expect(sov2?.questions.filter((x) => x.defaultMateriality === 'informational').map((x) => x.id)).toEqual(['SOV-2.q4']);
    expect(q5.appliesTo).toEqual(['compute', 'storage', 'network', 'iam', 'platform', 'security']);
    expect(WB.dimensions.find((d) => d.id === 'compute')?.strata).toEqual(['service', 'software', 'hardware', 'chips']);
    expect(WB.dimensions.find((d) => d.id === 'storage')?.strata).toEqual(['service', 'software', 'hardware', 'chips']);
    expect(WB.dimensions.find((d) => d.id === 'iam')?.strata).toBeUndefined();
  });

  it('the six EC-floor criticals are the firm workbook flag; the rest are in scope but not critical', () => {
    const critical = WB.dimensions.filter((d) => d.critical).map((d) => d.id);
    expect(critical).toEqual(['compute', 'storage', 'network', 'iam', 'platform', 'security']);
    expect(WB.dimensions.map((d) => d.id)).toEqual([
      'compute', 'storage', 'network', 'iam', 'platform', 'security', 'aiml', 'edge', 'facilities',
    ]);
  });

  it('the default parties are the institution + a graceful default provider over every dimension', () => {
    expect(defaultParties(WB)).toEqual([
      { id: 'institution', name: 'Our institution', type: 'institution', serves: [] },
      {
        id: 'primary-provider',
        name: 'Primary provider',
        type: 'primary-provider',
        serves: ['compute', 'storage', 'network', 'iam', 'platform', 'security', 'aiml', 'edge', 'facilities'],
      },
    ]);
  });
});

describe('sample workbook — the S6 kill-switch demo', () => {
  // Per-provider jurisdiction/ownership (IdP compellable) + the six criticals swept to
  // SEAL-3 (a sovereign-looking heat map).
  const demo = [...perProvider, ent('SOV-2.q3', 4), ...q5group(3)];

  it('a compellable provider floors the assessment while the heat map stays green', () => {
    const r = run(PARTIES, demo);
    expect(r.overall.floor).toBe(0); // the IdP's SEAL-0 jurisdiction + ownership
    expect(r.overall.binding).toEqual(['SOV-2.q1', 'SOV-2.q2']);
    expect(r.overall.score).toBeCloseTo(73.2, 5);
    expect(r.overall.answered).toBe(4); // q1,q2,q3 + the complete q5 (q4 informational, unanswered)
    expect(r.overall.total).toBe(5);
    // Heat map (dimension answers) shows the six criticals sovereign — SEAL-3 …
    expect(r.heatmap).toHaveLength(6);
    expect(r.heatmap.every((c) => c.seal === 3)).toBe(true);
    // … yet the exposure map screams: the IdP is compellable (SEAL-0) across all six.
    const idp = r.exposure.filter((e) => e.party === 'idp');
    expect(idp).toHaveLength(6);
    expect(idp.every((e) => e.worstSeal === 0)).toBe(true);
    // the EU primary provider serves the same six but is not compellable (SEAL-3).
    expect(r.exposure.filter((e) => e.party === 'primary').every((e) => e.worstSeal === 3)).toBe(true);
    // the institution serves nothing → no exposure edges.
    expect(r.exposure.some((e) => e.party === 'institution')).toBe(false);
  });
});

describe('sample workbook — dimension gating still holds', () => {
  // Providers sovereign (SOV-2 caps at SEAL-3), the six swept to SEAL-3 → floor 3.
  const sovereign: Answer[] = [
    prov('SOV-2.q1', 'institution', 4), prov('SOV-2.q1', 'primary', 4), prov('SOV-2.q1', 'idp', 4),
    prov('SOV-2.q2', 'institution', 3), prov('SOV-2.q2', 'primary', 3), prov('SOV-2.q2', 'idp', 3),
    ent('SOV-2.q3', 4), ...q5group(3),
  ];

  it('everything sovereign → floor SEAL-3', () => {
    expect(run(PARTIES, sovereign).overall.floor).toBe(3);
  });

  it('a SEAL-0 peeled onto a critical dimension floors the assessment', () => {
    const peeled = sovereign.filter(
      (a) => !(a.questionId === 'SOV-6.q5' && a.target.kind === 'dimension' && a.target.dimension === 'network'),
    );
    peeled.push(
      answerFor('SOV-6.q5', { kind: 'dimension', dimension: 'network' }, { state: 'answered', rungId: rungIdFor('SOV-6.q5', 0) }, { groupId: 'g2', placement: 'individual' }),
    );
    const r = run(PARTIES, peeled);
    expect(r.overall.floor).toBe(0);
    expect(r.overall.binding).toEqual(['SOV-6.q5']);
  });
});

describe("sample workbook — a per-provider don't-know", () => {
  it('is a floor hole over the rest, carried in the grand total', () => {
    const answers: Answer[] = [
      prov('SOV-2.q1', 'institution', 4), prov('SOV-2.q1', 'primary', 4), provDunno('SOV-2.q1', 'idp'),
      prov('SOV-2.q2', 'institution', 3), prov('SOV-2.q2', 'primary', 3), prov('SOV-2.q2', 'idp', 3),
      ent('SOV-2.q3', 4), ...q5group(3),
    ];
    const r = run(PARTIES, answers);
    expect(r.overall.floor).toBe(3); // IdP jurisdiction unknown → off the floor; rest at 3
    expect(r.overall.unknowns).toEqual(['SOV-2.q1']);
    expect(r.overall.dontKnowCount).toBe(1);
  });
});

describe('sample workbook — the S7 strata demo (sovereign software on compelled silicon)', () => {
  // Providers sovereign (SOV-2 ratio 1, seal 3); the six criticals swept to SEAL-3
  // with Compute SPLIT into its four strata; then chips peeled to SEAL-1 —
  // "Compute: software 3 / chips 1".
  const sovereignProviders: Answer[] = [
    prov('SOV-2.q1', 'institution', 4), prov('SOV-2.q1', 'primary', 4), prov('SOV-2.q1', 'idp', 4),
    prov('SOV-2.q2', 'institution', 3), prov('SOV-2.q2', 'primary', 3), prov('SOV-2.q2', 'idp', 3),
    ent('SOV-2.q3', 4),
  ];
  const q5splitSweep = applyPlacement(
    [], q5, WB,
    { kind: 'group', choice: { state: 'answered', rungId: rungIdFor('SOV-6.q5', 3) }, splitDimensions: ['compute'] }, 'g1',
  );
  const demo = [
    ...sovereignProviders,
    ...applyPlacement(
      q5splitSweep, q5, WB,
      { kind: 'individual-stratum', dimension: 'compute', stratum: 'chips', choice: { state: 'answered', rungId: rungIdFor('SOV-6.q5', 1) } }, 'g2',
    ),
  ];

  it('compelled silicon floors the estate to SEAL-1 while sovereign software stays visible', () => {
    const r = run(PARTIES, demo);
    expect(r.overall.floor).toBe(1);
    expect(r.overall.binding).toEqual(['SOV-6.q5']);
    // SOV-2 ratio 1 → 60; SOV-6: (5×75 + 3×75 + 25) / 900 = 625/900 → ×40 ≈ 27.7778.
    expect(r.overall.score).toBeCloseTo(87.7778, 3);
    expect(r.overall.answered).toBe(4); // q1,q2,q3 + q5 complete over 5 dims + 4 strata; q4 unanswered
    expect(r.overall.total).toBe(5);
    // The compute cell: min 1 with the stratum stack; the other five stay whole 3s.
    expect(r.heatmap.find((c) => c.dimension === 'compute')).toEqual({
      objective: 'SOV-6',
      dimension: 'compute',
      seal: 1,
      provenance: 'mixed',
      strata: [
        { stratum: 'service', seal: 3, provenance: 'group' },
        { stratum: 'software', seal: 3, provenance: 'group' },
        { stratum: 'hardware', seal: 3, provenance: 'group' },
        { stratum: 'chips', seal: 1, provenance: 'individual' },
      ],
    });
    expect(r.heatmap.filter((c) => c.dimension !== 'compute').every((c) => c.seal === 3 && c.strata.length === 0)).toBe(true);
    // The staircase names the stratum: fix chips → floor rises to 3.
    expect(r.staircase[0]).toEqual({
      floor: 1,
      unlocksTo: 3,
      binding: [{ questionId: 'SOV-6.q5', objectiveId: 'SOV-6', role: 'ARCH', dimension: 'compute', stratum: 'chips', party: null, seal: 1, evidence: null }],
    });
  });

  it('the JSON holds refinements only — no whole-compute answer survives the split', () => {
    const wholeCompute = demo.filter(
      (a) => a.questionId === 'SOV-6.q5' && a.target.kind === 'dimension' && a.target.dimension === 'compute',
    );
    expect(wholeCompute).toEqual([]);
    const strata = demo.flatMap((a) => (a.target.kind === 'dimension-stratum' ? [a.target.stratum] : []));
    expect(strata).toEqual(['service', 'software', 'hardware', 'chips']);
  });
});

describe('sample workbook — the S8 credibility demo (identical numbers, different credibility)', () => {
  // SPRAYED: every gesture a group sweep, zero evidence. CONSIDERED: the same seals
  // placed chip by chip, every gating answer evidenced. The engine scores them
  // identically — only the lens tells them apart.
  const sprayed: Answer[] = [
    ...placeGroupParty([], PARTIES, 'SOV-2.q1', { state: 'answered', rungId: rungIdFor('SOV-2.q1', 4) }, 'g1'),
    ...placeGroupParty([], PARTIES, 'SOV-2.q2', { state: 'answered', rungId: rungIdFor('SOV-2.q2', 3) }, 'g2'),
    ent('SOV-2.q3', 4),
    ...applyPlacement([], q5, WB, { kind: 'group', choice: { state: 'answered', rungId: rungIdFor('SOV-6.q5', 3) }, splitDimensions: [] }, 'g3'),
  ];
  const sprayedResult = evaluate(WB, assessmentOf(WB, 'Sample estate', PARTIES, sprayed, AUTHOR_QA_PROVENANCE));

  const considered: Answer[] = [
    ...['institution', 'primary', 'idp'].map((party) =>
      answerFor('SOV-2.q1', { kind: 'party', party }, { state: 'answered', rungId: rungIdFor('SOV-2.q1', 4), evidence: `registry extract — ${party}` }, { groupId: 'g1', placement: 'individual' }),
    ),
    ...['institution', 'primary', 'idp'].map((party) =>
      answerFor('SOV-2.q2', { kind: 'party', party }, { state: 'answered', rungId: rungIdFor('SOV-2.q2', 3), evidence: `ownership filing — ${party}` }, { groupId: 'g2', placement: 'individual' }),
    ),
    answerFor('SOV-2.q3', T, { state: 'answered', rungId: rungIdFor('SOV-2.q3', 4), evidence: 'exit plan v2, tested 2026-05' }, { groupId: 'g0', placement: 'individual' }),
    ...q5.appliesTo.map((dimension) =>
      answerFor('SOV-6.q5', { kind: 'dimension', dimension }, { state: 'answered', rungId: rungIdFor('SOV-6.q5', 3), evidence: `architecture review — ${dimension}` }, { groupId: 'g3', placement: 'individual' }),
    ),
  ];
  const consideredResult = evaluate(WB, assessmentOf(WB, 'Sample estate', PARTIES, considered, AUTHOR_QA_PROVENANCE));

  it('the engine scores both files identically — provenance never judges (invariant #4)', () => {
    expect(sprayedResult.overall.score).toBe(90);
    expect(consideredResult.overall.score).toBe(90);
    expect(sprayedResult.overall.floor).toBe(3);
    expect(consideredResult.overall.floor).toBe(3);
  });

  it('the lens tells them apart in one glance', () => {
    expect(sprayedResult.credibility.sweptRatio).toBeCloseTo(12 / 13, 4);
    expect(sprayedResult.credibility.evidenceCoverage).toEqual({ evidenced: 0, total: 13 }); // all six criticals gate
    expect(consideredResult.credibility.sweptRatio).toBe(0);
    expect(consideredResult.credibility.evidenceCoverage).toEqual({ evidenced: 13, total: 13 });
  });
});
