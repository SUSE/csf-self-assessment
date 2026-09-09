import { describe, expect, it } from 'vitest';
import { SUBJECT_A, SUBJECT_C } from './subjects-fixture';
import { exposureDetail, exposureTile } from './exposure';

// The evaluated estates come from `subjects-fixture` — the one place the two
// landings are built. Rebuilding them here drifts from every other oracle.
const { result: A, workbook: alexWorkbook } = SUBJECT_A;
const { result: C, workbook: janeWorkbook } = SUBJECT_C;

describe('the exposure tile model', () => {
  it('ranks third parties by the critical dimensions they serve', () => {
    const view = exposureTile(C, janeWorkbook);
    expect(view.kind).toBe('ranked');
    if (view.kind !== 'ranked') throw new Error('expected ranked');
    expect(view.criticalTotal).toBe(6);
    expect(view.ranks.map((r) => r.key)).toEqual([
      'acme-cloud',
      'acme-eu',
      'siliconware',
      'modelhouse',
      'northstar-edge',
    ]);
    expect(view.ranks.map((r) => r.criticalServed)).toEqual([6, 6, 3, 0, 0]);
    expect(view.ranks.map((r) => r.worstSeal)).toEqual([1, 0, 3, 1, 1]);
    expect(view.ranks.some((r) => r.key === 'inst')).toBe(false);
  });

  it('renders the reach, the standing and the bar length', () => {
    const view = exposureTile(C, janeWorkbook);
    if (view.kind !== 'ranked') throw new Error('expected ranked');
    const acme = view.ranks[1]!;
    expect(acme.name).toBe('Acme Cloud Europe SAS');
    expect(acme.typeName).toBe('Service provider');
    expect(acme.reach).toBe('6 of 6 critical dimensions');
    expect(acme.standing).toBe('SEAL-0');
    expect(acme.barFraction).toBe(1);
    expect(acme.served).toEqual([
      'Compute',
      'Storage',
      'Network',
      'IAM',
      'Platform (Containers, PaaS)',
      'Security',
    ]);
    const edge = view.ranks[4]!;
    expect(edge.reach).toBe('0 of 6 critical dimensions');
    expect(edge.barFraction).toBe(0);
    expect(edge.served).toEqual(['Edge (DDoS, CDN, DNS)']);
  });

  it('leads with the party standing under the most critical estate', () => {
    const view = exposureTile(C, janeWorkbook);
    if (view.kind !== 'ranked') throw new Error('expected ranked');
    expect(view.headline).toBe('Acme Cloud EU stands under 6 of 6 critical dimensions.');

    const partial = exposureTile(A, alexWorkbook);
    if (partial.kind !== 'ranked') throw new Error('expected ranked');
    expect(partial.ranks).toHaveLength(3);
    expect(partial.headline).toBe('Acme Cloud EU stands under 6 of 6 critical dimensions.');
  });

  it('places the bipartite map so both columns centre', () => {
    const view = exposureTile(C, janeWorkbook);
    if (view.kind !== 'ranked') throw new Error('expected ranked');
    expect(view.map.width).toBe(360);
    expect(view.map.height).toBe(124);
    expect(view.map.parties).toHaveLength(5);
    expect(view.map.parties.map((p) => p.y)).toEqual([38, 50, 62, 74, 86]);
    expect(view.map.parties.every((p) => p.x === 92)).toBe(true);
    expect(view.map.dimensions).toHaveLength(10);
    expect(view.map.dimensions.map((d) => d.y)).toEqual([8, 20, 32, 44, 56, 68, 80, 92, 104, 116]);
    expect(view.map.dimensions.every((d) => d.x === 268)).toBe(true);
    expect(view.map.parties[1]).toEqual({
      key: 'acme-eu',
      label: 'Acme Cloud Europe SAS',
      title: 'Acme Cloud Europe SAS',
      x: 92,
      y: 50,
      seal: 0,
    });
    expect(view.map.dimensions[3]).toEqual({
      key: 'iam',
      label: 'IAM',
      title: 'IAM',
      x: 268,
      y: 44,
      critical: true,
    });

    const partial = exposureTile(A, alexWorkbook);
    if (partial.kind !== 'ranked') throw new Error('expected ranked');
    expect(partial.map.parties.map((p) => p.y)).toEqual([50, 62, 74]);
    expect(partial.map.height).toBe(124);
  });

  it('elides a label the gutter cannot hold, and keeps the whole name to hover', () => {
    const view = exposureTile(C, janeWorkbook);
    if (view.kind !== 'ranked') throw new Error('expected ranked');
    const long = view.map.dimensions.find((d) => d.key === 'software-supply');
    expect(long?.title).toBe('Software supply & development');
    expect(long?.label).toBe('Software supply & developme…');
    expect(
      [...view.map.parties, ...view.map.dimensions].every((n) => n.label.length <= 28),
    ).toBe(true);
  });

  it('draws one link per declared serving edge', () => {
    const view = exposureTile(C, janeWorkbook);
    if (view.kind !== 'ranked') throw new Error('expected ranked');
    expect(view.map.links).toHaveLength(20);
    expect(view.map.links.find((l) => l.key === 'acme-eu|iam')).toEqual({
      key: 'acme-eu|iam',
      party: 'acme-eu',
      x1: 92,
      y1: 50,
      x2: 268,
      y2: 44,
      seal: 0,
    });

    const partial = exposureTile(A, alexWorkbook);
    if (partial.kind !== 'ranked') throw new Error('expected ranked');
    expect(partial.map.links).toHaveLength(12);
  });

  it('names every answer behind a party, absence included', () => {
    const view = exposureTile(C, janeWorkbook);
    const detail = exposureDetail(view, 'party:acme-eu', C, janeWorkbook);
    expect(detail).not.toBeNull();
    if (detail === null) throw new Error('expected a detail');
    expect(detail.title).toBe('Acme Cloud Europe SAS · Service provider');
    expect(detail.summary).toBe("SEAL-0 · 6 answers about this party · 1 don't-know");
    expect(detail.rows).toHaveLength(6);
    expect(detail.rows[3]!.questionId).toBe('SOV-2.enforceability');
    expect(detail.rows[3]!.meta).toBe("don't-know · Legal");
    expect(detail.rows[3]!.seal).toBeNull();
    expect(detail.rows[2]!.questionId).toBe('SOV-2.compellability');
    expect(detail.rows[2]!.evidence).toBe(true);

    expect(exposureDetail(view, 'party:modelhouse', C, janeWorkbook)?.summary).toBe(
      'SEAL-1 · 6 answers about this party · 1 n/a',
    );
    expect(exposureDetail(view, 'party:northstar-edge', C, janeWorkbook)?.summary).toBe(
      'SEAL-1 · 3 answers about this party',
    );
    expect(exposureDetail(view, 'party:inst', C, janeWorkbook)).toBeNull();
    expect(exposureDetail(view, 'nonsense', C, janeWorkbook)).toBeNull();
  });

  it('says why the tile is empty instead of rendering a hole', () => {
    const view = exposureTile(
      { ...C, declaredParties: C.declaredParties.filter((p) => p.kind === 'assessed') },
      janeWorkbook,
    );
    expect(view.kind).toBe('empty');
    if (view.kind !== 'empty') throw new Error('expected empty');
    expect(view.reason).toBe(
      'No third party serves a declared dimension yet — name what each party serves when you seed the roster.',
    );
  });

  it('captions what rank means', () => {
    const view = exposureTile(C, janeWorkbook);
    if (view.kind !== 'ranked') throw new Error('expected ranked');
    expect(view.caption).toBe(
      'Rank is critical dimensions served — what the roster declares, not what anyone answered. The seal beside a party is the minimum over its own party answers, so a wide row at a low seal is the blast radius.',
    );
  });
});
