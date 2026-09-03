import { describe, expect, it } from 'vitest';
import type {
  AnswerLedgerRecord,
  AnswerSnapshot,
  Landing,
  LandingEnvelope,
  Party,
  PartyLedgerRecord,
  Seal,
} from '../schema';
import type { HistoryContext, HistoryFilters, HistoryView } from './history';
import {
  NO_HISTORY_FILTERS,
  NO_HISTORY_VIEW,
  calendarDateOf,
  dateGroupHeading,
  historyGroups,
  historyScreen,
  isHistoryView,
  isNarrowed,
  landingById,
  landingCountPhrases,
  landingDate,
  landingForSearch,
  landingMatches,
  landingParticipants,
  landingTime,
  longDateOf,
  sameHistoryView,
  searchTerms,
} from './history';

const L1 = '11111111-1111-4111-8111-111111111111';
const L2 = '22222222-2222-4222-8222-222222222222';
const L3 = '33333333-3333-4333-8333-333333333333';

const E_LATE: LandingEnvelope = { id: L1, at: '2026-08-09T22:15:00.000Z', participant: 'Alex' };
const E_NOON: LandingEnvelope = { id: L2, at: '2026-08-10T12:32:18.422Z', participant: 'Jane' };

const BERLIN = { locale: 'en-GB', zone: 'Europe/Berlin' };
const UTC = { locale: 'en-GB', zone: 'UTC' };
const LA = { locale: 'en-GB', zone: 'America/Los_Angeles' };

const PARTIES: Party[] = [{ id: 'acme-cloud', name: 'Acme Cloud EU', type: 't1', serves: [] }];

const WB = {
  dimensions: [
    { id: 'storage', name: 'Storage', critical: false },
    { id: 'security', name: 'Security', critical: false },
  ],
  objectives: [
    {
      id: 'SOV-2',
      name: 'Exit',
      weight: 100,
      questions: [
        {
          id: 'SOV-2.q1',
          grain: 'party' as const,
          axis: 'assessment' as const,
          text: 'Can the estate withdraw within 90 days?',
          why: 'Exit matters.',
          role: 'ARCH',
          defaultMateriality: 'material' as const,
          ladder: [
            { id: 'choice-1', description: 'Documented.', points: 50, seal: 2 as Seal },
            { id: 'choice-2', description: 'Verified.', points: 75, seal: 3 as Seal },
          ],
        },
        {
          id: 'SOV-2.q2',
          grain: 'dimension' as const,
          appliesTo: ['storage'],
          text: 'Where does the estate hold data?',
          why: 'Location matters.',
          role: 'ARCH',
          defaultMateriality: 'material' as const,
          ladder: [
            { id: 'choice-1', description: 'Mapped.', points: 50, seal: 2 as Seal },
            { id: 'choice-2', description: 'Verified.', points: 75, seal: 3 as Seal },
          ],
        },
      ],
    },
  ],
};

const ctx: HistoryContext = { workbook: WB, parties: PARTIES, viewer: UTC };
const ctxIn = (viewer: { locale: string; zone: string }): HistoryContext => ({ ...ctx, viewer });

const G = { groupId: 'g1', placement: 'individual' as const };
const snap = (rungId: string): AnswerSnapshot => ({ state: 'answered', rungId, gesture: G });

const ALEX_SOLE: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-2.q1',
  target: { kind: 'assessment' },
  before: null,
  after: snap('choice-1'),
  candidates: [{ from: 'Alex', answer: snap('choice-1'), claim: null, authority: 'out-of-claim' }],
  decision: { kind: 'sole-source', from: 'Alex' },
};

const JANE_PARTY: PartyLedgerRecord = {
  kind: 'party',
  before: [
    { id: 'acme-cloud', name: 'Acme Cloud EU', type: 't1', serves: [] },
    { id: 'jane:acme-eu', name: 'Acme Cloud Europe SAS', type: 't1', serves: ['security'] },
  ],
  after: [{ id: 'acme-cloud', name: 'Acme Cloud EU', type: 't1', serves: ['security'] }],
  decision: {
    kind: 'absorb',
    from: 'jane:acme-eu',
    into: 'acme-cloud',
    name: 'Acme Cloud EU',
    by: 'facilitator',
    note: '',
  },
  affectedTargets: [],
};

