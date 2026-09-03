import type { Seal, Workbook } from '../schema';
import { gates, type EngineResult, type HeatFact } from '../score-engine';

export type ExposureRank = {
  // The party id; the mark key is `party:<key>`.
  key: string;
  name: string;
  // The authored party-TYPE display name, never the type id.
  typeName: string;
  criticalServed: number;
  // 0..1 — bar length. 0 renders no bar at all: absence is not a zero (#2).
  barFraction: number;
  // `6 of 6 critical dimensions` / `1 of 1 critical dimension`.
  reach: string;
  // `SEAL-0` | `not yet answered`.
  standing: string;
  // The engine's worst material party-axis answer; null = serves, nothing asserted.
  worstSeal: Seal | null;
  // Declared served dimensions, display names in workbook order.
  served: string[];
};

// The two node kinds of the bipartite map differ in what they can carry, so they
// are two types rather than one with nullable halves (decision 7). Coordinates are
// in the model's own user space.
export type ExposurePartyNode = {
  key: string;
  // Elided to the gutter's width; `title` is the whole name.
  label: string;
  title: string;
  x: number;
  y: number;
  // The party's worst seal, so the component never looks a rank up to colour a node.
  seal: Seal | null;
};

export type ExposureDimensionNode = {
  key: string;
  label: string;
  title: string;
  x: number;
  y: number;
  critical: boolean;
};

export type ExposureLink = {
  // `<partyId>|<dimensionId>`.
  key: string;
  party: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // null = the party serves the dimension but has asserted nothing yet.
  seal: Seal | null;
};

export type ExposureMapView = {
  width: number;
  height: number;
  // Rank order.
  parties: ExposurePartyNode[];
  // Workbook order.
  dimensions: ExposureDimensionNode[];
  // Engine order (`result.exposure`).
  links: ExposureLink[];
};

export type ExposureDetailRow = {
  // `<questionId>|<partyId>`.
  key: string;
  questionId: string;
  questionText: string;
  // `SEAL-0 · Legal` / `don't-know · Legal` / `n/a · Security`.
  meta: string;
  // null for a don't-know or an n/a — never rendered as SEAL-0.
  seal: Seal | null;
  evidence: boolean;
};

export type ExposureDetail = {
  // `Acme Cloud Europe SAS · Service provider`.
  title: string;
  // `SEAL-0 · 6 answers about this party · 1 don't-know`.
  summary: string;
  rows: ExposureDetailRow[];
};

export type ExposureTile =
  | {
      kind: 'ranked';
      // `Acme Cloud EU stands under 6 of 6 critical dimensions.`
      headline: string;
      criticalTotal: number;
      ranks: ExposureRank[];
      map: ExposureMapView;
      caption: string;
    }
  | { kind: 'empty'; reason: string };

// The map's user space. Both columns are vertically centred in `height`, and the
// gutter outside each column is the label's — 86 units holds `labelChars` at the
// 6-unit type the component draws, which is why a longer name is elided here
// rather than spilling off the drawing.
export const EXPOSURE_MAP = {
  width: 360,
  pad: 8,
  pitch: 12,
  partyX: 92,
  dimensionX: 268,
  labelChars: 28,
} as const;

function elide(text: string): string {
  return text.length <= EXPOSURE_MAP.labelChars
    ? text
    : `${text.slice(0, EXPOSURE_MAP.labelChars - 1).trimEnd()}…`;
}

const CAPTION =
  'Rank is critical dimensions served — what the roster declares, not what anyone answered. The seal beside a party is the minimum over its own party answers, so a wide row at a low seal is the blast radius.';

// `party:<id>` — the opaque selected-mark key the dashboard holds.
export function exposureMarkKey(partyId: string): string {
  return `party:${partyId}`;
}

function columnY(index: number, count: number, height: number): number {
  return height / 2 - ((count - 1) * EXPOSURE_MAP.pitch) / 2 + index * EXPOSURE_MAP.pitch;
}

function factReading(fact: HeatFact): string {
  if (fact.state === 'dont-know') return "don't-know";
  if (fact.state === 'na' || fact.seal === null) return 'n/a';
  return `SEAL-${fact.seal}`;
}

function emptyReason(dimensionsDeclared: boolean): string {
  return dimensionsDeclared
    ? 'No third party serves a declared dimension yet — name what each party serves when you seed the roster.'
    : 'This workbook declares no dimensions, so there is nothing for a party to serve — the exposure map has no edges to draw.';
}

