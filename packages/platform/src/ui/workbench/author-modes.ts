import type { Workbook } from '../../schema';
import type { AuthorMode } from './screen';

// Whether a destination can be entered, and the one line the toolbar shows for
// it either way — that line is the tooltip AND the accessible name, so a
// blocked destination carries its reason there and the two cannot drift.
export type ModeGate =
  | { kind: 'open'; label: string }
  | { kind: 'blocked'; reason: string };

function fixIssues(issueCount: number, toDoWhat: string): ModeGate {
  const issues = issueCount === 1 ? '1 issue' : `${issueCount} issues`;
  return { kind: 'blocked', reason: `Fix ${issues} ${toDoWhat}` };
}

// The ONE rule gating the Author's five destinations. `valid` is the
// strict-parsed draft (null while it has issues) and `issueCount` how many
// issues that is. The workbench is always open.
export function authorModeGates(
  valid: Workbook | null,
  issueCount: number,
): Record<AuthorMode, ModeGate> {
  return {
    workbench: { kind: 'open', label: 'Edit the instrument' },
    preview:
      valid === null
        ? fixIssues(issueCount, 'to preview')
        : { kind: 'open', label: 'Preview as a participant' },
    dashboard:
      valid === null
        ? fixIssues(issueCount, 'to read a test estate')
        : valid.testEstates.length === 0
          ? { kind: 'blocked', reason: 'Add a test estate to read one' }
          : { kind: 'open', label: 'Read a test estate on the dashboard' },
    recommendations:
      valid === null
        ? fixIssues(issueCount, 'to read the offers')
        : valid.recommendations.length === 0
          ? { kind: 'blocked', reason: 'This workbook recommends nothing yet' }
          : valid.testEstates.length === 0
            ? { kind: 'blocked', reason: 'Add a test estate to read the offers against' }
            : { kind: 'open', label: 'Read the vendor page this estate produces' },
    report:
      valid === null
        ? fixIssues(issueCount, 'to print a Report')
        : valid.testEstates.length === 0
          ? { kind: 'blocked', reason: 'Add a test estate to print one' }
          : { kind: 'open', label: 'Read the Report this estate prints' },
  };
}

// The destination actually shown: the requested one when its gate is open, the
// workbench otherwise. Replaces the shell's `QA_MODES` / `activeMode` derive,
// so the degrade rule and the disabled reason are one fact.
export function activeAuthorMode(
  requested: AuthorMode,
  gates: Record<AuthorMode, ModeGate>,
): AuthorMode {
  return gates[requested].kind === 'open' ? requested : 'workbench';
}
