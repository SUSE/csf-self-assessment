import { describe, expect, it } from 'vitest';
import type { ChipKind } from '../wheel';
import { READING_IDS } from '../instrument-wheel/readings';
import {
  InspectSelectionSchema,
  inspectorTitle,
  isInspectSelection,
  sameSelection,
  type InspectSelection,
} from './subject';

// The wheel owns the chip vocabulary and the schema restates it; typing this list as
// InstrumentChipKind fails to compile if the two ever drift.
const CHIP_KINDS: ChipKind[] = ['assessment', 'dimension', 'party'];

describe('a selection as view state', () => {
  it('parses to the hand-written union', () => {
    // The schema is mirrored by the InspectSelection type (a written-out discriminated
    // union reads better than an inferred one), so pin the two together.
    const parsed: InspectSelection = InspectSelectionSchema.parse({
      kind: 'question',
      questionId: 'SOV-2.q1',
      target: null,
    });
    expect(parsed).toEqual({ kind: 'question', questionId: 'SOV-2.q1', target: null });
  });

  it('round-trips through its guard', () => {
    expect(isInspectSelection({ kind: 'question', questionId: 'SOV-2.q1', target: null })).toBe(
      true,
    );
    expect(isInspectSelection({ kind: 'objective', objectiveId: 'SOV-2' })).toBe(true);
    expect(isInspectSelection({ kind: 'estate-spoke', key: 'dimension:compute' })).toBe(true);
    expect(
      isInspectSelection({
        kind: 'question',
        questionId: 'SOV-2.q1',
        target: { kind: 'party', party: 'acme' },
      }),
    ).toBe(true);
    for (const chipKind of CHIP_KINDS) {
      expect(isInspectSelection({ kind: 'instrument-chip', chipKind, key: 'compute' })).toBe(true);
    }
    for (const readingId of READING_IDS) {
      expect(isInspectSelection({ kind: 'instrument-reading', readingId })).toBe(true);
    }
    expect(isInspectSelection({ kind: 'instrument-reading', readingId: 'budget' })).toBe(false);
    // The fieldless ones: the discriminator is the whole selection.
    expect(isInspectSelection({ kind: 'seal-ladder' })).toBe(true);
    expect(isInspectSelection({ kind: 'dont-know' })).toBe(true);
    expect(isInspectSelection({ kind: 'evidence', objectiveId: null })).toBe(true);
    expect(isInspectSelection({ kind: 'evidence', objectiveId: 'SOV-2' })).toBe(true);
    expect(isInspectSelection({ kind: 'evidence' })).toBe(false);
    expect(isInspectSelection({ kind: 'open-units', group: 'party:acme' })).toBe(true);
    expect(isInspectSelection({ kind: 'open-units', group: null })).toBe(true);
    expect(isInspectSelection({ kind: 'open-units' })).toBe(false);
    expect(isInspectSelection({ kind: 'open-units', group: '' })).toBe(false);
    expect(isInspectSelection({ kind: 'heat-mark', axis: 'party', mark: 'cell:SOV-1:acme' })).toBe(
      true,
    );
    expect(isInspectSelection({ kind: 'heat-mark', axis: 'role', mark: 'carry:SOV-1' })).toBe(true);
    expect(isInspectSelection({ kind: 'heat-mark', axis: 'objective', mark: 'x' })).toBe(false);
    expect(isInspectSelection({ kind: 'heat-mark', axis: 'party', mark: '' })).toBe(false);
    expect(isInspectSelection({ kind: 'recommendation', recommendationId: 'rec-1' })).toBe(true);
    expect(isInspectSelection({ kind: 'recommendation', recommendationId: '' })).toBe(false);
    expect(isInspectSelection({ kind: 'staircase-rung', floor: 0 })).toBe(true);
    expect(isInspectSelection({ kind: 'staircase-rung', floor: 4 })).toBe(true);
    // A rung is a SEAL level, so anything off the ladder is not one.
    expect(isInspectSelection({ kind: 'staircase-rung', floor: 5 })).toBe(false);
    expect(isInspectSelection({ kind: 'staircase-rung', floor: '0' })).toBe(false);
    expect(isInspectSelection({ kind: 'staircase-rung' })).toBe(false);
    expect(isInspectSelection({ kind: 'consistency-check', checkId: 'hidden-layer' })).toBe(true);
    // The five checks are enumerated in code, so a sixth id is not one of them.
    expect(isInspectSelection({ kind: 'consistency-check', checkId: 'sixth-check' })).toBe(false);
    expect(isInspectSelection({ kind: 'consistency-check' })).toBe(false);
    expect(isInspectSelection({ kind: 'contributor', name: 'Jane' })).toBe(true);
    // The ledger's own identity string, so an empty one names nobody.
    expect(isInspectSelection({ kind: 'contributor', name: '' })).toBe(false);
    expect(isInspectSelection({ kind: 'contributor' })).toBe(false);
    expect(isInspectSelection({ kind: 'provenance-fact', fact: 'swept' })).toBe(true);
    expect(isInspectSelection({ kind: 'provenance-fact', fact: 'disputed' })).toBe(true);
    // Credibility draws exactly two ratios, so a third fact is not one of them.
    expect(isInspectSelection({ kind: 'provenance-fact', fact: 'evidence' })).toBe(false);
    expect(isInspectSelection({ kind: 'provenance-fact' })).toBe(false);
  });

  it('rejects a foreign or stale shape', () => {
    // history.state is shared with the sibling app under one key, so a whole view
    // of the other shape can land here.
    expect(isInspectSelection({ stage: 'facilitator' })).toBe(false);
    expect(isInspectSelection({ mode: 'workbench', focus: { kind: 'overview' } })).toBe(false);
    // The pre-contract shape: a bare question unit with no discriminator.
    expect(isInspectSelection({ questionId: 'SOV-2.q1', target: null })).toBe(false);
    expect(isInspectSelection({ kind: 'question', questionId: '', target: null })).toBe(false);
    expect(isInspectSelection({ kind: 'question', questionId: 'q' })).toBe(false);
    expect(isInspectSelection({ kind: 'objective', objectiveId: '' })).toBe(false);
    expect(isInspectSelection({ kind: 'objective' })).toBe(false);
    expect(isInspectSelection({ kind: 'estate-spoke', key: '' })).toBe(false);
    expect(isInspectSelection({ kind: 'estate-spoke' })).toBe(false);
    expect(isInspectSelection({ kind: 'question', questionId: 'q', target: { kind: 'party' } })).toBe(
      false,
    );
    expect(isInspectSelection({ kind: 'instrument-chip', chipKind: 'sov', key: 'x' })).toBe(false);
    expect(isInspectSelection({ kind: 'instrument-chip', chipKind: 'dimension', key: '' })).toBe(
      false,
    );
    expect(isInspectSelection(null)).toBe(false);
    expect(isInspectSelection('x')).toBe(false);
  });
});

