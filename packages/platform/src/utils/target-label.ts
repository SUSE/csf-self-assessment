import type { Party, Target, Workbook } from '../schema';

// An answer unit's target as a human reads it: `whole estate`, a dimension
// name, `<dimension> · <stratum>`, or a party name; an unknown id falls back to
// the raw id. The one home of this vocabulary — `merge/describeTarget` and the
// question blame both read it, and it takes only what it needs so a rail with a
// workbook but no workbook-assessment can label a unit.
export function targetLabel(
  workbook: Pick<Workbook, 'dimensions'>,
  parties: readonly Party[],
  target: Target,
): string {
  switch (target.kind) {
    case 'assessment':
      return 'whole estate';
    case 'dimension':
      return dimensionName(workbook, target.dimension);
    case 'dimension-stratum':
      return `${dimensionName(workbook, target.dimension)} · ${target.stratum}`;
    case 'party':
      return parties.find((p) => p.id === target.party)?.name ?? target.party;
  }
}

function dimensionName(workbook: Pick<Workbook, 'dimensions'>, id: string): string {
  return workbook.dimensions.find((d) => d.id === id)?.name ?? id;
}
