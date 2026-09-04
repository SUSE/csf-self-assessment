import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { Answer, Party, Seal, Target } from '../schema';
import { assessmentOf, AUTHOR_QA_PROVENANCE } from '../assessment';
import { evaluate } from '../score-engine';
import type { HeatFact } from '../score-engine';
import {
  heatColumnAxis,
  heatGridModel,
  objectiveAxis,
  roleAxis,
  stratumAxis,
  stratumReading,
  type HeatAxis,
  type HeatAxisId,
} from './heat-axes';
import { heatDetail, heatTile } from './heat-views';

const SAMPLE = fileURLToPath(new URL('../../../../samples/csf-workbook.json', import.meta.url));
const WB = WorkbookSchema.parse(JSON.parse(readFileSync(SAMPLE, 'utf8')));

const PARTIES: Party[] = [
  { id: 'inst', name: 'Our institution', type: 'institution', serves: [] },
  { id: 'acme', name: 'Acme Cloud EU', type: 'primary-provider', serves: ['compute', 'storage'] },
  { id: 'silicon', name: 'Silicon Corp', type: 'supplier', serves: ['compute'] },
];

function answered(questionId: string, target: Target, seal: Seal, swept = false): Answer {
  return {
    questionId,
    target,
    state: 'answered',
    rungId: `choice-${seal + 1}`,
    gesture: { groupId: 'g1', placement: swept ? 'group' : 'individual' },
  } as Answer;
}
function dontKnow(questionId: string, target: Target): Answer {
  return {
    questionId,
    target,
    state: 'dont-know',
    gesture: { groupId: 'g1', placement: 'individual' },
  } as Answer;
}
const dim = (dimension: string): Target => ({ kind: 'dimension', dimension });
const str = (dimension: string, stratum: string): Target => ({
  kind: 'dimension-stratum',
  dimension,
  stratum,
});
const party = (id: string): Target => ({ kind: 'party', party: id });

// A spread that touches every mechanic: a stratum split, a party fan-out, a
// don't-know, a swept placement and an informational answer.
const ANSWERS: Answer[] = [
  answered('SOV-4.kill-switch', str('compute', 'service'), 2),
  answered('SOV-4.kill-switch', str('compute', 'software'), 3),
  answered('SOV-4.kill-switch', str('compute', 'hardware'), 1),
  answered('SOV-4.kill-switch', str('compute', 'chips'), 0),
  answered('SOV-4.kill-switch', dim('platform'), 2, true),
  answered('SOV-4.kill-switch', dim('edge'), 2),
  answered('SOV-4.portability', dim('compute'), 1),
  answered('SOV-4.portability', dim('platform'), 3),
  dontKnow('SOV-4.patch-autonomy', dim('compute')),
  answered('SOV-2.compellability', party('acme'), 1),
  answered('SOV-2.compellability', party('silicon'), 0),
  answered('SOV-2.compellability', party('inst'), 4),
  answered('SOV-2.transparency', party('acme'), 3),
  answered('SOV-4.eu-skills', { kind: 'assessment' }, 2),
];

const FACTS = evaluate(WB, assessmentOf(WB, 'Parity estate', PARTIES, ANSWERS, AUTHOR_QA_PROVENANCE))
  .facts;

function grid(cols: HeatAxisId, all = false) {
  return heatGridModel({
    facts: FACTS,
    rowAxis: objectiveAxis(WB),
    columnAxis: heatColumnAxis(cols, WB, PARTIES, FACTS),
    includeNonGating: all,
  });
}
function seal(model: ReturnType<typeof grid>, row: string, col: string): Seal | null | undefined {
  return model.cells.get(`${row}|${col}`)?.seal;
}

describe('the engine projection', () => {
  it('projects only recorded answers — an unanswered unit is never a cell', () => {
    expect(FACTS.length).toBe(ANSWERS.length);
    expect(FACTS.every((f) => f.state !== undefined)).toBe(true);
  });

  it('carries the facets every axis groups by', () => {
    const chips = FACTS.find((f) => f.stratum === 'chips');
    expect(chips?.dimension).toBe('compute');
    expect(chips?.party).toBeNull();
    expect(chips?.role).toBe('OPS');
    const compell = FACTS.find((f) => f.party === 'acme' && f.questionId === 'SOV-2.compellability');
    expect(compell?.dimension).toBeNull();
    expect(compell?.role).toBe('LEG');
  });

  it('marks informational answers so they can be excluded from the gating picture', () => {
    expect(FACTS.find((f) => f.questionId === 'SOV-2.transparency')?.materiality).toBe(
      'informational',
    );
  });
});