const JANE_RESOLVED: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-2.q1',
  target: { kind: 'assessment' },
  before: snap('choice-1'),
  after: snap('choice-2'),
  candidates: [
    { from: 'Alex', answer: snap('choice-1'), claim: null, authority: 'out-of-claim' },
    { from: 'Jane', answer: snap('choice-2'), claim: null, authority: 'out-of-claim' },
  ],
  decision: {
    kind: 'resolved',
    clash: 'divergence',
    choice: { kind: 'take', from: 'Jane' },
    by: 'facilitator',
    note: '',
  },
};

const ALEX_AGREED: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-2.q2',
  target: { kind: 'dimension', dimension: 'storage' },
  before: snap('choice-2'),
  after: snap('choice-2'),
  candidates: [
    { from: 'Alex', answer: snap('choice-2'), claim: null, authority: 'out-of-claim' },
    { from: 'Jane', answer: snap('choice-2'), claim: null, authority: 'out-of-claim' },
  ],
  decision: { kind: 'agreed', among: ['Alex', 'Jane'], kept: 'Alex' },
};

const ALEX_1: Landing = { ...E_LATE, records: [ALEX_SOLE] };
const JANE: Landing = {
  ...E_NOON,
  note: 'after the security discussion',
  records: [JANE_PARTY, JANE_RESOLVED],
};
const ALEX_2: Landing = {
  id: L3,
  at: '2026-08-10T20:05:00.000Z',
  participant: 'Alex',
  records: [ALEX_AGREED],
};

const filters = (over: Partial<HistoryFilters>): HistoryFilters => ({
  ...NO_HISTORY_FILTERS,
  ...over,
});

const matching = (
  ledger: Landing[],
  over: Partial<HistoryFilters>,
  viewer = UTC,
): string[] =>
  ledger.filter((l) => landingMatches(l, ctxIn(viewer), filters(over))).map((l) => l.id);

describe('the viewer’s calendar', () => {
  it('calendarDateOf reads the instant in the viewer’s zone', () => {
    expect(calendarDateOf('2026-08-14T23:30:00.000Z', { locale: 'en-GB', zone: 'Pacific/Auckland' })).toBe(
      '2026-08-15',
    );
    expect(calendarDateOf('2026-08-14T23:30:00.000Z', { locale: 'en-GB', zone: 'America/Los_Angeles' })).toBe(
      '2026-08-14',
    );
  });

  it('a Landing’s date is the viewer’s calendar day, not UTC’s', () => {
    expect(landingDate(E_LATE, UTC)).toBe('2026-08-09');
    expect(landingDate(E_LATE, BERLIN)).toBe('2026-08-10');
    expect(landingDate(E_NOON, LA)).toBe('2026-08-10');
  });

  it('a Landing’s time is the viewer’s clock', () => {
    expect(landingTime(E_NOON, BERLIN)).toBe('14:32');
    expect(landingTime(E_NOON, UTC)).toBe('12:32');
  });

  it('a date heading names the calendar day in every zone', () => {
    expect(dateGroupHeading('2026-08-10', BERLIN)).toBe('Landings on 10 August 2026');
    expect(dateGroupHeading('2026-08-10', { locale: 'en-GB', zone: 'Pacific/Auckland' })).toBe(
      'Landings on 10 August 2026',
    );
    expect(dateGroupHeading('2026-08-10', UTC)).toBe('Landings on 10 August 2026');
  });

  it('the long calendar day reads the same everywhere', () => {
    expect(longDateOf('2026-08-10', UTC)).toBe('10 August 2026');
    expect(dateGroupHeading('2026-08-10', BERLIN)).toBe('Landings on 10 August 2026');
  });
});

const LEDGER = [ALEX_1, JANE, ALEX_2];

