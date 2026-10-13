import { describe, expect, it } from 'vitest';
import { exportIssuesWarning } from './export-warning';

describe('exportIssuesWarning', () => {
  it('returns null when there are no issues', () => {
    expect(exportIssuesWarning(0)).toBeNull();
    expect(exportIssuesWarning(-1)).toBeNull();
  });

  it('formats warning for a single issue', () => {
    const warning = exportIssuesWarning(1);
    expect(warning).not.toBeNull();
    expect(warning?.title).toBe('Export workbook with issues?');
    expect(warning?.description).toBe(
      'This workbook has 1 validation issue. Other applications and participants cannot load a workbook that has issues. You can still export this draft to save your progress and continue editing later.',
    );
    expect(warning?.action).toBe('Export anyway');
  });

  it('formats warning for multiple issues', () => {
    const warning = exportIssuesWarning(4);
    expect(warning).not.toBeNull();
    expect(warning?.title).toBe('Export workbook with issues?');
    expect(warning?.description).toBe(
      'This workbook has 4 validation issues. Other applications and participants cannot load a workbook that has issues. You can still export this draft to save your progress and continue editing later.',
    );
    expect(warning?.action).toBe('Export anyway');
  });
});