describe('heatGridModel', () => {
  it('takes the minimum in a cell, never an average', () => {
    const model = grid('dimension');
    // compute: kill-switch strata 2/3/1/0 plus portability 1 → 0. The
    // patch-autonomy don't-know lands here too: counted, but not in the minimum.
    expect(seal(model, 'SOV-4', 'compute')).toBe(0);
    expect(model.cells.get('SOV-4|compute')?.count).toBe(6);
    expect(model.cells.get('SOV-4|compute')?.facts.filter((f) => f.state === 'answered').length).toBe(5);
  });

  it('flags a cell that rolls up a stratum split', () => {
    expect(grid('dimension').cells.get('SOV-4|compute')?.split).toBe(true);
    expect(grid('dimension').cells.get('SOV-4|platform')?.split).toBe(false);
  });

  it('leaves an untouched cell absent rather than zero', () => {
    const model = grid('dimension');
    expect(model.cells.has('SOV-1|compute')).toBe(false);
    expect(seal(model, 'SOV-1', 'compute')).toBeUndefined();
  });

  it('counts a dont-know beside the minimum and never folds it in', () => {
    const model = grid('dimension');
    const compute = model.cells.get('SOV-4|compute');
    expect(compute?.unknowns).toBe(1);
    expect(compute?.seal).toBe(0);
  });

  it('reports provenance for the credibility lens', () => {
    const model = grid('dimension');
    expect(model.cells.get('SOV-4|platform')?.provenance).toBe('mixed');
    expect(model.cells.get('SOV-4|edge')?.provenance).toBe('individual');
  });

  it('excludes informational answers by default and includes them on request', () => {
    expect(grid('party').cells.has('SOV-2|acme')).toBe(true);
    expect(seal(grid('party'), 'SOV-2', 'acme')).toBe(1);
    // transparency is informational and would not change the minimum anyway;
    // what changes is the count.
    expect(grid('party', true).cells.get('SOV-2|acme')?.count).toBe(2);
    expect(grid('party').cells.get('SOV-2|acme')?.count).toBe(1);
  });
});

describe('the carry column', () => {
  it('holds party and whole-estate answers on the dimension axis, never spreading them', () => {
    const model = grid('dimension');
    expect(model.carryCells.get('SOV-2')?.seal).toBe(0);
    expect(model.carryCells.get('SOV-4')?.seal).toBe(2);
    // and no dimension column picked up a party answer.
    for (const column of model.columns) {
      const cell = model.cells.get(`SOV-2|${column.key}`);
      expect(cell).toBeUndefined();
    }
  });

  it('mirrors on the party axis: dimension answers carry instead', () => {
    const model = grid('party');
    expect(model.carryCells.get('SOV-4')?.count).toBeGreaterThan(0);
    expect(model.cells.get('SOV-4|acme')).toBeUndefined();
    expect(seal(model, 'SOV-2', 'silicon')).toBe(0);
  });

  it('carries nothing on the role axis — every question authors a role', () => {
    const model = grid('role');
    expect(model.carryCount).toBe(0);
    expect(model.carry).toEqual({ kind: 'total' });
    expect(seal(model, 'SOV-4', 'OPS')).toBe(0);
    expect(seal(model, 'SOV-2', 'LEG')).toBe(0);
  });

  it('names the columns nothing reaches', () => {
    expect(grid('dimension').emptyColumns).toContain('IAM');
  });
});

describe('the stratum projection', () => {
  it('only populates where a refinement exists, and reads across parents', () => {
    const model = grid('stratum');
    expect(seal(model, 'SOV-4', 'chips')).toBe(0);
    expect(seal(model, 'SOV-4', 'software')).toBe(3);
    // everything unsplit is carried, not smeared over the stratum columns.
    expect(model.carryCells.get('SOV-4')?.count).toBeGreaterThan(0);
    expect(model.cells.get('SOV-2|chips')).toBeUndefined();
  });
});

