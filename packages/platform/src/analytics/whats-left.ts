import type { Party, Workbook } from '../schema';
import type { EngineResult } from '../score-engine';
import { targetLabel } from '../utils/target-label';

export type OpenUnitView = {
  questionId: string;
  questionText: string;
  objectiveId: string;
  /** The authored role's display NAME, resolved from workbook.roles (ADR-0003). */
  roleName: string;
  /** The unit's label from utils/target-label: a party name, `Storage · chips`,
   *  a dimension name, or `whole estate`. */
  label: string;
};

/** Open units sharing one subject — a party, a dimension, or the whole estate. */
export type OpenGroup = {
  /** `party:<id>` | `dimension:<id>` | `assessment`. */
  key: string;
  /** The subject's display name; `The estate` for the assessment target. */
  label: string;
  units: OpenUnitView[];
};

export type WhatsLeftTile = {
  open: number;
  total: number;
  /** Largest group first, ties in first-appearance order; [] when nothing is open. */
  groups: OpenGroup[];
};

/** The backlog as the rail reads it: one owner, or the whole chase. */
export type OpenUnitsInspection = {
  /** Open units in this reading — the owner's, or the whole backlog's. */
  open: number;
  total: number;
  /** The owner being read, or null for the whole chase. */
  groupLabel: string | null;
  groups: OpenGroup[];
};

/** The resolver seam: a key the reading no longer has (party removed, last unit
 *  answered) resolves to null, never to an empty panel that reads as finished. */
export function openUnitsInspection(
  tile: WhatsLeftTile,
  groupKey: string | null,
): OpenUnitsInspection | null {
  if (groupKey === null) {
    if (tile.groups.length === 0) return null;
    return { open: tile.open, total: tile.total, groupLabel: null, groups: tile.groups };
  }
  const group = tile.groups.find((g) => g.key === groupKey);
  if (group === undefined) return null;
  return {
    open: group.units.length,
    total: tile.total,
    groupLabel: group.label,
    groups: [group],
  };
}

export function whatsLeftTile(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): WhatsLeftTile {
  const questionText = new Map(
    workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]),
  );
  const roleName = new Map(workbook.roles.map((r) => [r.id, r.name]));
  const dimensionName = new Map(workbook.dimensions.map((d) => [d.id, d.name]));
  const partyName = new Map(parties.map((p) => [p.id, p.name]));

  const groups: OpenGroup[] = [];
  const byKey = new Map<string, OpenGroup>();

  for (const unit of result.openUnits) {
    const { key, label } =
      unit.target.kind === 'party'
        ? {
            key: `party:${unit.target.party}`,
            label: partyName.get(unit.target.party) ?? unit.target.party,
          }
        : unit.target.kind === 'assessment'
          ? { key: 'assessment', label: 'The estate' }
          : {
              key: `dimension:${unit.target.dimension}`,
              label: dimensionName.get(unit.target.dimension) ?? unit.target.dimension,
            };
    let group = byKey.get(key);
    if (group === undefined) {
      group = { key, label, units: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.units.push({
      questionId: unit.questionId,
      questionText: questionText.get(unit.questionId) ?? unit.questionId,
      objectiveId: unit.objectiveId,
      roleName: roleName.get(unit.role) ?? unit.role,
      label: targetLabel(workbook, parties, unit.target),
    });
  }

  return {
    open: result.units.unanswered,
    total: result.units.total,
    groups: groups.sort((a, b) => b.units.length - a.units.length),
  };
}
