import type { Answer, Seal, Workbook } from '../schema';
import { gates } from '../score-engine/scope';
import { sealOfAnswer } from './placement';

// Counts over a participant's own answers (delivery §2.7.1, invariant #7): answered,
// how many carry evidence, how many admit don't-know. Never an estate figure.
export type SliceHygiene = { answered: number; evidenced: number; dontKnow: number };

export function sliceHygiene(answers: Answer[]): SliceHygiene {
  let answered = 0;
  let evidenced = 0;
  let dontKnow = 0;
  for (const a of answers) {
    if (a.state === 'answered') {
      answered += 1;
      if (a.evidence !== undefined) evidenced += 1;
    } else if (a.state === 'dont-know') {
      dontKnow += 1;
    }
  }
  return { answered, evidenced, dontKnow };
}

// Per-question binding potential (delivery §2.7.1, invariant #7): the seal each
// material GATING question would cap the estate at once merged. A gating answer is
// answered + material and either party-grain (always gates) or a critical-dimension
// answer. Computed from the workbook alone — never evaluates an estate result. One
// entry per question with ≥1 gating answer, carrying its minimum gating seal.
export type BindingPotential = { questionId: string; seal: Seal };

export function bindingPotential(workbook: Workbook, answers: Answer[]): BindingPotential[] {
  const critical = new Set(workbook.dimensions.filter((d) => d.critical).map((d) => d.id));
  const out: BindingPotential[] = [];
  for (const objective of workbook.objectives) {
    for (const question of objective.questions) {
      if (!gates(question.defaultMateriality)) continue;
      const seals: Seal[] = [];
      for (const a of answers) {
        if (a.questionId !== question.id || a.state !== 'answered') continue;
        const gating =
          question.grain === 'party' ||
          ((a.target.kind === 'dimension' || a.target.kind === 'dimension-stratum') &&
            critical.has(a.target.dimension));
        if (!gating) continue;
        const seal = sealOfAnswer(question, a);
        if (seal !== null) seals.push(seal);
      }
      if (seals.length > 0) {
        out.push({ questionId: question.id, seal: seals.reduce((m, s) => (s < m ? s : m)) });
      }
    }
  }
  return out;
}