describe('a custom axis', () => {
  it('accepts any descriptor the host supplies', () => {
    const gates: HeatAxis = {
      id: 'gates',
      label: 'Gating',
      columns: [
        { key: 'yes', label: 'Gates', note: null },
        { key: 'no', label: 'Scores only', note: null },
      ],
      keyOf: (fact: HeatFact) => {
        if (fact.dimension === null) return 'yes';
        return WB.dimensions.find((d) => d.id === fact.dimension)?.critical ? 'yes' : 'no';
      },
      carry: { kind: 'total' },
    };
    const model = heatGridModel({ facts: FACTS, rowAxis: roleAxis(WB), columnAxis: gates });
    expect(model.rows.map((r) => r.key)).toEqual(WB.roles.map((r) => r.id));
    expect(model.cells.get('OPS|no')?.seal).toBe(2); // edge, non-critical
    expect(model.carryCount).toBe(0);
  });
});

import { alexRaw } from '../test-fixtures';
import { AssessmentSchema } from '../schema';

const alex = AssessmentSchema.parse(alexRaw);
const rosterA = [...alex.parties, ...(alex.partiesAdded ?? [])];
const A = evaluate(alex.workbook, { ...alex, parties: rosterA });

describe('the stratum narrowing', () => {
  it('builds columns only from strata an answer reaches', () => {
    expect(stratumAxis(alex.workbook, A.facts).columns.map((c) => c.key)).toEqual([
      'service',
      'software',
      'hardware',
      'chips',
    ]);
    expect(new Set(alex.workbook.dimensions.flatMap((d) => d.strata ?? [])).size).toBe(16);
  });

  it('reads which dimensions split and which answered whole', () => {
    expect(stratumReading(alex.workbook, A.facts)).toEqual({
      occupied: ['service', 'software', 'hardware', 'chips'],
      declared: 16,
      split: ['Compute'],
      whole: [
        'Storage',
        'Network',
        'IAM',
        'Platform (Containers, PaaS)',
        'AI/ML platform',
        'Software supply & development',
        'Security',
        'Edge (DDoS, CDN, DNS)',
        'Facilities (Power, Estate)',
      ],
    });
  });

  it('leaves the narrowed axis with no empty columns to chase', () => {
    const stratum = heatGridModel({
      facts: A.facts,
      rowAxis: objectiveAxis(alex.workbook),
      columnAxis: heatColumnAxis('stratum', alex.workbook, rosterA, A.facts),
    });
    expect(stratum.emptyColumns).toEqual([]);
    expect(stratum.cells.size).toBe(8);
    const dimension = heatGridModel({
      facts: A.facts,
      rowAxis: objectiveAxis(alex.workbook),
      columnAxis: heatColumnAxis('dimension', alex.workbook, rosterA, A.facts),
    });
    expect(dimension.emptyColumns).toEqual([]);
  });

  it('narrows nothing when every declared stratum is answered', () => {
    expect(stratumAxis(WB, FACTS).columns).toHaveLength(4);
    const reading = stratumReading(WB, FACTS);
    expect(reading.declared).toBe(4);
    expect(reading.split).toEqual(['Compute']);
    expect(reading.whole).toEqual([]);
  });
});

const MINIMUM_RULE =
  'Each cell is the minimum SEAL over the asserted material answers that land in it — never an average, and never a zero where nothing was asserted.';

function gridView(axis: HeatAxisId, result = A, parties = rosterA) {
  const view = heatTile(result, alex.workbook, parties, axis);
  if (view.kind !== 'grid') throw new Error(`expected a grid for ${axis}`);
  return view;
}
function mark(view: ReturnType<typeof gridView>, row: string, column: string) {
  const found = view.rows.find((r) => r.key === row);
  if (found === undefined) throw new Error(`no row ${row}`);
  const index = view.columns.findIndex((c) => c.key === column);
  const cell = found.cells[index];
  if (cell === undefined) throw new Error(`no column ${column}`);
  return cell;
}

