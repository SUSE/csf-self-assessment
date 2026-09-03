import { describe, expect, it } from 'vitest';
import { AssessmentSchema } from '../schema';
import { finalizeLanded } from './land';
import {
  effectOf,
  landingSummary,
  ledgerSummary,
  ledgerUnits,
  questionBlame,
  recordSentence,
  unitHistory,
} from './ledger';
import { WA, landAlex, landJane } from './estate-fixture';

describe('landing the Alex/Jane pair', () => {
  it('landing Alex writes one Landing and seeds the roster', () => {
    const alex = landAlex();
    expect(alex.ledger).toHaveLength(1);
    expect(alex.ledger[0].participant).toBe('Alex');
    expect(alex.ledger[0].records.filter((r) => r.kind === 'answer')).toHaveLength(81);
    expect(alex.base.answers).toHaveLength(81);
    expect(alex.base.parties.map((p) => p.id)).toEqual(['inst', 'acme-cloud', 'modelhouse', 'siliconware']);
  });

  it('landing both gives two Landings over 94 units', () => {
    const jane = landJane();
    expect(jane.ledger).toHaveLength(2);
    expect(jane.ledger[1].participant).toBe('Jane');
    expect(jane.ledger[1].note).toBe('after the security discussion');
    expect(
      jane.ledger[1].records
        .filter((r) => r.kind === 'party')
        .map((r) => (r.kind === 'party' ? r.decision.kind : null)),
    ).toEqual(['add', 'add']);
    expect(jane.ledger[1].records.filter((r) => r.kind === 'answer')).toHaveLength(62);
    expect(ledgerUnits(jane.ledger)).toHaveLength(94);
    expect(jane.base.answers).toHaveLength(93);
    expect(jane.base.parties.map((p) => p.id)).toEqual([
      'inst',
      'acme-cloud',
      'modelhouse',
      'siliconware',
      'acme-eu',
      'northstar-edge',
    ]);
    expect(jane.base.parties.find((p) => p.id === 'modelhouse')?.serves).toEqual(['aiml']);
  });

  it('the ledger reads Alex then Jane', () => {
    expect(landJane().ledger.map((l) => l.participant)).toEqual(['Alex', 'Jane']);
  });

  it('the effect partition of Jane’s Landing', () => {
    const jane = landJane();
    expect(landingSummary(jane.ledger[1])).toEqual({
      unitsReviewed: 62,
      newUnits: 13,
      changed: 29,
      cleared: 1,
      unchanged: 19,
      agreements: 19,
      resolvedClashes: 34,
      partyDecisions: 2,
    });
  });

  it('the roll-up unit tells the whole story', () => {
    const jane = landJane();
    const history = unitHistory(jane.ledger, 'SOV-4.withdrawal-survival', {
      kind: 'dimension',
      dimension: 'storage',
    });
    expect(history).toHaveLength(2);
    expect(history.map((e) => recordSentence(e.record, WA.workbook))).toEqual([
      'only Alex answered — “EU-controlled operation; replacement or repair still needs named non-EU technology.” (SEAL 2)',
      'Alex said “EU-controlled operation; replacement or repair still needs named non-EU technology.” (SEAL 2) → kept the strata — nothing stands here',
    ]);
    expect(history.map((e) => e.landing.participant)).toEqual(['Alex', 'Jane']);
    expect(effectOf(history[0].record)).toBe('new');
    expect(history[0].record.before).toBeNull();
    expect(effectOf(history[1].record)).toBe('cleared');
    expect(history[1].record.after).toBeNull();
    expect(history[1].record.before?.state === 'answered' ? history[1].record.before.rungId : null).toBe('choice-3');
  });

  it('the ledger at a glance', () => {
    expect(ledgerSummary(landJane().ledger)).toEqual({
      landings: 2,
      records: 148,
      units: 94,
      disputed: 34,
    });
  });

  it('finalizeLanded parses and carries both Landings', () => {
    const jane = landJane();
    const finalized = finalizeLanded(WA, jane.base, jane.ledger);
    expect(AssessmentSchema.safeParse(finalized).success).toBe(true);
    expect(finalized.ledger).toHaveLength(2);
    expect(finalized.ledger.reduce((n, l) => n + l.records.length, 0)).toBe(148);
  });
});

describe('the question rail explains the floor', () => {
  const blameOf = () => questionBlame(landJane().ledger, 'SOV-4.withdrawal-survival', WA.workbook, WA.parties);

  it('every unit the question ever touched is on the rail', () => {
    const blame = blameOf();
    expect(blame).toHaveLength(13);
    expect(blame.map((u) => u.label)).toEqual([
      'Compute · service',
      'Compute · software',
      'Compute · hardware',
      'Compute · chips',
      'Storage',
      'Network',
      'IAM',
      'Platform (Containers, PaaS)',
      'Security',
      'Storage · service',
      'Storage · software',
      'Storage · hardware',
      'Storage · chips',
    ]);
    expect(blame.reduce((n, u) => n + u.entries.length, 0)).toBe(20);
  });

  it('the emptied roll-up and the stratum that floors the estate both read back', () => {
    const blame = blameOf();
    const rollUp = blame.find((u) => u.label === 'Storage');
    expect(rollUp?.entries).toHaveLength(2);
    expect(rollUp?.entries.map((e) => e.sentence)).toEqual([
      'only Alex answered — “EU-controlled operation; replacement or repair still needs named non-EU technology.” (SEAL 2)',
      'Alex said “EU-controlled operation; replacement or repair still needs named non-EU technology.” (SEAL 2) → kept the strata — nothing stands here',
    ]);
    expect(rollUp?.entries.map((e) => e.sources)).toEqual([['Alex · blanket claim'], ['Alex · blanket claim']]);

    const chips = blame.find((u) => u.label === 'Storage · chips');
    expect(chips?.entries).toHaveLength(1);
    expect(chips?.entries[0].sentence).toBe('Jane said “Under exclusive non-EU control; a withdrawal stops this outright, no EU actor can step in.” (SEAL 0) → kept the strata — “Under exclusive non-EU control; a withdrawal stops this outright, no EU actor can step in.” (SEAL 0)');
    expect(chips?.entries[0].sources).toEqual([
      'Jane · claim naming Compute, Storage, Network, Edge (DDoS, CDN, DNS)',
    ]);
  });
});
