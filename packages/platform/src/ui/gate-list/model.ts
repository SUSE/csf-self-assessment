import type { GateEntry } from '../../author';
import type { Workbook } from '../../schema';

// The floor gates, resolved for display. Pure name resolution over the author's
// GateEntry list, kept beside the panel so the words a reader sees are testable
// without mounting anything.

export type GateRow = {
  questionId: string;
  objectiveId: string;
  text: string;
  /** The answerer's authored name — the id is the tooltip. */
  roleName: string;
  roleId: string;
  /** How the question reaches the floor, as one word. */
  viaKind: 'party' | 'dimension';
  /** The critical dimensions it gates through — empty for a party gate. */
  dimensionNames: string[];
};

export function gateRows(gates: GateEntry[], workbook: Workbook): GateRow[] {
  const roleName = new Map(workbook.roles.map((r) => [r.id, r.name]));
  const dimensionName = new Map(workbook.dimensions.map((d) => [d.id, d.name]));
  return gates.map((gate) => ({
    questionId: gate.questionId,
    objectiveId: gate.objectiveId,
    text: gate.text,
    roleName: roleName.get(gate.role) || gate.role,
    roleId: gate.role,
    viaKind: gate.via.kind,
    dimensionNames:
      gate.via.kind === 'dimension'
        ? gate.via.dimensions.map((d) => dimensionName.get(d) ?? d)
        : [],
  }));
}
