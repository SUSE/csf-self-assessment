import type { Party, Seal, Target, Workbook } from '../schema';
import type { EngineResult, StaircaseBinding } from '../score-engine';
import { sealName } from '../score-engine';
import { targetLabel } from '../utils/target-label';

// One gating answer on a rung. Every rendered string is computed here; the
// component renders and computes none.
export type StaircaseRowView = {
  // `<questionId>|<dimension>|<stratum>|<party>` — stable across renders.
  key: string;
  questionId: string;
  questionText: string;
  // The answered unit's target, in the vocabulary every other surface uses.
  label: string;
  // The authored name of the role that answers this question.
  roleName: string;
  seal: Seal;
  evidence: boolean;
};

export type StaircaseStepView = {
  // `step:<floor>`.
  key: string;
  floor: Seal;
  // The authored seal level's name at `floor`.
  floorName: string;
  // `SEAL-0 · No Sovereignty` — the rung named as the rail heads it.
  title: string;
  count: number;
  // `Fix these 5 → the floor rises to SEAL-1.`
  // `Fix this one → the floor rises to SEAL-2.`
  // `Fix these 3 → the last constraint clears (up to SEAL-4).`
  unlocks: string;
  rows: StaircaseRowView[];
};

export type StaircaseTile =
  | {
      kind: 'climb';
      // `5 answers pin you at SEAL-0` / `1 answer pins you at SEAL-0`.
      headline: string;
      floor: Seal;
      floorName: string;
      // Binding counts rung by rung: `5 → 22 → 30 → 10`.
      climb: string;
      // The authored SEAL-4 level's name — the summit tread's label.
      summitName: string;
      steps: StaircaseStepView[];
    }
  | { kind: 'clear'; floor: Seal; floorName: string; reason: string }
  | { kind: 'not-assessed'; reason: string };

// The binding's three nullable facets are mutually exclusive by the engine's own
// contract; precedence reconstructs the unit's target so the label is the same
// vocabulary every other surface uses. Shared by the evidence and second-look
// tiles, which list the same gating answers.
export function bindingTarget(binding: StaircaseBinding): Target {
  if (binding.party !== null) return { kind: 'party', party: binding.party };
  if (binding.dimension !== null && binding.stratum !== null) {
    return { kind: 'dimension-stratum', dimension: binding.dimension, stratum: binding.stratum };
  }
  if (binding.dimension !== null) return { kind: 'dimension', dimension: binding.dimension };
  return { kind: 'assessment' };
}

export function staircaseTile(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): StaircaseTile {
  const floor = result.overall.floor;
  if (floor === null) {
    return {
      kind: 'not-assessed',
      reason: 'Not yet assessed — the climb appears once a material gating answer lands.',
    };
  }
  if (result.staircase.length === 0) {
    return {
      kind: 'clear',
      floor,
      floorName: sealName(workbook.sealLevels, floor),
      reason: 'Clear — every gating answer sits at SEAL-4, so nothing caps the estate.',
    };
  }

  const questions = new Map(
    workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]),
  );
  const rowView = (binding: StaircaseBinding): StaircaseRowView => ({
    key: `${binding.questionId}|${binding.dimension}|${binding.stratum}|${binding.party}`,
    questionId: binding.questionId,
    questionText: questions.get(binding.questionId) ?? binding.questionId,
    label: targetLabel(workbook, parties, bindingTarget(binding)),
    roleName: workbook.roles.find((r) => r.id === binding.role)?.name ?? binding.role,
    seal: binding.seal,
    evidence: binding.evidence !== null,
  });

  const steps: StaircaseStepView[] = result.staircase.map((step) => ({
    key: `step:${step.floor}`,
    floor: step.floor,
    floorName: sealName(workbook.sealLevels, step.floor),
    title: `SEAL-${step.floor} · ${sealName(workbook.sealLevels, step.floor)}`,
    count: step.binding.length,
    unlocks: `Fix ${step.binding.length === 1 ? 'this one' : `these ${step.binding.length}`} → ${
      step.unlocksTo === null
        ? 'the last constraint clears (up to SEAL-4).'
        : `the floor rises to SEAL-${step.unlocksTo}.`
    }`,
    rows: step.binding.map(rowView),
  }));

  const first = steps[0]!;

  return {
    kind: 'climb',
    headline: `${first.count} ${first.count === 1 ? 'answer pins' : 'answers pin'} you at SEAL-${floor}`,
    floor,
    floorName: sealName(workbook.sealLevels, floor),
    climb: steps.map((s) => s.count).join(' → '),
    summitName: sealName(workbook.sealLevels, 4),
    steps,
  };
}

// The rung a pressed tread names, for the Inspector. Resolved against the live
// reading every render, so a tread whose rung has since cleared resolves to
// nothing rather than to a stale worklist.
export function staircaseRung(view: StaircaseTile, floor: Seal): StaircaseStepView | null {
  if (view.kind !== 'climb') return null;
  return view.steps.find((step) => step.floor === floor) ?? null;
}
