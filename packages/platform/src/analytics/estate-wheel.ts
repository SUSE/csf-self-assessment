import type { Party, Seal, Workbook } from '../schema';
import { gates, type EngineResult, type HeatFact } from '../score-engine';
import type { Provenance } from '../utils/provenance-lens';
import { targetLabel } from '../utils/target-label';

export type SpokeKind = 'estate' | 'dimension' | 'party';

/** One stratum's own minimum on a split dimension — a tick along the spoke. */
export type LayerTick = { stratum: string; seal: Seal };

/** Asserted or absent, never a nullable seal: absence is a first-class state
 *  (analytics invariant #2) and a SEAL-0 spoke must not be reachable from it. */
export type SpokeStanding =
  | { kind: 'asserted'; seal: Seal; fraction: number; provenance: Provenance }
  | { kind: 'ghost' };

export type EstateSpoke = {
  /** `<kind>:<key>` — `estate:assessment`, `dimension:storage`, `party:acme-eu`. */
  key: string;
  kind: SpokeKind;
  label: string;
  /** Second line: `critical` / `no gate`, the party-type display name, or
   *  `asked once` on the estate chip. */
  sub: string;
  /** Degrees clockwise from 12 o'clock. */
  deg: number;
  standing: SpokeStanding;
  /** Asserted material answers behind the spoke; 0 on a ghost. */
  answers: number;
  /** Ascending stratum minima in workbook stratum order; empty unless split. */
  ticks: LayerTick[];
  /** The hover/focus line, e.g. `Storage · SEAL-0 · 8 answers · 4 layers`. */
  summary: string;
};

/** One asserted answer in the ranked list. Shaped for the shared QuestionRow. */
export type WeakestLink = {
  /** `<questionId>|<spoke key>`. */
  key: string;
  /** The spoke this link sits on — how the Inspector list filters. */
  spoke: string;
  questionId: string;
  /** `<target label> · <role name>`; QuestionRow supplies the SEAL badge. */
  scope: string;
  seal: Seal;
};

export type EstateWheelTile =
  | {
      kind: 'wheel';
      spokes: EstateSpoke[];
      /** `4 of 16 spokes sit at SEAL-0 — the shortest on the wheel.` */
      headline: string;
      caption: string;
      /** Every asserted material answer, weakest first (Decision 2). */
      links: WeakestLink[];
    }
  | { kind: 'empty'; reason: string };

const CAPTION =
  'One spoke per declared dimension and per third party, its length the weakest material answer on it. Ticks are the strata somebody split out. Nothing here is painted from an absence — a spoke appears at a seal only once an answer asserts one.';

const EMPTY_REASON =
  'Nothing asserted yet — the wheel draws itself from answered material answers, so it appears once the first one is recorded.';

/** SEAL 0–4 → 0.2–1.0 of the rim. A SEAL-0 spoke is short, never zero-length. */
export function spokeFraction(seal: Seal): number {
  return 0.2 + 0.2 * seal;
}

function sealFloor(seals: Seal[]): Seal | null {
  return seals.reduce<Seal | null>(
    (lowest, seal) => (lowest === null || seal < lowest ? seal : lowest),
    null,
  );
}

function provenanceOf(facts: HeatFact[]): Provenance {
  if (facts.every((f) => f.swept)) return 'group';
  if (facts.every((f) => !f.swept)) return 'individual';
  return 'mixed';
}

function standingOf(facts: HeatFact[]): SpokeStanding {
  const seals = facts.flatMap((f) => (f.seal === null ? [] : [f.seal]));
  const seal = sealFloor(seals);
  if (seal === null) return { kind: 'ghost' };
  return { kind: 'asserted', seal, fraction: spokeFraction(seal), provenance: provenanceOf(facts) };
}

