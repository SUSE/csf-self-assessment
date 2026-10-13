// Copy and gating for exporting a workbook from the Author application.
// Valid workbooks export immediately without a warning. Workbooks with
// strict validation issues warn the author before exporting.

export type ExportIssuesWarning = {
  title: string;
  description: string;
  action: string;
};

export function exportIssuesWarning(issueCount: number): ExportIssuesWarning | null {
  if (issueCount <= 0) return null;
  const issues = issueCount === 1 ? '1 validation issue' : `${issueCount} validation issues`;
  return {
    title: 'Export workbook with issues?',
    description: `This workbook has ${issues}. Other applications and participants cannot load a workbook that has issues. You can still export this draft to save your progress and continue editing later.`,
    action: 'Export anyway',
  };
}