describe('what a filter and a search match', () => {
  it('every searchable string is lower-cased and nothing else is', () => {
    const terms = searchTerms(JANE, ctx);
    expect(terms).toContain('jane');
    expect(terms).toContain('after the security discussion');
    expect(terms).toContain(L2);
    expect(terms).toContain('sov-2.q1');
    expect(terms).toContain('can the estate withdraw within 90 days?');
    expect(terms).toContain('whole estate');
    expect(terms).toContain('acme cloud eu');
    expect(terms).toContain('acme cloud europe sas');
    expect(terms).not.toContain('JANE');
  });

  it('search is a case-insensitive substring over those terms', () => {
    expect(matching(LEDGER, { search: 'SECURITY discussion' })).toEqual([L2]);
    expect(matching(LEDGER, { search: 'europe sas' })).toEqual([L2]);
    expect(matching(LEDGER, { search: 'withdraw' })).toEqual([L1, L2]);
    expect(matching(LEDGER, { search: '2222222' })).toEqual([L2]);
    expect(matching(LEDGER, { search: '  jane ' })).toEqual([L2]);
    expect(matching(LEDGER, { search: 'nothing here' })).toEqual([]);
  });

  it('a participant filter is an exact name', () => {
    expect(matching(LEDGER, { participant: 'Alex' })).toEqual([L1, L3]);
    expect(matching(LEDGER, { participant: 'alex' })).toEqual([]);
  });

  it('a date range compares calendar days in the viewer’s zone', () => {
    const day = { kind: 'range' as const, from: '2026-08-10', to: '2026-08-10' };
    expect(matching(LEDGER, { dates: day })).toEqual([L2, L3]);
    expect(matching(LEDGER, { dates: day }, BERLIN)).toEqual([L1, L2, L3]);
    expect(matching(LEDGER, { dates: { kind: 'range', from: null, to: '2026-08-09' } })).toEqual([
      L1,
    ]);
    expect(matching(LEDGER, { dates: { kind: 'range', from: '2026-08-10', to: null } })).toEqual([
      L2,
      L3,
    ]);
    expect(matching(LEDGER, { dates: { kind: 'all-time' } })).toEqual([L1, L2, L3]);
  });

  it('an outcome filter keeps a Landing whose count is non-zero', () => {
    expect(matching(LEDGER, { outcome: 'new' })).toEqual([L1]);
    expect(matching(LEDGER, { outcome: 'changed' })).toEqual([L2]);
    expect(matching(LEDGER, { outcome: 'agreements' })).toEqual([L3]);
    expect(matching(LEDGER, { outcome: 'resolved' })).toEqual([L2]);
    expect(matching(LEDGER, { outcome: 'parties' })).toEqual([L2]);
    expect(matching(LEDGER, { outcome: 'cleared' })).toEqual([]);
    expect(matching(LEDGER, { outcome: 'all' })).toEqual([L1, L2, L3]);
  });

  it('filters compose', () => {
    expect(matching(LEDGER, { participant: 'Alex', outcome: 'agreements' })).toEqual([L3]);
  });

  it('the participant options are the ledger’s distinct names, alphabetical', () => {
    expect(landingParticipants([JANE, ALEX_1, ALEX_2])).toEqual(['Alex', 'Jane']);
    expect(landingParticipants([])).toEqual([]);
  });

  it('nothing narrows an untouched filter', () => {
    expect(isNarrowed(NO_HISTORY_FILTERS)).toBe(false);
    expect(isNarrowed(filters({ search: 'a' }))).toBe(true);
    expect(isNarrowed(filters({ participant: 'Alex' }))).toBe(true);
    expect(isNarrowed(filters({ dates: { kind: 'range', from: null, to: null } }))).toBe(true);
    expect(isNarrowed(filters({ outcome: 'new' }))).toBe(true);
  });
});

