import type { Party, Seal, Workbook } from '../schema';
import { gates, type HeatFact } from '../score-engine';

// The axes and the grid model behind the heat family: a pivotable heat map for the analytics
// surface. The engine emits objective × declared dimension; this one keeps the
// same reading rules and makes BOTH axes pluggable, so the same asserted facts
// can be read by dimension, by stratum, by party or by role.

// The rules it does not bend:
// - Every painted cell is an asserted MATERIAL fact. An untouched
// cell is absent, never a zero.
// - A cell is the MINIMUM over the facts that land in it — the same operation as
// an objective's SEAL. Never an average.
// - A don't-know never becomes a number: it is counted beside the minimum, and a
// cell holding only don't-knows has no minimum at all.
// - **No painting across rows**. Party answers have no dimension,
// so on the dimension axis they cannot be spread across dimension columns.
// Generalised: whatever cannot map to the chosen axis lands in ONE carry
// column. Switching the axis swaps which facts are homeless — on the party
// axis it is the dimension answers that carry. The role axis is the only
// total one, because every question authors a role.

// It computes no floor and no score: those exist only on a finalized assessment
// and only `evaluate()` computes them. The dimension × objective
// case is covered by a parity test against `evaluate().heatmap`, so this module
// cannot drift from the engine's own cells.

// A column of either axis. `note` is a rendered sub-label, never decoration.
export type HeatColumn = { key: string; label: string; note: string | null };

// What a column axis cannot hold (analytics §2.6). `total` is NOT a hidden
// column: every fact sits on the axis, so there is nothing to carry. Invariant
// #4 forbids hiding a carry column — never inventing one.
export type AxisCarry = { kind: 'carries'; label: string } | { kind: 'total' };

export type HeatAxis = {
  id: string;
  label: string;
  columns: HeatColumn[];
  // Which column a fact belongs to; null = it cannot sit on this axis and goes
  // to the carry column.
  keyOf: (fact: HeatFact) => string | null;
  carry: AxisCarry;
};

export type HeatCellView = {
  // Minimum over the asserted answers here; null = nothing asserted.
  seal: Seal | null;
  // Don't-knows in this cell — reported beside the minimum, never folded in.
  unknowns: number;
  count: number;
  // At least one fact came from a stratum refinement, so the cell is a roll-up.
  split: boolean;
  provenance: 'group' | 'individual' | 'mixed' | null;
  facts: HeatFact[];
};

export type HeatGridModel = {
  rows: HeatColumn[];
  columns: HeatColumn[];
  // `${rowKey}|${columnKey}` → cell. Absent key = untouched, render as absent.
  cells: Map<string, HeatCellView>;
  // `${rowKey}` → the facts that cannot sit on the column axis.
  carryCells: Map<string, HeatCellView>;
  carry: AxisCarry;
  carryCount: number;
  // Columns no fact reaches — a coverage gap on every axis EXCEPT stratum,
  // where narrowing makes it empty by construction.
  emptyColumns: string[];
  total: number;
};

export type HeatGridInput = {
  facts: HeatFact[];
  rowAxis: HeatAxis;
  columnAxis: HeatAxis;
  // Include facts that do not gate the floor. Default false: the grid paints
  // SEALs, and a non-gating answer's SEAL is not a floor fact. Renamed from
  // `includeInformational`.
  includeNonGating?: boolean;
};

// --- built-in axes --------------------------------------------------------

export function objectiveAxis(workbook: Workbook): HeatAxis {
  return {
    id: 'objective',
    label: 'Objective',
    // No weight note: the grid reads where the estate is weak, and a weight is what
    // that weakness COSTS — the objectives ring is where the two are read together.
    columns: workbook.objectives.map((o) => ({ key: o.id, label: o.name, note: null })),
    keyOf: (fact) => fact.objective,
    carry: { kind: 'total' },
  };
}

export function dimensionAxis(workbook: Workbook): HeatAxis {
  return {
    id: 'dimension',
    label: 'Dimension',
    columns: workbook.dimensions.map((d) => ({
      key: d.id,
      label: d.name,
      note: d.critical ? 'critical' : 'no gate',
    })),
    keyOf: (fact) => fact.dimension,
    carry: { kind: 'carries', label: 'party and whole-estate answers' },
  };
}

function declaredStrata(workbook: Workbook): string[] {
  return [...new Set(workbook.dimensions.flatMap((d) => d.strata ?? []))];
}

function occupiedStrata(workbook: Workbook, facts: HeatFact[]): string[] {
  const reached = new Set(
    facts.filter((f) => gates(f.materiality) && f.stratum !== null).map((f) => f.stratum),
  );
  return declaredStrata(workbook).filter((s) => reached.has(s));
}

// Who split and who answered whole — the stratum tile's caption (§2.7). Display
// names, in workbook order.
export type StratumReading = {
  occupied: string[];
  declared: number;
  split: string[];
  whole: string[];
};

