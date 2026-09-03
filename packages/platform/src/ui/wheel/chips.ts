// The chip taxonomy the estate-shaped wheels share. Dimension and party are
// disjoint fan-out axes — no answer ever has both coordinates — so they are drawn
// as two arcs rather than one ring, and the single assessment chip sits on the
// divider between them.

export type ChipKind = 'assessment' | 'dimension' | 'party';

/** Chips in draw order with their angle in degrees clockwise from 12 o'clock: the
 * assessment chip on the divider, dimensions over the right arc, parties over the
 * left, neither touching the divider. */
export function chipAngles<T extends { kind: ChipKind }>(chips: T[]): { chip: T; deg: number }[] {
  const dimensions = chips.filter((c) => c.kind === 'dimension');
  const parties = chips.filter((c) => c.kind === 'party');
  const assessment = chips.filter((c) => c.kind === 'assessment');

  return [
    ...assessment.map((chip) => ({ chip, deg: 0 })),
    ...dimensions.map((chip, i) => ({ chip, deg: (180 * (i + 1)) / (dimensions.length + 1) })),
    ...parties.map((chip, i) => ({ chip, deg: 180 + (180 * (i + 1)) / (parties.length + 1) })),
  ];
}
