import { describe, expect, it } from 'vitest';
import type {
  AnswerLedgerRecord,
  AnswerSnapshot,
  ClashClass,
  Landing,
  LedgerDecision,
  LedgerRecord,
  Party,
  PartyLedgerRecord,
  Workbook,
  WorkbookAssessment,
} from '../schema';
import type { DetailContext } from './detail-context';
import { landingNeighbors } from './detail-context';
import {
  PANEL_RESERVE_PX,
  filterDetail,
  groupMountings,
  groupRenderings,
  landingDetail,
  panelOf,
} from './detail-layout';
import type { HistoryContext } from './history';
import {
  NO_HISTORY_FILTERS,
  NO_HISTORY_VIEW,
  historyGroups,
  historyScreen,
  landingParticipants,
  searchTerms,
} from './history';
import { landingSummary } from './ledger';

// The complete state matrix of landing-history's detail reading (§3.4, §4.5-§4.9),
// proven on the pure core. The fixture is programmatic because the matrix needs a
// workbook big enough for a 100-record Landing.

const UTC = { locale: 'en-GB', zone: 'UTC' };

const PARTIES: Party[] = [
  { id: 'northwind', name: 'Northwind', type: 'assessed-us', serves: [] },
  { id: 'acme-cloud', name: 'Acme Cloud EU', type: 'provider', serves: ['compute'] },
];

function workbookOf(objectives: number, perObjective: number): Workbook {
  return {
    meta: { id: 'csf-estate', version: '2', title: 'CSF estate workbook' },
    frontSheet: [],
    sealLevels: [0, 1, 2, 3, 4].map((seal) => ({
      seal: seal as 0 | 1 | 2 | 3 | 4,
      name: `Rung ${seal}`,
      description: `Rung ${seal} description.`,
    })),
    dimensions: [
      { id: 'compute', name: 'Compute', critical: false },
      { id: 'security', name: 'Security', critical: false },
    ],
    roles: [{ id: 'ARCH', name: 'Architect' }],
    parties: [
      { id: 'assessed-us', name: 'Our estate', kind: 'assessed' },
      { id: 'provider', name: 'Cloud provider', kind: 'third-party' },
    ],
    objectives: Array.from({ length: objectives }, (_unused, o) => ({
      id: `SOV-${o + 1}`,
      name: `Objective ${o + 1}`,
      weight: 100 / objectives,
      questions: Array.from({ length: perObjective }, (_q, q) => ({
        id: `SOV-${o + 1}.q${q + 1}`,
        grain: 'dimension' as const,
        appliesTo: ['compute'],
        text: `What does the estate do about topic ${o + 1}-${q + 1}?`,
        why: 'It matters.',
        role: 'ARCH',
        defaultMateriality: 'material' as const,
        ladder: [{ id: 'choice-1', description: 'Documented.', points: 50, seal: 2 as const }],
      })),
    })),
    testEstates: [],
    recommendations: [],
  };
}

