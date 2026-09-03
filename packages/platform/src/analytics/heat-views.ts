import type { Party, Seal, Workbook } from '../schema';
import type { EngineResult, HeatFact } from '../score-engine';
import { targetLabel } from '../utils/target-label';
import { heatColumnAxis, heatGridModel, objectiveAxis, stratumReading } from './heat-axes';
import type { AxisCarry, HeatAxisId, HeatCellView, HeatColumn, StratumReading } from './heat-axes';

// --- the tile model -------------------------------------------------------

// The tile, the mark and the detail views over the grid model (see./heat-axes
// for the reading rules they honour).

export type HeatMark =
  | { kind: 'cell'; row: string; column: string }
  | { kind: 'carry'; row: string };

// `cell:<row>:<column>` | `carry:<row>` — the opaque key the dashboard holds as
// the selected mark (Scope decision 4).
export function heatMarkKey(mark: HeatMark): string {
  return mark.kind === 'cell' ? `cell:${mark.row}:${mark.column}` : `carry:${mark.row}`;
}

// One stratum rung rolled up into a split cell (analytics §3.3, "a cell holds a
// stratum stack").
export type HeatStackSegment = { stratum: string; seal: Seal };

export type HeatMarkView = {
  key: string;
  mark: HeatMark;
  // Null when no answer reaches this mark — absence, never a zero (#2).
  cell: HeatCellView | null;
  // `<row> × <column> — <reading>`; the hover/focus text and the mark's
  // accessible name.
  summary: string;
  // [] when the cell is not a stratum roll-up.
  stack: HeatStackSegment[];
};

export type HeatRowView = {
  key: string;
  label: string;
  note: string | null;
  // One per entry of `columns`, in that order — total, so absence is a mark
  // rather than a hole in the array.
  cells: HeatMarkView[];
  // The row's carry mark; null iff the axis is total.
  carry: HeatMarkView | null;
  // Facts in this row across its cells and its carry.
  total: number;
};

export type HeatTileView =
  | {
      kind: 'grid';
      axis: HeatAxisId;
      columns: HeatColumn[];
      rows: HeatRowView[];
      carry: AxisCarry;
      carryCount: number;
      // Marks holding at least one fact.
      painted: number;
      caption: string;
    }
  | { kind: 'empty'; axis: HeatAxisId; reason: string };

const MINIMUM_RULE =
  'Each cell is the minimum SEAL over the asserted material answers that land in it — never an average, and never a zero where nothing was asserted.';

function markReading(cell: HeatCellView | null): string {
  if (cell === null) return 'no answer reaches this cell';
  const parts: string[] = [];
  parts.push(
    cell.seal === null
      ? 'nothing asserted'
      : `SEAL-${cell.seal} · minimum over ${cell.count} ${cell.count === 1 ? 'answer' : 'answers'}`,
  );
  if (cell.unknowns > 0) parts.push(`${cell.unknowns} don't-know`);
  if (cell.split) parts.push('includes a stratum split');
  return parts.join(' · ');
}

function markView(mark: HeatMark, rowLabel: string, columnLabel: string, cell: HeatCellView | undefined): HeatMarkView {
  const found = cell ?? null;
  return {
    key: heatMarkKey(mark),
    mark,
    cell: found,
    summary: `${rowLabel} × ${columnLabel} — ${markReading(found)}`,
    stack: found === null || !found.split ? [] : stackOf(found.facts),
  };
}

function stackOf(facts: HeatFact[]): HeatStackSegment[] {
  const stack: HeatStackSegment[] = [];
  for (const fact of facts) {
    if (fact.stratum !== null && fact.seal !== null) stack.push({ stratum: fact.stratum, seal: fact.seal });
  }
  return stack;
}

function emptyReason(
  axis: HeatAxisId,
  kind: 'columns' | 'facts',
  dimensionsDeclared: boolean,
): string {
  if (kind === 'columns' && !dimensionsDeclared && axis === 'dimension') {
    return 'This workbook declares no dimensions — there is no dimension axis to pivot on, and none is invented.';
  }
  if (kind === 'columns' && !dimensionsDeclared && axis === 'stratum') {
    return 'This workbook declares no dimensions, so there are no layers to split — nothing is invented here.';
  }
  if (kind === 'columns' && axis === 'stratum') {
    return 'No dimension is split into strata yet — this grid fills in once an answer lands on a layer.';
  }
  if (kind === 'columns' && axis === 'party') {
    return 'No parties declared yet — seed the roster and this grid fills in.';
  }
  return 'Nothing asserted yet — this grid fills in as answers land.';
}