export function exposureTile(result: EngineResult, workbook: Workbook): ExposureTile {
  const criticalIds = new Set(
    result.declaredDimensions.filter((d) => d.critical).map((d) => d.id),
  );
  const criticalTotal = criticalIds.size;
  const dimensionName = new Map(result.declaredDimensions.map((d) => [d.id, d.name]));
  const typeName = new Map(workbook.parties.map((p) => [p.id, p.name]));

  const ranks: ExposureRank[] = result.declaredParties
    .map((party, index) => ({ party, index }))
    .filter(({ party }) => party.kind === 'third-party' && party.serves.length > 0)
    .map(({ party, index }) => {
      const criticalServed = party.serves.filter((d) => criticalIds.has(d)).length;
      const worstSeal = result.exposure.find((e) => e.party === party.id)?.worstSeal ?? null;
      return {
        index,
        rank: {
          key: party.id,
          name: party.name,
          typeName: typeName.get(party.type) ?? party.type,
          criticalServed,
          barFraction: criticalTotal === 0 ? 0 : criticalServed / criticalTotal,
          reach: `${criticalServed} of ${criticalTotal} critical dimension${criticalTotal === 1 ? '' : 's'}`,
          standing: worstSeal === null ? 'not yet answered' : `SEAL-${worstSeal}`,
          worstSeal,
          served: party.serves.flatMap((d) => {
            const name = dimensionName.get(d);
            return name === undefined ? [] : [name];
          }),
        },
      };
    })
    .sort(
      (a, b) =>
        b.rank.criticalServed - a.rank.criticalServed ||
        b.rank.served.length - a.rank.served.length ||
        a.index - b.index,
    )
    .map((entry) => entry.rank);

  const first = ranks[0];
  if (first === undefined) {
    return { kind: 'empty', reason: emptyReason(workbook.dimensions.length > 0) };
  }

  const height =
    EXPOSURE_MAP.pad * 2 +
    (Math.max(ranks.length, result.declaredDimensions.length) - 1) * EXPOSURE_MAP.pitch;

  const partyNodes: ExposurePartyNode[] = ranks.map((rank, i) => ({
    key: rank.key,
    label: elide(rank.name),
    title: rank.name,
    x: EXPOSURE_MAP.partyX,
    y: columnY(i, ranks.length, height),
    seal: rank.worstSeal,
  }));
  const dimensionNodes: ExposureDimensionNode[] = result.declaredDimensions.map((dimension, i) => ({
    key: dimension.id,
    label: elide(dimension.name),
    title: dimension.name,
    x: EXPOSURE_MAP.dimensionX,
    y: columnY(i, result.declaredDimensions.length, height),
    critical: dimension.critical,
  }));

  const partyNode = new Map(partyNodes.map((n) => [n.key, n]));
  const dimensionNode = new Map(dimensionNodes.map((n) => [n.key, n]));
  const links: ExposureLink[] = result.exposure.flatMap((edge) => {
    const from = partyNode.get(edge.party);
    const to = dimensionNode.get(edge.dimension);
    if (from === undefined || to === undefined) return [];
    return [
      {
        key: `${edge.party}|${edge.dimension}`,
        party: edge.party,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        seal: edge.worstSeal,
      },
    ];
  });

  return {
    kind: 'ranked',
    headline: `${first.name} stands under ${first.reach}.`,
    criticalTotal,
    ranks,
    map: {
      width: EXPOSURE_MAP.width,
      height,
      parties: partyNodes,
      dimensions: dimensionNodes,
      links,
    },
    caption: CAPTION,
  };
}

// Null when the key names no ranked party.
export function exposureDetail(
  view: ExposureTile,
  markKey: string,
  result: EngineResult,
  workbook: Workbook,
): ExposureDetail | null {
  if (view.kind !== 'ranked') return null;
  const rank = view.ranks.find((r) => exposureMarkKey(r.key) === markKey);
  if (rank === undefined) return null;

  const questions = new Map(
    workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]),
  );
  const facts = result.facts.filter((f) => f.party === rank.key && gates(f.materiality));
  const rows: ExposureDetailRow[] = facts.map((fact) => ({
    key: `${fact.questionId}|${rank.key}`,
    questionId: fact.questionId,
    questionText: questions.get(fact.questionId) ?? fact.questionId,
    meta: `${factReading(fact)} · ${workbook.roles.find((r) => r.id === fact.role)?.name ?? fact.role}`,
    seal: fact.state === 'answered' ? fact.seal : null,
    evidence: fact.evidence,
  }));

  const dontKnow = facts.filter((f) => f.state === 'dont-know').length;
  const na = facts.filter((f) => f.state === 'na').length;
  const summary = [
    rank.standing,
    `${rows.length} answer${rows.length === 1 ? '' : 's'} about this party`,
    ...(dontKnow > 0 ? [`${dontKnow} don't-know`] : []),
    ...(na > 0 ? [`${na} n/a`] : []),
  ].join(' · ');

  return { title: `${rank.name} · ${rank.typeName}`, summary, rows };
}