export function stratumReading(workbook: Workbook, facts: HeatFact[]): StratumReading {
  const material = facts.filter((f) => gates(f.materiality));
  const split: string[] = [];
  const whole: string[] = [];
  for (const dimension of workbook.dimensions) {
    if ((dimension.strata ?? []).length === 0) continue;
    const own = material.filter((f) => f.dimension === dimension.id);
    if (own.some((f) => f.stratum !== null)) split.push(dimension.name);
    else if (own.length > 0) whole.push(dimension.name);
  }
  return {
    occupied: occupiedStrata(workbook, facts),
    declared: declaredStrata(workbook).length,
    split,
    whole,
  };
}

// Strata are NOT an axis of the model (spec §2.3) — this is a PROJECTION across
// every split dimension at the same depth, and it is only ever populated where a
// refinement actually exists. Useful precisely because it answers "is chips our
// worst layer everywhere?"; misleading if read without the dimension view.
export function stratumAxis(workbook: Workbook, facts: HeatFact[]): HeatAxis {
  return {
    id: 'stratum',
    label: 'Stratum',
    columns: occupiedStrata(workbook, facts).map((s) => ({ key: s, label: s, note: null })),
    keyOf: (fact) => fact.stratum,
    carry: { kind: 'carries', label: 'every answer on an unsplit dimension' },
  };
}

export function partyAxis(workbook: Workbook, parties: Party[]): HeatAxis {
  const assessed = new Set(workbook.parties.filter((t) => t.kind === 'assessed').map((t) => t.id));
  return {
    id: 'party',
    label: 'Party',
    columns: parties.map((p) => ({
      key: p.id,
      label: p.name,
      note: assessed.has(p.type) ? 'assessed' : 'third party',
    })),
    keyOf: (fact) => fact.party,
    carry: { kind: 'carries', label: 'dimension and whole-estate answers' },
  };
}

// The only total axis: every question authors a role (ADR-0003), so nothing
// carries. Answers "whose answers are pinning the floor", which is the
// facilitator's chase question.
export function roleAxis(workbook: Workbook): HeatAxis {
  return {
    id: 'role',
    label: 'Role',
    columns: workbook.roles.map((r) => ({ key: r.id, label: r.name, note: null })),
    keyOf: (fact) => fact.role,
    carry: { kind: 'total' },
  };
}

// The four registered column axes. SOV is always the row axis.
export type HeatAxisId = 'dimension' | 'stratum' | 'party' | 'role';

export function heatColumnAxis(
  id: HeatAxisId,
  workbook: Workbook,
  parties: Party[],
  facts: HeatFact[],
): HeatAxis {
  switch (id) {
    case 'dimension':
      return dimensionAxis(workbook);
    case 'stratum':
      return stratumAxis(workbook, facts);
    case 'party':
      return partyAxis(workbook, parties);
    case 'role':
      return roleAxis(workbook);
  }
}

// --- aggregation ----------------------------------------------------------

function blank(): HeatCellView {
  return { seal: null, unknowns: 0, count: 0, split: false, provenance: null, facts: [] };
}

function absorb(cell: HeatCellView, fact: HeatFact): void {
  cell.count += 1;
  cell.facts.push(fact);
  if (fact.state === 'na') return;
  if (fact.state === 'dont-know') {
    cell.unknowns += 1;
    return;
  }
  if (fact.seal !== null && (cell.seal === null || fact.seal < cell.seal)) cell.seal = fact.seal;
  if (fact.stratum !== null) cell.split = true;
  const placed = fact.swept ? 'group' : 'individual';
  cell.provenance = cell.provenance === null || cell.provenance === placed ? placed : 'mixed';
}

export function heatGridModel(input: HeatGridInput): HeatGridModel {
  const { rowAxis, columnAxis } = input;
  const facts = input.includeNonGating ? input.facts : input.facts.filter((f) => gates(f.materiality));

  const cells = new Map<string, HeatCellView>();
  const carryCells = new Map<string, HeatCellView>();
  const reached = new Set<string>();
  let carryCount = 0;

  for (const fact of facts) {
    const rowKey = rowAxis.keyOf(fact);
    if (rowKey === null) continue;
    const columnKey = columnAxis.keyOf(fact);
    if (columnKey === null) {
      const cell = carryCells.get(rowKey) ?? blank();
      absorb(cell, fact);
      carryCells.set(rowKey, cell);
      carryCount += 1;
      continue;
    }
    const id = `${rowKey}|${columnKey}`;
    const cell = cells.get(id) ?? blank();
    absorb(cell, fact);
    cells.set(id, cell);
    reached.add(columnKey);
  }

  return {
    rows: rowAxis.columns,
    columns: columnAxis.columns,
    cells,
    carryCells,
    carry: columnAxis.carry,
    carryCount,
    emptyColumns: columnAxis.columns.filter((c) => !reached.has(c.key)).map((c) => c.label),
    total: facts.length,
  };
}
