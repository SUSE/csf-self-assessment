import { describe, expect, it } from 'vitest';
import { addRecommendation, starterWorkbook } from '../../author';
import { activeAuthorMode, authorModeGates } from './author-modes';

describe('authorModeGates', () => {
  it('blocks every destination but the workbench while the draft has issues', () => {
    const gates = authorModeGates(null, 3);
    expect(gates.workbench).toEqual({ kind: 'open', label: 'Edit the instrument' });
    expect(gates.preview).toEqual({ kind: 'blocked', reason: 'Fix 3 issues to preview' });
    expect(gates.dashboard).toEqual({
      kind: 'blocked',
      reason: 'Fix 3 issues to read a test estate',
    });
    expect(gates.recommendations).toEqual({
      kind: 'blocked',
      reason: 'Fix 3 issues to read the offers',
    });
    expect(gates.report).toEqual({ kind: 'blocked', reason: 'Fix 3 issues to print a Report' });
  });

  it('says "issue" for a single issue', () => {
    const gates = authorModeGates(null, 1);
    expect(gates.preview).toEqual({ kind: 'blocked', reason: 'Fix 1 issue to preview' });
  });

  it('opens preview, dashboard and report for a valid workbook with estates', () => {
    const gates = authorModeGates(starterWorkbook(), 0);
    expect(gates.preview).toEqual({ kind: 'open', label: 'Preview as a participant' });
    expect(gates.dashboard).toEqual({ kind: 'open', label: 'Read a test estate on the dashboard' });
    expect(gates.report).toEqual({ kind: 'open', label: 'Read the Report this estate prints' });
    expect(gates.recommendations).toEqual({
      kind: 'blocked',
      reason: 'This workbook recommends nothing yet',
    });
  });

  it('blocks the estate readers when there is no test estate', () => {
    const gates = authorModeGates({ ...starterWorkbook(), testEstates: [] }, 0);
    expect(gates.dashboard).toEqual({ kind: 'blocked', reason: 'Add a test estate to read one' });
    expect(gates.report).toEqual({ kind: 'blocked', reason: 'Add a test estate to print one' });
    expect(gates.recommendations).toEqual({
      kind: 'blocked',
      reason: 'This workbook recommends nothing yet',
    });
  });

  it('names the missing estate once the workbook has an offer', () => {
    const gates = authorModeGates(
      { ...addRecommendation(starterWorkbook()), testEstates: [] },
      0,
    );
    expect(gates.recommendations).toEqual({
      kind: 'blocked',
      reason: 'Add a test estate to read the offers against',
    });
  });

  it('opens the recommendations page with an offer and an estate', () => {
    const gates = authorModeGates(addRecommendation(starterWorkbook()), 0);
    expect(gates.recommendations).toEqual({
      kind: 'open',
      label: 'Read the vendor page this estate produces',
    });
  });
});

describe('activeAuthorMode', () => {
  it('degrades a blocked destination to the workbench', () => {
    expect(activeAuthorMode('report', authorModeGates(null, 3))).toBe('workbench');
    expect(activeAuthorMode('recommendations', authorModeGates(starterWorkbook(), 0))).toBe(
      'workbench',
    );
  });

  it('keeps an open destination', () => {
    expect(activeAuthorMode('report', authorModeGates(starterWorkbook(), 0))).toBe('report');
    expect(activeAuthorMode('workbench', authorModeGates(null, 3))).toBe('workbench');
  });
});