describe('the chronology, addressed by id and read as counts', () => {
  it('groups run newest first and break on a date change', () => {
    const groups = historyGroups(LEDGER, ctx, NO_HISTORY_FILTERS);
    expect(groups.map((g) => g.date)).toEqual(['2026-08-10', '2026-08-09']);
    expect(groups[0].landings).toEqual([ALEX_2, JANE]);
    expect(groups[0].heading).toBe('Landings on 10 August 2026');
    expect(groups[1].landings).toEqual([ALEX_1]);
    expect(groups[1].heading).toBe('Landings on 9 August 2026');
  });

  it('a backwards clock repeats a heading instead of reordering', () => {
    const groups = historyGroups([JANE, ALEX_1, ALEX_2], ctx, NO_HISTORY_FILTERS);
    expect(groups.map((g) => g.date)).toEqual(['2026-08-10', '2026-08-09', '2026-08-10']);
    expect(groups.map((g) => g.landings)).toEqual([[ALEX_2], [ALEX_1], [JANE]]);
  });

  it('the viewer’s zone can collapse two groups into one', () => {
    const groups = historyGroups(LEDGER, ctxIn(BERLIN), NO_HISTORY_FILTERS);
    expect(groups).toHaveLength(1);
    expect(groups[0].date).toBe('2026-08-10');
    expect(groups[0].landings).toEqual([ALEX_2, JANE, ALEX_1]);
  });

  it('groups hold only what the filters keep', () => {
    const alex = historyGroups(LEDGER, ctx, filters({ participant: 'Alex' }));
    expect(alex.map((g) => g.landings)).toEqual([[ALEX_2], [ALEX_1]]);
    expect(historyGroups(LEDGER, ctx, filters({ search: 'nothing here' }))).toEqual([]);
  });

  it('a Landing is addressed by its full id', () => {
    expect(landingById(LEDGER, L2)).toBe(JANE);
    expect(landingById(LEDGER, '2222222')).toBeNull();
    expect(landingById([], L2)).toBeNull();
  });

  it('an exact entry resolves, an ambiguous one does not', () => {
    expect(landingForSearch(LEDGER, `  ${L2}  `)).toBe(JANE);
    expect(landingForSearch(LEDGER, '2222222')).toBe(JANE);
    expect(landingForSearch(LEDGER, L2.toUpperCase())).toBe(JANE);
    expect(landingForSearch(LEDGER, 'security')).toBeNull();
    expect(landingForSearch(LEDGER, '')).toBeNull();
    const twin: Landing = { ...ALEX_1, id: '11111111-1111-4111-8111-999999999999' };
    expect(landingForSearch([ALEX_1, twin], '1111111')).toBeNull();
  });

  it('only non-zero counts get a phrase, effect counts first', () => {
    expect(
      landingCountPhrases({
        unitsReviewed: 62,
        newUnits: 13,
        changed: 29,
        cleared: 1,
        unchanged: 19,
        agreements: 19,
        resolvedClashes: 34,
        partyDecisions: 2,
      }),
    ).toEqual([
      '13 new',
      '29 standing changes',
      '1 cleared',
      '19 unchanged',
      '19 agreements',
      '2 party decisions',
      '34 facilitator-resolved clashes',
    ]);
  });

  it('each phrase has a singular form', () => {
    expect(
      landingCountPhrases({
        unitsReviewed: 4,
        newUnits: 1,
        changed: 1,
        cleared: 1,
        unchanged: 1,
        agreements: 1,
        resolvedClashes: 1,
        partyDecisions: 1,
      }),
    ).toEqual([
      '1 new',
      '1 standing change',
      '1 cleared',
      '1 unchanged',
      '1 agreement',
      '1 party decision',
      '1 facilitator-resolved clash',
    ]);
  });

  it('an all-zero summary has no phrases', () => {
    expect(
      landingCountPhrases({
        unitsReviewed: 0,
        newUnits: 0,
        changed: 0,
        cleared: 0,
        unchanged: 0,
        agreements: 0,
        resolvedClashes: 0,
        partyDecisions: 0,
      }),
    ).toEqual([]);
  });
});

describe('which screen History shows', () => {
  const GONE = '99999999-9999-4999-8999-999999999999';

  it('an empty ledger with no named Landing is the no-ledger state', () => {
    expect(historyScreen([], NO_HISTORY_VIEW)).toEqual({ kind: 'no-ledger' });
  });

  it('a ledger with no named Landing is the list', () => {
    expect(historyScreen(LEDGER, NO_HISTORY_VIEW)).toEqual({ kind: 'list' });
  });

  it('a named Landing the ledger holds is its detail', () => {
    const screen = historyScreen(LEDGER, { ...NO_HISTORY_VIEW, landing: L2 });
    expect(screen).toEqual({ kind: 'detail', landing: JANE });
    expect(screen.kind === 'detail' && screen.landing).toBe(JANE);
  });

  it('a named Landing the ledger lacks is not found — even when the ledger is empty', () => {
    expect(historyScreen(LEDGER, { ...NO_HISTORY_VIEW, landing: GONE })).toEqual({
      kind: 'missing',
      id: GONE,
    });
    expect(historyScreen([], { ...NO_HISTORY_VIEW, landing: GONE })).toEqual({
      kind: 'missing',
      id: GONE,
    });
  });
});

