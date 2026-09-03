import { describe, expect, it } from 'vitest';
import type { Workbook } from '../schema';
import { addParty, removeParty, setAssessedParty, updateParty } from './edit-parties';
import { starterWorkbook } from './starter';

const assessedIds = (wb: Workbook) => wb.parties.filter((p) => p.kind === 'assessed').map((p) => p.id);
const estatePartyTypes = (wb: Workbook) => wb.testEstates.flatMap((e) => e.parties.map((p) => p.type));

describe('party-type edits', () => {
  it('addParty appends a blank third-party type with an auto id', () => {
    const wb = addParty(starterWorkbook());
    expect(wb.parties.at(-1)).toEqual({ id: 'party-1', name: 'New party type', kind: 'third-party' });
    expect(assessedIds(wb)).toHaveLength(1);
  });

  it('updateParty patches name and drops an emptied description', () => {
    const named = updateParty(starterWorkbook(), 'supplier', { name: 'Hardware supplier' });
    expect(named.parties.find((p) => p.id === 'supplier')?.name).toBe('Hardware supplier');
    const supplier = updateParty(starterWorkbook(), 'supplier', { description: '' }).parties.find(
      (p) => p.id === 'supplier',
    );
    expect(supplier && 'description' in supplier).toBe(false);
  });

  it('updateParty does not accept a kind in its patch (type guard)', () => {
    // @ts-expect-error kind is intentionally absent from updateParty's patch type
    updateParty(starterWorkbook(), 'supplier', { kind: 'assessed' });
  });

  it('never mutate their input', () => {
    const fixture = starterWorkbook();
    const clone = structuredClone(fixture);
    addParty(fixture);
    updateParty(fixture, 'supplier', { name: 'x', description: '' });
    updateParty(fixture, 'primary-provider', { id: 'contractor' });
    setAssessedParty(fixture, 'supplier');
    removeParty(fixture, 'supplier');
    expect(fixture).toEqual(clone);
  });
});

describe('exactly one assessed party type', () => {
  it('setAssessedParty moves the flag, demoting the old holder', () => {
    const wb = setAssessedParty(starterWorkbook(), 'supplier');
    expect(wb.parties.find((p) => p.id === 'supplier')?.kind).toBe('assessed');
    expect(wb.parties.find((p) => p.id === 'institution')?.kind).toBe('third-party');
    expect(assessedIds(wb)).toEqual(['supplier']);
  });

  it('setAssessedParty is idempotent for the current assessed type', () => {
    expect(setAssessedParty(starterWorkbook(), 'institution').parties).toEqual(starterWorkbook().parties);
  });

  it('setAssessedParty is a no-op for an unknown id', () => {
    expect(assessedIds(setAssessedParty(starterWorkbook(), 'ghost'))).toEqual(['institution']);
  });

  it('removeParty is a no-op for the sole assessed type', () => {
    const start = starterWorkbook();
    expect(removeParty(start, 'institution')).toEqual(start);
  });

  it('the S2 party-authoring flow: add → rename → make-assessed → delete-blocked → hand-back → delete', () => {
    let wb = addParty(starterWorkbook());
    wb = updateParty(wb, 'party-1', { id: 'scp', name: 'Sovereign-cloud partner' });
    expect(wb.parties.find((p) => p.id === 'scp')?.kind).toBe('third-party');
    wb = setAssessedParty(wb, 'scp');
    expect(assessedIds(wb)).toEqual(['scp']);
    expect(removeParty(wb, 'scp')).toEqual(wb);
    wb = setAssessedParty(wb, 'institution');
    expect(removeParty(wb, 'scp').parties.map((p) => p.id)).not.toContain('scp');
  });
});

describe('party-type edits cascade into the test estates (R17)', () => {
  it('removeParty drops the estate parties of the removed type, leaving every type resolved', () => {
    const start = starterWorkbook();
    expect(estatePartyTypes(start)).toContain('primary-provider');
    const wb = removeParty(start, 'primary-provider');
    expect(wb.parties.map((p) => p.id)).not.toContain('primary-provider');
    expect(estatePartyTypes(wb)).not.toContain('primary-provider');
    const declared = new Set(wb.parties.map((p) => p.id));
    expect(estatePartyTypes(wb).every((type) => declared.has(type))).toBe(true);
  });

  it('an id rename rewrites the estate parties’ types', () => {
    const wb = updateParty(starterWorkbook(), 'primary-provider', { id: 'contractor' });
    expect(wb.parties.map((p) => p.id)).toContain('contractor');
    expect(wb.parties.map((p) => p.id)).not.toContain('primary-provider');
    expect(estatePartyTypes(wb)).toContain('contractor');
    expect(estatePartyTypes(wb)).not.toContain('primary-provider');
    const declared = new Set(wb.parties.map((p) => p.id));
    expect(estatePartyTypes(wb).every((type) => declared.has(type))).toBe(true);
  });

  it('removeParty deletes an unreferenced third-party type', () => {
    expect(removeParty(starterWorkbook(), 'supplier').parties.map((p) => p.id)).not.toContain('supplier');
  });
});