const waOf = (workbook: Workbook): WorkbookAssessment => ({
  meta: {
    id: 'wa-1',
    estate: 'Northwind production estate',
    workbookId: workbook.meta.id,
    workbookVersion: workbook.meta.version,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  workbook,
  parties: PARTIES,
});

const ctxOf = (workbook: Workbook): DetailContext => ({
  workbookAssessment: waOf(workbook),
  parties: PARTIES,
  viewer: UTC,
});

const historyCtxOf = (workbook: Workbook): HistoryContext => ({
  workbook,
  parties: PARTIES,
  viewer: UTC,
});

const G = { groupId: 'g1', placement: 'individual' as const };
const snap = (_seal: 0 | 1 | 2 | 3 | 4): AnswerSnapshot => ({ state: 'answered', rungId: 'choice-1', gesture: G });

function answerRecord({
  questionId,
  before,
  after,
  decision,
}: {
  questionId: string;
  before: AnswerSnapshot | null;
  after: AnswerSnapshot | null;
  decision: LedgerDecision;
}): AnswerLedgerRecord {
  return {
    kind: 'answer',
    questionId,
    target: { kind: 'dimension', dimension: 'compute' },
    before,
    after,
    candidates: [{ from: 'Alex', answer: after ?? snap(2), claim: null, authority: 'out-of-claim' }],
    decision,
  };
}

function landingOf({
  id,
  at,
  participant,
  note,
  records,
}: {
  id: string;
  at: string;
  participant: string;
  note?: string;
  records: LedgerRecord[];
}): Landing {
  return { id, at, participant, ...(note === undefined ? {} : { note }), records };
}

const SOLE: LedgerDecision = { kind: 'sole-source', from: 'Alex' };

const questionIds = (workbook: Workbook): string[] =>
  workbook.objectives.flatMap((objective) => objective.questions.map((question) => question.id));

function manyRecords(count: number, workbook: Workbook): AnswerLedgerRecord[] {
  const ids = questionIds(workbook);
  return Array.from({ length: count }, (_unused, index) =>
    answerRecord({
      questionId: ids[index % ids.length],
      before: null,
      after: snap(2),
      decision: SOLE,
    }),
  );
}

const uuid = (n: number): string =>
  `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;

const PARTY_ADD: PartyLedgerRecord = {
  kind: 'party',
  before: [],
  after: [{ id: 'acme-cloud', name: 'Acme Cloud EU', type: 'provider', serves: ['compute'] }],
  decision: { kind: 'add', party: 'acme-cloud' },
  affectedTargets: [],
};

describe('the detail reading across every state it can be in', () => {
  it('no Landings at all', () => {
    const workbook = workbookOf(2, 2);
    expect(historyScreen([], NO_HISTORY_VIEW)).toEqual({ kind: 'no-ledger' });
    expect(landingParticipants([])).toEqual([]);
    expect(historyGroups([], historyCtxOf(workbook), NO_HISTORY_FILTERS)).toEqual([]);
  });

  it('one Landing has no neighbours', () => {
    const workbook = workbookOf(2, 2);
    const only = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Alex',
      records: manyRecords(2, workbook),
    });
    expect(landingNeighbors([only], only.id)).toEqual({ previous: null, next: null });
    expect(landingDetail(only, [only], ctxOf(workbook)).neighbors).toEqual({
      previous: null,
      next: null,
    });
  });

  it('many Landings across dates, with a repeated participant', () => {
    const workbook = workbookOf(2, 2);
    const at = ['2026-08-09T08:00:00.000Z', '2026-08-09T18:00:00.000Z', '2026-08-10T08:00:00.000Z', '2026-08-10T18:00:00.000Z'];
    const participants = ['Alex', 'Jane', 'Alex', 'Alex'];
    const ledger = at.map((instant, index) =>
      landingOf({
        id: uuid(index + 1),
        at: instant,
        participant: participants[index],
        records: manyRecords(1, workbook),
      }),
    );
    const groups = historyGroups(ledger, historyCtxOf(workbook), NO_HISTORY_FILTERS);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.date)).toEqual(['2026-08-10', '2026-08-09']);
    expect(groups.map((group) => group.landings.length)).toEqual([2, 2]);
    expect(landingParticipants(ledger)).toEqual(['Alex', 'Jane']);
  });

  it('a Landing of nothing but new units', () => {
    const workbook = workbookOf(2, 3);
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Alex',
      records: manyRecords(6, workbook),
    });
    const summary = landingSummary(landing);
    expect(summary.newUnits).toBe(6);
    expect(summary.changed).toBe(0);
    expect(summary.cleared).toBe(0);
    expect(summary.unchanged).toBe(0);
    expect(summary.newUnits + summary.changed + summary.cleared + summary.unchanged).toBe(
      summary.unitsReviewed,
    );
  });

  it('an agreement-heavy Landing mounts nothing and reserves nothing', () => {
    const workbook = workbookOf(2, 4);
    const agreed: LedgerDecision = { kind: 'agreed', among: ['Alex', 'Jane'], kept: 'Alex' };
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Jane',
      records: questionIds(workbook).map((questionId) =>
        answerRecord({ questionId, before: snap(2), after: snap(2), decision: agreed }),
      ),
    });
    const detail = landingDetail(landing, [landing], ctxOf(workbook));
    expect(detail.groups).toHaveLength(2);
    for (const group of detail.groups) {
      expect(group.kind).toBe('agreements');
      expect(group.open).toBe(false);
    }
    const mountings = groupMountings(groupRenderings(detail.groups, null, {}, false), {});
    expect(mountings.every((m) => m.mounted === false)).toBe(true);
    expect(mountings.every((m) => m.reserve === 0)).toBe(true);
    const summary = landingSummary(landing);
    expect(summary.agreements).toBe(8);
    expect(summary.unchanged).toBe(8);
    expect(summary.resolvedClashes).toBe(0);
  });

  it('a party-only Landing reviews no units', () => {
    const workbook = workbookOf(2, 2);
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Jane',
      records: [PARTY_ADD],
    });
    const detail = landingDetail(landing, [landing], ctxOf(workbook));
    expect(detail.groups.map((group) => group.id)).toEqual(['parties']);
    expect(detail.heading.unitsReviewed).toBe(0);
    expect(detail.heading.phrases).toEqual(['1 party decision']);
  });

  it('all four clash classes stand side by side', () => {
    const workbook = workbookOf(1, 4);
    const classes: ClashClass[] = ['divergence', 'gap', 'scope', 'grain'];
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Jane',
      records: classes.map((clash, index) =>
        answerRecord({
          questionId: `SOV-1.q${index + 1}`,
          before: snap(2),
          after: snap(3),
          decision: {
            kind: 'resolved',
            clash,
            choice:
              clash === 'grain'
                ? { kind: 'grain', keep: 'strata' }
                : { kind: 'take', from: 'Jane' },
            by: 'facilitator',
            note: '',
          },
        }),
      ),
    });
    const detail = landingDetail(landing, [landing], ctxOf(workbook));
    const panels = detail.groups.flatMap((group) => group.panels);
    expect(panels.map((panel) => (panel.kind === 'answer' ? panel.clash : null))).toEqual(classes);
    expect(filterDetail(detail, 'grain').recordCount).toBe(1);
    expect(landingSummary(landing).resolvedClashes).toBe(4);
  });

  it('a cleared unit and an absent one', () => {
    const workbook = workbookOf(1, 2);
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Alex',
      records: [
        answerRecord({
          questionId: 'SOV-1.q1',
          before: snap(2),
          after: null,
          decision: SOLE,
        }),
        answerRecord({ questionId: 'SOV-1.q2', before: null, after: null, decision: SOLE }),
      ],
    });
    const detail = landingDetail(landing, [landing], ctxOf(workbook));
    const panels = detail.groups.flatMap((group) => group.panels);
    const cleared = panels[0];
    const absent = panels[1];
    expect(cleared.kind === 'answer' && cleared.effect).toBe('cleared');
    expect(cleared.kind === 'answer' && cleared.after).toEqual({ kind: 'absent' });
    expect(absent.kind === 'answer' && absent.effect).toBe('unchanged');
    expect(absent.kind === 'answer' && absent.before).toEqual({ kind: 'absent' });
    expect(absent.kind === 'answer' && absent.after).toEqual({ kind: 'absent' });
  });

  it('a very long participant name and note are carried whole', () => {
    const workbook = workbookOf(1, 2);
    const name = 'A'.repeat(120);
    const note = 'N'.repeat(400);
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: name,
      note,
      records: manyRecords(1, workbook),
    });
    const detail = landingDetail(landing, [landing], ctxOf(workbook));
    expect(detail.heading.title).toBe(`Landed ${name}’s partial`);
    expect(detail.heading.note).toBe(note);
    expect(searchTerms(landing, historyCtxOf(workbook))).toContain(note.toLowerCase());
  });

  it('a hundred records mount one group and reserve the rest', () => {
    const workbook = workbookOf(5, 20);
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Alex',
      records: manyRecords(100, workbook),
    });
    const detail = landingDetail(landing, [landing], ctxOf(workbook));
    expect(detail.recordCount).toBe(100);
    expect(detail.groups).toHaveLength(5);
    for (const group of detail.groups) {
      expect(group.panels).toHaveLength(20);
      expect(group.open).toBe(true);
    }
    const mountings = groupMountings(groupRenderings(detail.groups, null, {}, false), {
      'SOV-1': true,
    });
    expect(mountings.filter((m) => m.mounted).map((m) => m.group.id)).toEqual(['SOV-1']);
    expect(
      mountings.filter((m) => !m.mounted).reduce((total, m) => total + m.reserve, 0),
    ).toBe(80 * PANEL_RESERVE_PX);
    expect(filterDetail(detail, 'SOV-3.q7').recordCount).toBe(1);
    expect(panelOf(detail.groups, detail.groups[0].panels[0].ref)?.label).toBe(
      detail.groups[0].panels[0].label,
    );
  });

  it('no filter and no count depends on what is mounted', () => {
    const workbook = workbookOf(5, 20);
    const landing = landingOf({
      id: uuid(1),
      at: '2026-08-10T09:00:00.000Z',
      participant: 'Alex',
      records: manyRecords(100, workbook),
    });
    const detail = landingDetail(landing, [landing], ctxOf(workbook));
    const renderings = groupRenderings(detail.groups, null, {}, false);
    groupMountings(renderings, {});
    const withNothingMounted = filterDetail(detail, 'SOV-3').recordCount;
    groupMountings(renderings, { 'SOV-1': true });
    expect(filterDetail(detail, 'SOV-3').recordCount).toBe(withNothingMounted);
    expect(withNothingMounted).toBe(20);
    expect(landingSummary(landing).unitsReviewed).toBe(100);
  });
});
