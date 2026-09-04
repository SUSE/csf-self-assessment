// What the workbook and the assessment declare, resolved once per evaluate() —
// plus the seal arithmetic. Nothing here reads answers except `inScope`.
import type {
  Answer,
  Assessment,
  Materiality,
  PartyKind,
  Seal,
  SealLevel,
  Target,
  Workbook,
} from '../schema';

// Does an answer on this question contribute points to the Sovereignty Score?
// `material` and `ranking` do; `informational` and `na` do not. One of the two
// owners of the distinction — no surface compares the enum to a literal
// (instrument.md §6).
export function scores(materiality: Materiality): boolean {
  return materiality === 'material' || materiality === 'ranking';
}

// Does an answered rung on this question gate the SEAL floor? `material` only.
// A `ranking` question never gates, never opens a floor hole, and always
// scores.
export function gates(materiality: Materiality): boolean {
  return materiality === 'material';
}

export function minSeal(seals: Seal[]): Seal {
  return seals.reduce((lowest, seal) => (seal < lowest ? seal : lowest));
}

// The workbook's authored name for a SEAL rank — `''` when the scale declares
// no level at that rank, so a name is never fabricated from the number. Takes
// the levels rather than the whole workbook because four of the ten adopting
// sites hold only a `sealLevels` prop; it is the same fact either way. One
// owner, no local copies (quality ,).
export function sealName(levels: readonly SealLevel[], seal: Seal): string {
  return levels.find((l) => l.seal === seal)?.name ?? '';
}

export function provenanceOf(
  placements: Set<'group' | 'individual'>,
): 'group' | 'individual' | 'mixed' {
  return placements.size > 1 ? 'mixed' : placements.has('group') ? 'group' : 'individual';
}

// A target flattened to the facets the outputs group by.
export function facetsOf(target: Target): {
  dimension: string | null;
  stratum: string | null;
  party: string | null;
} {
  return {
    dimension:
      target.kind === 'dimension' || target.kind === 'dimension-stratum' ? target.dimension : null,
    stratum: target.kind === 'dimension-stratum' ? target.stratum : null,
    party: target.kind === 'party' ? target.party : null,
  };
}

export type Scope = {
  dimensions: Set<string>;
  critical: Set<string>;
  // A material answer on this target GATES the floor: party and assessment
  // answers always, dimension answers only on critical dimensions.
  gatesFloor: (target: Target) => boolean;
  // Guards a stray non-workbook dimension in `appliesTo` (schema R6 forbids it).
  scoresTarget: (target: Target) => boolean;
  // A STORED answer's target is declared: one rule shared by the don't-know
  // totals and the swept share.
  inScope: (answer: Answer) => boolean;
  // The dimension's workbook-declared strata ([] = unsplittable).
  strataOf: (dimension: string) => string[];
  partyKindOf: (type: string) => PartyKind;
};

export function scopeOf(workbook: Workbook, assessment: Assessment): Scope {
  const dimensions = new Set(workbook.dimensions.map((d) => d.id));
  const critical = new Set(workbook.dimensions.filter((d) => d.critical).map((d) => d.id));
  const parties = new Set(assessment.parties.map((p) => p.id));
  const strata = new Map(workbook.dimensions.map((d): [string, string[]] => [d.id, d.strata ?? []]));
  const kindByType = new Map(workbook.parties.map((p) => [p.id, p.kind]));

  return {
    dimensions,
    critical,
    gatesFloor: (target) => {
      const { dimension } = facetsOf(target);
      return dimension === null || critical.has(dimension);
    },
    scoresTarget: (target) => {
      const { dimension } = facetsOf(target);
      return dimension === null || dimensions.has(dimension);
    },
    inScope: ({ target }) => {
      if (target.kind === 'assessment') return true;
      if (target.kind === 'party') return parties.has(target.party);
      if (target.kind === 'dimension-stratum')
        return (
          dimensions.has(target.dimension) &&
          (strata.get(target.dimension) ?? []).includes(target.stratum)
        );
      return dimensions.has(target.dimension);
    },
    strataOf: (dimension) => strata.get(dimension) ?? [],
    // For a schema-valid assessment every type resolves; the unreachable fallback
    // classifies as third-party, which never hides a party from a risk row.
    partyKindOf: (type) => kindByType.get(type) ?? 'third-party',
  };
}