describe('the heat tile view', () => {
  it('lays every row out with a total set of marks', () => {
    const view = gridView('dimension');
    expect(view.columns).toHaveLength(10);
    expect(view.rows).toHaveLength(8);
    for (const row of view.rows) expect(row.cells).toHaveLength(10);
    expect(view.painted).toBe(22);
    expect(view.carryCount).toBe(30);
    expect(view.rows.filter((r) => r.carry !== null)).toHaveLength(8);
  });

  it('keys a mark so the dashboard can hold it', () => {
    const view = gridView('dimension');
    expect(mark(view, 'SOV-4', 'storage').key).toBe('cell:SOV-4:storage');
    expect(view.rows.find((r) => r.key === 'SOV-4')?.carry?.key).toBe('carry:SOV-4');
  });

  it('names absence as absence, never a zero', () => {
    const absent = mark(gridView('dimension'), 'SOV-1', 'compute');
    expect(absent.cell).toBeNull();
    expect(absent.stack).toEqual([]);
    expect(absent.summary).toBe('Strategic Sovereignty × Compute — no answer reaches this cell');
  });

  it('summarises a painted mark with its minimum and its unknowns', () => {
    const view = gridView('dimension');
    expect(mark(view, 'SOV-4', 'compute').summary).toBe(
      'Operational Sovereignty × Compute — SEAL-1 · minimum over 7 answers · includes a stratum split',
    );
    expect(mark(view, 'SOV-5', 'network').summary).toBe(
      "Supply Chain Sovereignty × Network — nothing asserted · 1 don't-know",
    );
  });

  it('stacks the strata rolled up into a split cell', () => {
    const view = gridView('dimension');
    expect(mark(view, 'SOV-4', 'compute').stack).toEqual([
      { stratum: 'service', seal: 3 },
      { stratum: 'software', seal: 2 },
      { stratum: 'hardware', seal: 1 },
      { stratum: 'chips', seal: 1 },
    ]);
    expect(mark(view, 'SOV-4', 'storage').stack).toEqual([]);
  });

  it('totals a row across its cells and its carry', () => {
    const view = gridView('dimension');
    expect(view.rows.find((r) => r.key === 'SOV-2')?.total).toBe(9);
    expect(view.rows.find((r) => r.key === 'SOV-8')?.total).toBe(0);
  });

  it('captions the dimension axis with its carry', () => {
    expect(gridView('dimension').caption).toBe(
      `${MINIMUM_RULE} The carry column holds party and whole-estate answers: 30 answers kept in one column so nothing is painted across the row.`,
    );
  });

  it('captions a total axis by saying nothing carries', () => {
    const view = gridView('role');
    expect(view.carry).toEqual({ kind: 'total' });
    for (const row of view.rows) expect(row.carry).toBeNull();
    expect(view.painted).toBe(16);
    expect(view.caption).toBe(
      `${MINIMUM_RULE} Every answer sits on this axis; nothing is carried.`,
    );
  });

  it('captions the stratum axis by naming who split and who answered whole', () => {
    expect(gridView('stratum').caption).toBe(
      'Columns are the strata an answer actually reaches — 4 of 16 declared. Split: Compute. Answered whole: Storage, Network, IAM, Platform (Containers, PaaS), AI/ML platform, Software supply & development, Security, Edge (DDoS, CDN, DNS), Facilities (Power, Estate). A dimension answered whole is an answer, not a gap. The carry column holds every answer on an unsplit dimension: 69 answers kept in one column so nothing is painted across the row.',
    );
  });

  it('names why a tile is empty instead of rendering a hole', () => {
    for (const axis of ['dimension', 'stratum', 'party', 'role'] as const) {
      const view = heatTile({ ...A, facts: [] }, alex.workbook, rosterA, axis);
      expect(view.kind).toBe('empty');
      if (view.kind !== 'empty') throw new Error('unreachable');
      expect(view.reason).toBe(
        axis === 'stratum'
          ? 'No dimension is split into strata yet — this grid fills in once an answer lands on a layer.'
          : 'Nothing asserted yet — this grid fills in as answers land.',
      );
    }
    const noRoster = heatTile(A, alex.workbook, [], 'party');
    expect(noRoster.kind).toBe('empty');
    if (noRoster.kind !== 'empty') throw new Error('unreachable');
    expect(noRoster.reason).toBe('No parties declared yet — seed the roster and this grid fills in.');
  });
});