function stratumCaption(reading: StratumReading, carry: AxisCarry, carryCount: number): string {
  const clauses = [
    `Columns are the strata an answer actually reaches — ${reading.occupied.length} of ${reading.declared} declared.`,
  ];
  if (reading.split.length > 0) clauses.push(`Split: ${reading.split.join(', ')}.`);
  if (reading.whole.length > 0) clauses.push(`Answered whole: ${reading.whole.join(', ')}.`);
  clauses.push('A dimension answered whole is an answer, not a gap.');
  clauses.push(carryClause(carry, carryCount));
  return clauses.join(' ');
}

function carryClause(carry: AxisCarry, carryCount: number): string {
  return carry.kind === 'total'
    ? 'Every answer sits on this axis; nothing is carried.'
    : `The carry column holds ${carry.label}: ${carryCount} answers kept in one column so nothing is painted across the row.`;
}

export function heatTile(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
  axis: HeatAxisId,
): HeatTileView {
  const columnAxis = heatColumnAxis(axis, workbook, parties, result.facts);
  if (columnAxis.columns.length === 0) {
    return { kind: 'empty', axis, reason: emptyReason(axis, 'columns', workbook.dimensions.length > 0) };
  }
  const model = heatGridModel({
    facts: result.facts,
    rowAxis: objectiveAxis(workbook),
    columnAxis,
  });
  if (model.cells.size === 0 && model.carryCells.size === 0) {
    return { kind: 'empty', axis, reason: emptyReason(axis, 'facts', workbook.dimensions.length > 0) };
  }

  const rows: HeatRowView[] = model.rows.map((row) => {
    const cells = model.columns.map((column) =>
      markView(
        { kind: 'cell', row: row.key, column: column.key },
        row.label,
        column.label,
        model.cells.get(`${row.key}|${column.key}`),
      ),
    );
    const carry =
      model.carry.kind === 'total'
        ? null
        : markView({ kind: 'carry', row: row.key }, row.label, 'Carry', model.carryCells.get(row.key));
    return {
      key: row.key,
      label: row.label,
      note: row.note,
      cells,
      carry,
      total:
        cells.reduce((n, c) => n + (c.cell?.count ?? 0), 0) + (carry?.cell?.count ?? 0),
    };
  });

  const caption =
    axis === 'stratum'
      ? stratumCaption(stratumReading(workbook, result.facts), model.carry, model.carryCount)
      : [
          MINIMUM_RULE,
          carryClause(model.carry, model.carryCount),
          ...(model.emptyColumns.length > 0
            ? [`No answer reaches ${model.emptyColumns.join(', ')}.`]
            : []),
        ].join(' ');

  return {
    kind: 'grid',
    axis,
    columns: model.columns,
    rows,
    carry: model.carry,
    carryCount: model.carryCount,
    painted: model.cells.size,
    caption,
  };
}

export type HeatDetailRow = {
  questionId: string;
  questionText: string;
  // The unit's label from utils/target-label.
  label: string;
  // The authored role's display NAME, resolved from workbook.roles.
  roleName: string;
  // `SEAL-0`, `don't-know` or `n/a` — the rung, or the state where there is none.
  reading: string;
  // The reading typed, so a view can render the ramp rather than parse the string.
  state: HeatFact['state'];
  seal: Seal | null;
  evidence: boolean;
};

export type HeatDetail = {
  // `<row label> × <column label>`.
  title: string;
  // The mark's reading, the same text the tooltip carries after its `— `.
  summary: string;
  // Every answer behind the mark, in engine order (analytics §4.4.3).
  rows: HeatDetailRow[];
};

function factReading(fact: HeatFact): string {
  if (fact.state === 'dont-know') return "don't-know";
  if (fact.state === 'na') return 'n/a';
  return fact.seal === null ? 'n/a' : `SEAL-${fact.seal}`;
}

// Null when the key names no mark, or a mark nothing reaches.
export function heatDetail(
  view: HeatTileView,
  markKey: string,
  workbook: Workbook,
  parties: Party[],
): HeatDetail | null {
  if (view.kind !== 'grid') return null;
  for (const row of view.rows) {
    for (const found of [...row.cells, ...(row.carry === null ? [] : [row.carry])]) {
      if (found.key !== markKey) continue;
      const cell = found.cell;
      if (cell === null) return null;
      const mark = found.mark;
      const columnLabel =
        mark.kind === 'carry'
          ? 'Carry'
          : (view.columns.find((c) => c.key === mark.column)?.label ?? mark.column);
      const questions = new Map(
        workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]),
      );
      return {
        title: `${row.label} × ${columnLabel}`,
        summary: markReading(cell),
        rows: cell.facts.map((fact) => ({
          questionId: fact.questionId,
          questionText: questions.get(fact.questionId) ?? fact.questionId,
          label: targetLabel(workbook, parties, fact.target),
          roleName: workbook.roles.find((r) => r.id === fact.role)?.name ?? fact.role,
          reading: factReading(fact),
          state: fact.state,
          seal: fact.state === 'answered' ? fact.seal : null,
          evidence: fact.evidence,
        })),
      };
    }
  }
  return null;
}