describe('the reading position as view state', () => {
  it('a view round-trips through its guard', () => {
    expect(isHistoryView(NO_HISTORY_VIEW)).toBe(true);
    expect(
      isHistoryView({
        filters: filters({ dates: { kind: 'range', from: '2026-08-01', to: null } }),
        landing: L2,
        scroll: 240,
        record: null,
      }),
    ).toBe(true);
  });

  it('an anchored reading round-trips through its guard', () => {
    expect(
      isHistoryView({
        ...NO_HISTORY_VIEW,
        landing: L2,
        record: { kind: 'answer', questionId: 'SOV-2.q1', target: { kind: 'assessment' } },
      }),
    ).toBe(true);
    expect(
      isHistoryView({ ...NO_HISTORY_VIEW, record: { kind: 'answer', questionId: 'SOV-2.q1' } }),
    ).toBe(false);
    expect(NO_HISTORY_VIEW.record).toBeNull();
    expect(isHistoryView(NO_HISTORY_VIEW)).toBe(true);
  });

  it('the guard rejects a foreign or stale shape', () => {
    expect(isHistoryView(null)).toBe(false);
    expect(isHistoryView('x')).toBe(false);
    expect(isHistoryView({})).toBe(false);
    expect(isHistoryView({ mode: 'workbench' })).toBe(false);
    expect(isHistoryView({ stage: 'assessment', view: 'fill' })).toBe(false);
    expect(isHistoryView({ ...NO_HISTORY_VIEW, landing: '2222222' })).toBe(false);
    expect(isHistoryView({ ...NO_HISTORY_VIEW, scroll: -1 })).toBe(false);
    expect(isHistoryView({ ...NO_HISTORY_VIEW, filters: { ...NO_HISTORY_FILTERS, dates: { kind: 'span' } } })).toBe(false);
    expect(
      isHistoryView({
        ...NO_HISTORY_VIEW,
        filters: { ...NO_HISTORY_FILTERS, dates: { kind: 'range', from: '10/08/2026', to: null } },
      }),
    ).toBe(false);
  });

  it('two readings of the same position are equal', () => {
    expect(sameHistoryView(NO_HISTORY_VIEW, { ...NO_HISTORY_VIEW })).toBe(true);
    expect(sameHistoryView(null, null)).toBe(true);
    expect(sameHistoryView(null, NO_HISTORY_VIEW)).toBe(false);
    const differing: HistoryView[] = [
      { ...NO_HISTORY_VIEW, filters: filters({ search: 'a' }) },
      { ...NO_HISTORY_VIEW, filters: filters({ participant: 'Alex' }) },
      { ...NO_HISTORY_VIEW, filters: filters({ outcome: 'new' }) },
      { ...NO_HISTORY_VIEW, filters: filters({ dates: { kind: 'range', from: null, to: null } }) },
      { ...NO_HISTORY_VIEW, landing: L2 },
      { ...NO_HISTORY_VIEW, scroll: 12 },
      { ...NO_HISTORY_VIEW, record: { kind: 'party', party: 'acme' } },
    ];
    for (const view of differing) expect(sameHistoryView(NO_HISTORY_VIEW, view)).toBe(false);
    expect(
      sameHistoryView(
        { ...NO_HISTORY_VIEW, filters: filters({ dates: { kind: 'range', from: null, to: null } }) },
        {
          ...NO_HISTORY_VIEW,
          filters: filters({ dates: { kind: 'range', from: '2026-08-10', to: null } }),
        },
      ),
    ).toBe(false);
  });

  it('two readings differ when the anchored record differs', () => {
    expect(
      sameHistoryView(
        {
          ...NO_HISTORY_VIEW,
          record: { kind: 'answer', questionId: 'SOV-2.q1', target: { kind: 'assessment' } },
        },
        {
          ...NO_HISTORY_VIEW,
          record: { kind: 'answer', questionId: 'SOV-2.q1', target: { kind: 'assessment' } },
        },
      ),
    ).toBe(true);
    expect(
      sameHistoryView(
        { ...NO_HISTORY_VIEW, record: { kind: 'party', party: 'a' } },
        { ...NO_HISTORY_VIEW, record: { kind: 'party', party: 'b' } },
      ),
    ).toBe(false);
  });
});
