import type {
  CheckOpen,
  ContributorUnit,
  DontKnowRow,
  EvidenceRow,
  HeatDetail,
  HeatDetailRow,
  OpenGroup,
  ProvenanceUnit,
  RecommendationCard,
  StaircaseStepView,
} from '../../analytics';
import type { Objective, RoleDef, Seal } from '../../schema';

// The rails' shared shape for "a question and its units", and the adapters that build
// it from each rail's own model. Pure: the components render this and decide nothing.

/** An answer as a rail shows it. Absent where the rail lists units with no answer yet. */
export type ReadingView = {
  state: 'answered' | 'dont-know' | 'na';
  seal: Seal | null;
  /** `SEAL-2`, `don't-know`, `n/a` — the words, for a row with nothing else to say. */
  text: string;
  evidence: boolean;
};

/** One unit under a question: what tells it from its siblings, and its answer. */
export type QuestionUnitView = { facet: string; reading?: ReadingView | null };

export type QuestionBlockView = {
  questionId: string;
  text: string;
  /** Facts every unit shares — the answering role, a target the siblings share. */
  chips: string[];
  units: QuestionUnitView[];
};

/** Blocks in first-appearance order; `shared` is what the whole mark holds in common. */
export type HeatMarkBlocks = { shared: string; blocks: QuestionBlockView[] };

/** Question blocks under the objective (SOV) that owns them. */
export type ObjectiveGroupView = {
  objectiveId: string;
  objectiveName: string;
  blocks: QuestionBlockView[];
};

/**
 * Blocks grouped by the objective that authored each question, in workbook order —
 * the reading every rail that lists questions from ACROSS the instrument wants, since
 * a flat list of 62 rows has no shape. Objectives with nothing to show are dropped, and
 * a block whose question the workbook no longer has goes with them.
 */
export function byObjective(
  objectives: Objective[],
  blocks: QuestionBlockView[],
): ObjectiveGroupView[] {
  return objectives
    .map((objective): ObjectiveGroupView => {
      const ids = new Set(objective.questions.map((question) => question.id));
      return {
        objectiveId: objective.id,
        objectiveName: objective.name,
        blocks: blocks.filter((block) => ids.has(block.questionId)),
      };
    })
    .filter((group) => group.blocks.length > 0);
}

/**
 * Gating answers with no document behind them, read as the questions they answer. The
 * role is a chip (one authored role per question), the target tells the siblings apart,
 * and the seal is the badge — the claim's strength is why the missing document matters.
 */
export function evidenceBlocks(rows: EvidenceRow[]): QuestionBlockView[] {
  return groupByQuestion(rows).map((group): QuestionBlockView => {
    const first = group[0]!;
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [first.roleName],
      units: group.map((row) => ({
        facet: row.label,
        reading: {
          state: 'answered',
          seal: row.seal,
          text: `SEAL-${row.seal}`,
          evidence: false,
        },
      })),
    };
  });
}

/**
 * The units one consistency check invites the room to open, read as the questions that
 * carry them. No chips and no reading: a check asks about a unit, and what that unit
 * currently answers is the question rail's job, one press further in.
 */
export function checkBlocks(opens: CheckOpen[]): QuestionBlockView[] {
  return groupByQuestion(opens).map((group): QuestionBlockView => {
    const first = group[0]!;
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [],
      units: group.map((open) => ({ facet: open.label })),
    };
  });
}

export function objectiveQuestionBlocks(
  objective: Objective,
  roles: RoleDef[],
): QuestionBlockView[] {
  const roleNames = new Map(roles.map((role) => [role.id, role.name]));
  return objective.questions.map((question) => ({
    questionId: question.id,
    text: question.text,
    chips: [roleNames.get(question.role) ?? question.role],
    units: [],
  }));
}

function groupByQuestion<T extends { questionId: string }>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (const row of rows) {
    const group = out.find((g) => g[0]!.questionId === row.questionId);
    if (group) group.push(row);
    else out.push([row]);
  }
  return out;
}

function sole(values: string[]): string | null {
  const set = new Set(values);
  return set.size === 1 ? [...set][0]! : null;
}

/**
 * The answers behind one heat mark, grouped by question, with each facet stated at the
 * highest level that holds it:
 *
 *  · shared by the whole MARK → `shared`, under the panel header (dropped where the
 *    mark's own title already names it);
 *  · shared by one QUESTION → that block's chips. The role is always here: a question
 *    has one authored role, so it can never tell a question's units apart;
 *  · otherwise → the unit's own row.
 *
 * Engine order survives between blocks and inside one (analytics §4.4.3).
 */