describe('sameSelection', () => {
  it('compares targets by their canonical key, not by identity', () => {
    const a: InspectSelection = {
      kind: 'question',
      questionId: 'q1',
      target: { kind: 'party', party: 'acme' },
    };
    const b: InspectSelection = {
      kind: 'question',
      questionId: 'q1',
      target: { kind: 'party', party: 'acme' },
    };
    expect(sameSelection(a, b)).toBe(true);
    expect(sameSelection(a, { ...a, target: { kind: 'party', party: 'other' } })).toBe(false);
    // The whole question and one of its units are different selections.
    expect(sameSelection(a, { kind: 'question', questionId: 'q1', target: null })).toBe(false);
    expect(sameSelection(a, { ...a, questionId: 'q2' })).toBe(false);
  });

  it('never confuses two kinds, and treats null as its own state', () => {
    const reading: InspectSelection = { kind: 'instrument-reading', readingId: 'roles' };
    expect(sameSelection(reading, { kind: 'instrument-reading', readingId: 'roles' })).toBe(true);
    expect(sameSelection(reading, { kind: 'instrument-reading', readingId: 'strata' })).toBe(false);
    const chip: InspectSelection = { kind: 'instrument-chip', chipKind: 'dimension', key: 'q1' };
    expect(sameSelection(chip, { kind: 'question', questionId: 'q1', target: null })).toBe(false);
    expect(sameSelection(chip, { ...chip })).toBe(true);
    expect(sameSelection(chip, { ...chip, chipKind: 'party' })).toBe(false);
    expect(sameSelection(null, null)).toBe(true);
    expect(sameSelection(chip, null)).toBe(false);
    expect(sameSelection(null, chip)).toBe(false);
  });

  it('compares objectives by id and keeps them separate from questions', () => {
    const objective: InspectSelection = { kind: 'objective', objectiveId: 'SOV-2' };
    expect(sameSelection(objective, { kind: 'objective', objectiveId: 'SOV-2' })).toBe(true);
    expect(sameSelection(objective, { kind: 'objective', objectiveId: 'SOV-3' })).toBe(false);
    expect(sameSelection(objective, { kind: 'question', questionId: 'SOV-2', target: null })).toBe(
      false,
    );
  });

  it('compares Estate spokes by key', () => {
    const spoke: InspectSelection = { kind: 'estate-spoke', key: 'dimension:compute' };
    expect(sameSelection(spoke, { ...spoke })).toBe(true);
    expect(sameSelection(spoke, { kind: 'estate-spoke', key: 'dimension:storage' })).toBe(false);
    expect(sameSelection(spoke, { kind: 'instrument-chip', chipKind: 'dimension', key: 'compute' })).toBe(
      false,
    );
  });

  it('treats each fieldless kind as one selection, never as each other', () => {
    const ladder: InspectSelection = { kind: 'seal-ladder' };
    const admitted: InspectSelection = { kind: 'dont-know' };
    const undefended: InspectSelection = { kind: 'evidence', objectiveId: null };
    expect(sameSelection(ladder, { kind: 'seal-ladder' })).toBe(true);
    expect(sameSelection(admitted, { kind: 'dont-know' })).toBe(true);
    expect(sameSelection(ladder, admitted)).toBe(false);
    expect(sameSelection(admitted, undefended)).toBe(false);
    expect(sameSelection(ladder, { kind: 'question', questionId: 'q1', target: null })).toBe(false);
    expect(sameSelection(ladder, null)).toBe(false);
    expect(sameSelection(admitted, null)).toBe(false);
  });

  it('separates the whole undefended set from one objective’s share of it', () => {
    const all: InspectSelection = { kind: 'evidence', objectiveId: null };
    const one: InspectSelection = { kind: 'evidence', objectiveId: 'SOV-2' };
    expect(sameSelection(all, { kind: 'evidence', objectiveId: null })).toBe(true);
    expect(sameSelection(one, { kind: 'evidence', objectiveId: 'SOV-2' })).toBe(true);
    expect(sameSelection(all, one)).toBe(false);
    expect(sameSelection(one, { kind: 'evidence', objectiveId: 'SOV-3' })).toBe(false);
  });

  it('separates the same mark key on two different grids', () => {
    const mark: InspectSelection = { kind: 'heat-mark', axis: 'party', mark: 'cell:SOV-1:acme' };
    expect(sameSelection(mark, { ...mark })).toBe(true);
    expect(sameSelection(mark, { ...mark, axis: 'role' })).toBe(false);
    expect(sameSelection(mark, { ...mark, mark: 'carry:SOV-1' })).toBe(false);
  });

  it('separates one rung of the climb from another', () => {
    const rung: InspectSelection = { kind: 'staircase-rung', floor: 0 };
    expect(sameSelection(rung, { kind: 'staircase-rung', floor: 0 })).toBe(true);
    expect(sameSelection(rung, { kind: 'staircase-rung', floor: 1 })).toBe(false);
    expect(sameSelection(rung, { kind: 'heat-mark', axis: 'role', mark: 'carry:SOV-1' })).toBe(false);
  });

  it('compares offers by their recommendation id', () => {
    const offer: InspectSelection = { kind: 'recommendation', recommendationId: 'rec-1' };
    expect(sameSelection(offer, { ...offer })).toBe(true);
    expect(sameSelection(offer, { ...offer, recommendationId: 'rec-2' })).toBe(false);
    expect(sameSelection(offer, { kind: 'objective', objectiveId: 'rec-1' })).toBe(false);
  });

  it('separates one consistency check from another', () => {
    const check: InspectSelection = { kind: 'consistency-check', checkId: 'concentration' };
    expect(sameSelection(check, { ...check })).toBe(true);
    expect(sameSelection(check, { ...check, checkId: 'hidden-layer' })).toBe(false);
  });

  it('separates one contributor from another', () => {
    const jane: InspectSelection = { kind: 'contributor', name: 'Jane' };
    expect(sameSelection(jane, { ...jane })).toBe(true);
    expect(sameSelection(jane, { kind: 'contributor', name: 'Alex' })).toBe(false);
    // `facilitator` is an identity in the ledger like any other, never a special case.
    expect(sameSelection(jane, { kind: 'contributor', name: 'facilitator' })).toBe(false);
  });

  it('separates Credibility’s two ratios from each other', () => {
    const swept: InspectSelection = { kind: 'provenance-fact', fact: 'swept' };
    expect(sameSelection(swept, { ...swept })).toBe(true);
    expect(sameSelection(swept, { kind: 'provenance-fact', fact: 'disputed' })).toBe(false);
    // Both live on Credibility; a contributor slice is not a ratio row.
    expect(sameSelection(swept, { kind: 'contributor', name: 'swept' })).toBe(false);
  });

  it('separates one owner of the backlog from another, and from the whole chase', () => {
    const owner: InspectSelection = { kind: 'open-units', group: 'party:acme' };
    expect(sameSelection(owner, { kind: 'open-units', group: 'party:acme' })).toBe(true);
    expect(sameSelection(owner, { kind: 'open-units', group: 'party:other' })).toBe(false);
    expect(sameSelection(owner, { kind: 'open-units', group: null })).toBe(false);
    expect(sameSelection({ kind: 'open-units', group: null }, { kind: 'open-units', group: null })).toBe(
      true,
    );
  });
});

describe('inspectorTitle', () => {
  it('titles a selection as the Inspector and an ambient subject in the screen’s words', () => {
    expect(inspectorTitle({ kind: 'instrument-chip', chipKind: 'dimension', key: 'compute' })).toBe(
      'Inspector',
    );
    expect(inspectorTitle({ kind: 'question', questionId: 'q1', target: null })).toBe('Inspector');
    expect(inspectorTitle({ kind: 'objective', objectiveId: 'SOV-2' })).toBe('Inspector');
    expect(inspectorTitle({ kind: 'seal-ladder' })).toBe('Inspector');
    expect(inspectorTitle({ kind: 'estate-reading', title: 'Live floor' })).toBe('Live floor');
    expect(inspectorTitle({ kind: 'hint', title: 'Merge', text: 'Add one partial…' })).toBe('Merge');
    expect(inspectorTitle(null)).toBe('Inspector');
  });
});
