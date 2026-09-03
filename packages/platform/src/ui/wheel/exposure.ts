import type { Party, Seal, Workbook } from '../../schema';
import type { ExposureEdge } from '../../score-engine';

// The `serves` edges, read for a wheel (spec §4.4.3). Dimension and party are
// disjoint fan-out axes, so `serves` is the one declared bridge between them:
// markers are context, never units, and are drawn outside the rim so they cannot
// be mistaken for a cell. The wheel never derives compellability itself — seals
// come from the engine's exposure result.

/** One `serves` edge hanging off a chip. Context, not an answerable unit. */
export type ExposureMarker = {
  key: string;
  label: string;
  /** The party's worst material party-axis answer; null = serves here but not yet
   * answered — common early, since it comes from OTHER questions. */
  seal: Seal | null;
  /** Drawn solid rather than hollow. Unused on question wheels; MergeWheel uses it
   * to mark a served dimension that is critical. */
  emphasis: boolean;
};

export type ExposureReader = {
  /** The engine already omits the assessed party (invariant #6); this filters
   * again so a hand-built edge list cannot put the "us" on a risk ring either. */
  isThirdParty: (partyId: string) => boolean;
  /** The third parties standing under a dimension. Strata inherit their parent's,
   * because `serves` names dimensions, not strata. */
  forDimension: (dimension: string) => ExposureMarker[];
};

export function exposureReader(
  workbook: Workbook,
  parties: Party[],
  edges: ExposureEdge[],
): ExposureReader {
  const assessedTypes = new Set(
    workbook.parties.filter((t) => t.kind === 'assessed').map((t) => t.id),
  );
  const isThirdParty = (partyId: string): boolean => {
    const party = parties.find((p) => p.id === partyId);
    return party !== undefined && !assessedTypes.has(party.type);
  };

  return {
    isThirdParty,
    forDimension: (dimension) =>
      edges
        .filter((edge) => edge.dimension === dimension && isThirdParty(edge.party))
        .map((edge) => ({
          key: edge.party,
          label: parties.find((p) => p.id === edge.party)?.name ?? edge.party,
          seal: edge.worstSeal,
          emphasis: false,
        })),
  };
}

/** A marker ring earns its space only when it varies: with one provider serving
 * everything the ring is noise, so hosts default to hiding it. A single-spoke
 * figure is always informative — there is nothing to compare it against. */
export function informative(sets: ExposureMarker[][]): boolean {
  if (sets.every((set) => set.length === 0)) return false;
  if (sets.length === 1) return true;
  const signature = (set: ExposureMarker[]): string =>
    set
      .map((m) => m.key)
      .sort()
      .join('|');
  const first = signature(sets[0]);
  return sets.some((set) => signature(set) !== first);
}