describe('the mark detail', () => {
  const view = heatTile(A, alex.workbook, rosterA, 'dimension');

  it('names every answer behind a carry mark, in engine order', () => {
    const detail = heatDetail(view, 'carry:SOV-2', alex.workbook, rosterA);
    expect(detail?.title).toBe('Legal & Jurisdictional Sovereignty × Carry');
    expect(detail?.summary).toBe('SEAL-1 · minimum over 9 answers');
    expect(detail?.rows).toHaveLength(9);
    expect(detail?.rows.map((r) => [r.label, r.reading, r.roleName])).toEqual([
      ['The institution', 'n/a', 'Legal'],
      ['Acme Cloud EU', 'SEAL-1', 'Legal'],
      ['Modelhouse AI', 'SEAL-2', 'Legal'],
      ['SiliconWare Corp.', 'SEAL-4', 'Legal'],
      ['The institution', 'n/a', 'Legal'],
      ['Acme Cloud EU', 'SEAL-2', 'Legal'],
      ['Modelhouse AI', 'SEAL-3', 'Legal'],
      ['SiliconWare Corp.', 'SEAL-4', 'Legal'],
      ['whole estate', 'SEAL-2', 'Legal'],
    ]);
    expect(detail?.rows[1]?.questionText.startsWith('Could a non-EU authority lawfully compel')).toBe(
      true,
    );
    expect(detail?.rows[1]?.questionId).toBe('SOV-2.compellability');
    expect(detail?.rows[1]?.evidence).toBe(true);
    expect(detail?.rows[2]?.evidence).toBe(false);
  });

  it('names the strata behind a split cell', () => {
    const detail = heatDetail(view, 'cell:SOV-4:compute', alex.workbook, rosterA);
    expect(detail?.rows.map((r) => [r.label, r.reading])).toEqual([
      ['Compute · service', 'SEAL-3'],
      ['Compute · software', 'SEAL-2'],
      ['Compute · hardware', 'SEAL-1'],
      ['Compute · chips', 'SEAL-1'],
      ['Compute', 'SEAL-2'],
      ['Compute', 'SEAL-1'],
      ['Compute', 'SEAL-2'],
    ]);
  });

  it('has nothing to show for a mark nothing reaches', () => {
    expect(heatDetail(view, 'cell:SOV-1:compute', alex.workbook, rosterA)).toBeNull();
    expect(heatDetail(view, 'carry:SOV-3', alex.workbook, rosterA)).toBeNull();
    expect(heatDetail(view, 'nonsense', alex.workbook, rosterA)).toBeNull();
  });

  it("reads a don't-know as a don't-know, never a rung", () => {
    const detail = heatDetail(view, 'cell:SOV-5:network', alex.workbook, rosterA);
    expect(detail?.rows.map((r) => r.reading)).toEqual(["don't-know"]);
    // Typed too, so a rail renders the mark without parsing the string — and a
    // don't-know carries NO rung to render.
    expect(detail?.rows.map((r) => [r.state, r.seal])).toEqual([['dont-know', null]]);
  });

  it('types every reading beside its string, rungs and states alike', () => {
    const detail = heatDetail(view, 'carry:SOV-2', alex.workbook, rosterA);
    expect(detail?.rows.map((r) => [r.reading, r.state, r.seal])).toEqual([
      ['n/a', 'na', null],
      ['SEAL-1', 'answered', 1],
      ['SEAL-2', 'answered', 2],
      ['SEAL-4', 'answered', 4],
      ['n/a', 'na', null],
      ['SEAL-2', 'answered', 2],
      ['SEAL-3', 'answered', 3],
      ['SEAL-4', 'answered', 4],
      ['SEAL-2', 'answered', 2],
    ]);
  });
});

describe('engine parity', () => {
  // The guarantee that this grid cannot drift from the Reader heat map: on the
  // objective × dimension axis it must reproduce evaluate().heatmap exactly.
  it('reproduces evaluate().heatmap cell for cell', () => {
    const assessment = assessmentOf(WB, 'Parity estate', PARTIES, ANSWERS, AUTHOR_QA_PROVENANCE);
    const result = evaluate(WB, assessment);
    const model = grid('dimension');

    expect(result.heatmap.length).toBeGreaterThan(0);
    for (const engineCell of result.heatmap) {
      expect(seal(model, engineCell.objective, engineCell.dimension)).toBe(engineCell.seal);
    }
    // and the grid paints nothing the engine does not.
    const engineKeys = new Set(result.heatmap.map((c) => `${c.objective}|${c.dimension}`));
    for (const [key, view] of model.cells) {
      if (view.seal === null) continue;
      expect(engineKeys.has(key)).toBe(true);
    }
  });

  it('agrees with the engine on provenance', () => {
    const assessment = assessmentOf(WB, 'Parity estate', PARTIES, ANSWERS, AUTHOR_QA_PROVENANCE);
    const result = evaluate(WB, assessment);
    const model = grid('dimension');
    for (const engineCell of result.heatmap) {
      const view = model.cells.get(`${engineCell.objective}|${engineCell.dimension}`);
      expect(view?.provenance).toBe(engineCell.provenance);
    }
  });
});