export function heatMarkBlocks(detail: HeatDetail): HeatMarkBlocks {
  const rows = detail.rows;
  const markLabel = sole(rows.map((r) => r.label));
  const markRole = sole(rows.map((r) => r.roleName));
  // The title's PARTS, not the whole string: role `Legal` is not named by the objective
  // `Legal & Jurisdictional Sovereignty`.
  const titleParts = detail.title.split(' × ');
  const shared = [markLabel, markRole]
    .filter((v): v is string => v !== null && !titleParts.includes(v))
    .join(' · ');

  const blocks = groupByQuestion(rows).map((group): QuestionBlockView => {
    const first = group[0]!;
    const varies = (pick: (row: HeatDetailRow) => string): boolean =>
      new Set(group.map(pick)).size > 1;
    // A single unit keeps its target: with no siblings there is nothing to share it with.
    const rowLabel = markLabel === null && (group.length === 1 || varies((r) => r.label));
    const rowRole = markRole === null && varies((r) => r.roleName);
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [
        markLabel === null && !rowLabel ? first.label : null,
        markRole === null && !rowRole ? first.roleName : null,
      ].filter((v): v is string => Boolean(v)),
      units: group.map((row) => ({
        facet: [rowLabel ? row.label : null, rowRole ? row.roleName : null]
          .filter(Boolean)
          .join(' · '),
        reading: {
          state: row.state,
          seal: row.seal,
          text: row.reading,
          evidence: row.evidence,
        },
      })),
    };
  });

  return { shared, blocks };
}

/**
 * The answered facts behind one offer's trigger, read as the questions that carry them
 * (recommendations §4.3). No chips: the panel above already names the trigger every
 * block shares. Evidence is not part of a trigger target, so no clip is claimed.
 */
export function triggerQuestionBlocks(card: RecommendationCard): QuestionBlockView[] {
  return card.questions.map(
    (question): QuestionBlockView => ({
      questionId: question.questionId,
      text: question.questionText,
      chips: [],
      units: question.targets.map((target) => ({
        facet: target.targetLabel,
        reading: {
          state: 'answered',
          seal: target.seal,
          text: `SEAL-${target.seal}`,
          evidence: false,
        },
      })),
    }),
  );
}

/**
 * The answers pinning one rung of the staircase, read as the questions they answer.
 * Every unit on a rung sits at the same seal — that is what a rung IS — so the badge
 * says nothing the panel header has not, and the unit's target is what tells the
 * siblings apart. Engine order survives, so the rail lists the climb's own order.
 */
export function staircaseRungBlocks(step: StaircaseStepView): QuestionBlockView[] {
  return groupByQuestion(step.rows).map((rows): QuestionBlockView => {
    const first = rows[0]!;
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [first.roleName],
      units: rows.map((row) => ({
        facet: row.label,
        reading: {
          state: 'answered',
          seal: row.seal,
          text: `SEAL-${row.seal}`,
          evidence: row.evidence,
        },
      })),
    };
  });
}

/**
 * Admitted unknowns, read as the questions they are admitted on. No readings: every
 * unit in this rail is a don't-know, so a mark per row states once per row what the
 * panel states once (the backlog's idiom). The role is a chip — one authored role per
 * question can never tell its units apart — and the target is what does.
 */
export function dontKnowBlocks(rows: DontKnowRow[]): QuestionBlockView[] {
  return groupByQuestion(rows).map((group): QuestionBlockView => {
    const first = group[0]!;
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [first.roleName],
      units: group.map((row) => ({ facet: row.label })),
    };
  });
}

/**
 * One contributor's standing answers, read as the questions they answer. The reading
 * is the answer itself — this rail exists to say what that person put on the record,
 * so the mark is the point rather than a decoration on a target label.
 */
export function contributorBlocks(units: ContributorUnit[]): QuestionBlockView[] {
  return groupByQuestion(units).map((group): QuestionBlockView => {
    const first = group[0]!;
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [],
      units: group.map((unit) => ({
        facet: unit.label,
        reading: {
          state: unit.state,
          seal: unit.seal,
          text: unit.answer,
          evidence: unit.evidence,
        },
      })),
    };
  });
}

/**
 * The units behind one provenance ratio, read as the questions that carry them. The
 * role is a chip (one authored role per question can never tell its units apart), and
 * the target is the row — joined by how the clash settled where there was one, because
 * on a disputed row that IS what tells two records of the same unit apart.
 */
export function provenanceBlocks(units: ProvenanceUnit[]): QuestionBlockView[] {
  return groupByQuestion(units).map((group): QuestionBlockView => {
    const first = group[0]!;
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [first.roleName],
      units: group.map((unit) => ({
        facet: unit.settled ? `${unit.label} · ${unit.settled}` : unit.label,
        reading:
          unit.reading === null
            ? null
            : {
                state: unit.reading.state,
                seal: unit.reading.seal,
                text: unit.reading.answer,
                evidence: unit.reading.evidence,
              },
      })),
    };
  });
}

/**
 * One owner's open units, read as the questions they are open on. No readings — that is
 * what the backlog means — and a unit label that only repeats the owner is dropped: the
 * group already names it.
 */
export function openUnitBlocks(group: OpenGroup): QuestionBlockView[] {
  return groupByQuestion(group.units).map((units): QuestionBlockView => {
    const first = units[0]!;
    return {
      questionId: first.questionId,
      text: first.questionText,
      chips: [first.roleName],
      units: units
        .filter((unit) => unit.label !== group.label)
        .map((unit) => ({ facet: unit.label })),
    };
  });
}
