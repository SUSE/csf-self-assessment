import type { Party, Seal, Workbook } from '../schema';
import type { EngineResult, StaircaseBinding } from '../score-engine';
import { targetLabel } from '../utils/target-label';
import { bindingTarget } from './staircase';

export type EvidenceRow = {
  // `<questionId>|<dimension>|<stratum>|<party>` — the staircase row key idiom.
  key: string;
  questionId: string;
  questionText: string;
  // `<target label> · SEAL-<n> · <role name>`.
  meta: string;
  // The parts of `meta`, for a rail that states each at its own level.
  label: string;
  roleName: string;
  seal: Seal;
};

// One objective's share of the evidence debt, heaviest first. Counted in distinct
// QUESTIONS, not gating answers, so the badge is the same number the rail's group
// heading shows when the reader presses through.
export type EvidenceObjective = {
  // The authored id worn as the badge — `SOV-2`.
  objectiveId: string;
  objectiveName: string;
  questions: number;
};

export type EvidenceTile =
  | {
    kind: 'covered';
    evidenced: number;
    total: number;
    // `9 of 71 gating answers carry evidence.`
    headline: string;
    // 0..1 — 0 renders no bar at all (absence is not a zero).
    barFraction: number;
    // The floor, carried for paint only (twin of `RibbonModel.floor`): coverage
    // wears the gate it was taken against.
    floor: Seal | null;
    // Where the debt sits, at tile size: one badge per objective that owes a
    // document, heaviest first. Objectives that owe nothing are absent, not zero.
    undefendedByObjective: EvidenceObjective[];
    // `26 questions` — the badge total, stated in the unit the badges count.
    undefendedLabel: string;
    // Every gating answer with no evidence note, strongest claim first (decision 4).
    undefended: EvidenceRow[];
    caption: string;
  }
  | { kind: 'empty'; reason: string };

const CAPTION =
  'Evidence is what a reviewer asks for. Only gating answers — the ones that set the floor — are counted here.';

export function evidenceTile(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): EvidenceTile {
  const { evidenced, total } = result.credibility.evidenceCoverage;
  if (total === 0) {
    return {
      kind: 'empty',
      reason: 'No gating answer yet — evidence coverage appears once an answer sets the floor.',
    };
  }

  const questions = new Map(
    workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]),
  );
  const rowView = (binding: StaircaseBinding): EvidenceRow => {
    const label = targetLabel(workbook, parties, bindingTarget(binding));
    const roleName = workbook.roles.find((r) => r.id === binding.role)?.name ?? binding.role;
    return {
      key: `${binding.questionId}|${binding.dimension}|${binding.stratum}|${binding.party}`,
      questionId: binding.questionId,
      questionText: questions.get(binding.questionId) ?? binding.questionId,
      meta: `${label} · SEAL-${binding.seal} · ${roleName}`,
      label,
      roleName,
      seal: binding.seal,
    };
  };

  const undefended = result.gating
    .filter((b) => b.evidence === null)
    .map(rowView)
    .sort((a, b) => b.seal - a.seal);

  // Walked in workbook order, so equal debts tie-break on the instrument's order.
  const owed = new Set(undefended.map((r) => r.questionId));
  const byObjective = workbook.objectives
    .map((o) => ({
      objectiveId: o.id,
      objectiveName: o.name,
      questions: o.questions.filter((q) => owed.has(q.id)).length,
    }))
    .filter((o) => o.questions > 0)
    .sort((a, b) => b.questions - a.questions);

  return {
    kind: 'covered',
    evidenced,
    total,
    headline: `${evidenced} of ${total} gating answers carry evidence.`,
    barFraction: evidenced / total,
    floor: result.overall.floor,
    undefendedByObjective: byObjective,
    undefendedLabel: `${owed.size} ${owed.size === 1 ? 'question' : 'questions'}`,
    undefended,
    caption: CAPTION,
  };
}