function summaryOf(label: string, standing: SpokeStanding, answers: number, ticks: number): string {
  const parts = [
    label,
    standing.kind === 'asserted' ? `SEAL-${standing.seal}` : 'nothing asserted',
    `${answers} answer${answers === 1 ? '' : 's'}`,
  ];
  if (ticks > 0) parts.push(`${ticks} layer${ticks === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function ticksOf(facts: HeatFact[], strata: readonly string[]): LayerTick[] {
  return strata.flatMap((stratum) => {
    const seals = facts.flatMap((f) => (f.stratum === stratum && f.seal !== null ? [f.seal] : []));
    const seal = sealFloor(seals);
    return seal === null ? [] : [{ stratum, seal }];
  });
}

export function estateWheelTile(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): EstateWheelTile {
  const facts = result.facts.filter((f) => gates(f.materiality) && f.state === 'answered');
  const typeName = new Map(workbook.parties.map((p) => [p.id, p.name]));
  const spokes: EstateSpoke[] = [];

  const estateFacts = facts.filter((f) => f.target.kind === 'assessment');
  const estateStanding = standingOf(estateFacts);
  spokes.push({
    key: 'estate:assessment',
    kind: 'estate',
    label: 'Whole estate',
    sub: 'asked once',
    deg: 0,
    standing: estateStanding,
    answers: estateStanding.kind === 'asserted' ? estateFacts.length : 0,
    ticks: [],
    summary: summaryOf('Whole estate', estateStanding, estateFacts.length, 0),
  });

  const dimensions = result.declaredDimensions;
  dimensions.forEach((dimension, index) => {
    const own = facts.filter((f) => f.dimension === dimension.id);
    const standing = standingOf(own);
    const ticks = ticksOf(own, workbook.dimensions.find((d) => d.id === dimension.id)?.strata ?? []);
    spokes.push({
      key: `dimension:${dimension.id}`,
      kind: 'dimension',
      label: dimension.name,
      sub: dimension.critical ? 'critical' : 'no gate',
      deg: (180 * (index + 1)) / (dimensions.length + 1),
      standing,
      answers: standing.kind === 'asserted' ? own.length : 0,
      ticks,
      summary: summaryOf(dimension.name, standing, own.length, ticks.length),
    });
  });

  const thirdParties = result.declaredParties.filter((p) => p.kind === 'third-party');
  thirdParties.forEach((party, index) => {
    const own = facts.filter((f) => f.party === party.id);
    const standing = standingOf(own);
    spokes.push({
      key: `party:${party.id}`,
      kind: 'party',
      label: party.name,
      sub: typeName.get(party.type) ?? party.type,
      deg: 180 + (180 * (index + 1)) / (thirdParties.length + 1),
      standing,
      answers: standing.kind === 'asserted' ? own.length : 0,
      ticks: [],
      summary: summaryOf(party.name, standing, own.length, 0),
    });
  });

  const asserted = spokes.flatMap((s) => (s.standing.kind === 'asserted' ? [s.standing.seal] : []));
  const weakest = sealFloor(asserted);
  if (weakest === null) return { kind: 'empty', reason: EMPTY_REASON };

  const atWeakest = asserted.filter((seal) => seal === weakest).length;
  const weightOf = new Map(
    workbook.objectives.flatMap((o) => o.questions.map((q) => [q.id, o.weight])),
  );
  const roleName = new Map(workbook.roles.map((r) => [r.id, r.name]));
  const spokeOf = (fact: HeatFact): string => {
    if (fact.party !== null) return `party:${fact.party}`;
    if (fact.dimension !== null) return `dimension:${fact.dimension}`;
    return 'estate:assessment';
  };

  const links: WeakestLink[] = facts
    .flatMap((fact) => (fact.seal === null ? [] : [{ fact, seal: fact.seal }]))
    .sort(
      (a, b) =>
        a.seal - b.seal || (weightOf.get(b.fact.questionId) ?? 0) - (weightOf.get(a.fact.questionId) ?? 0),
    )
    .map(({ fact, seal }) => ({
      key: `${fact.questionId}|${spokeOf(fact)}`,
      spoke: spokeOf(fact),
      questionId: fact.questionId,
      scope: `${targetLabel(workbook, parties, fact.target)} · ${roleName.get(fact.role) ?? fact.role}`,
      seal,
    }));

  return {
    kind: 'wheel',
    spokes,
    headline: `${atWeakest} of ${spokes.length} spokes sit at SEAL-${weakest} — the shortest on the wheel.`,
    caption: CAPTION,
    links,
  };
}
