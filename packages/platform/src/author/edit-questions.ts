import type { Materiality, Objective, Question, Role, Rung, Workbook } from '../schema';
import { allQuestionIds, filterLinks, mapQuestions, nextId, renameLinks } from './links';

// Objectives, their questions, and each question's SEAL ladder (see./links for
// the preamble).

export function addObjective(wb: Workbook): Workbook {
  const id = nextId(wb.objectives.map((o) => o.id), 'obj');
  return {
    ...wb,
    objectives: [...wb.objectives, { id, name: 'New objective', weight: 0, questions: [] }],
  };
}

// Clearing the description DROPS the key (ObjectiveSchema forbids an empty-string
// description; exactOptionalPropertyTypes), the twin of updateRole's drop.
export function updateObjective(
  wb: Workbook,
  objectiveId: string,
  patch: Partial<Pick<Objective, 'id' | 'name' | 'description' | 'weight'>>,
): Workbook {
  const next = {
    ...wb,
    objectives: wb.objectives.map((o) => {
      if (o.id !== objectiveId) return o;
      const merged = { ...o, ...patch };
      if (patch.description === '') {
        const { description: _drop, ...rest } = merged;
        return rest;
      }
      return merged;
    }),
  };
  if (patch.id === undefined || patch.id === objectiveId) return next;
  return renameLinks(next, 'objective', objectiveId, patch.id);
}

// Removing an objective removes its questions — estate answers for those
// questions go with it, or they'd dangle (strict rule R10).
export function removeObjective(wb: Workbook, objectiveId: string): Workbook {
  const removed = new Set(
    wb.objectives.find((o) => o.id === objectiveId)?.questions.map((q) => q.id) ?? [],
  );
  const unlinked = filterLinks(
    wb,
    (l) =>
      !(l.kind === 'objective' && l.id === objectiveId) &&
      !(l.kind === 'question' && removed.has(l.id)),
  );
  return {
    ...unlinked,
    objectives: unlinked.objectives.filter((o) => o.id !== objectiveId),
    testEstates: unlinked.testEstates.map((e) => ({
      ...e,
      answers: e.answers.filter((a) => !removed.has(a.questionId)),
    })),
  };
}

// A new question, draft-blank: empty text and no why (both glow until written), the
// ladder EMPTY (rungs appear as the author types into a SEAL slot — sparse
// ladders are gaps), material by default, the workbook's first
// authored role as a neutral default (empty string when the author has defined
// no roles yet — the question then glows until a role exists to name). Dimension
// grain starts applying to nothing — picking chips is authoring, not a default.
export function addQuestion(
  wb: Workbook,
  objectiveId: string,
  grain: 'party' | 'dimension',
): Workbook {
  const id = nextId(allQuestionIds(wb), 'q');
  const role = wb.roles[0]?.id ?? '';
  const question: Question =
    grain === 'party'
      ? { id, grain: 'party', axis: 'assessment', text: '', role, defaultMateriality: 'material', ladder: [] }
      : { id, grain: 'dimension', appliesTo: [], text: '', role, defaultMateriality: 'material', ladder: [] };
  return {
    ...wb,
    objectives: wb.objectives.map((o) =>
      o.id === objectiveId ? { ...o, questions: [...o.questions, question] } : o,
    ),
  };
}

export function removeQuestion(wb: Workbook, questionId: string): Workbook {
  const unlinked = filterLinks(wb, (l) => !(l.kind === 'question' && l.id === questionId));
  return {
    ...unlinked,
    objectives: unlinked.objectives.map((o) => ({
      ...o,
      questions: o.questions.filter((q) => q.id !== questionId),
    })),
    testEstates: unlinked.testEstates.map((e) => ({
      ...e,
      answers: e.answers.filter((a) => a.questionId !== questionId),
    })),
  };
}

// Patch the fields common to both grains. Renaming the ID cascades into
// every test estate's answers — a rename is not a removal.
export function updateQuestion(
  wb: Workbook,
  questionId: string,
  patch: Partial<{ id: string; text: string; why: string; role: Role; defaultMateriality: Materiality }>,
): Workbook {
  const next = mapQuestions(wb, (q) => {
    if (q.id !== questionId) return q;
    const merged = { ...q, ...patch };
    if (patch.why === '') {
      const { why: _drop, ...rest } = merged;
      return rest;
    }
    return merged;
  });
  if (patch.id === undefined || patch.id === questionId) return next;
  const renamed = patch.id;
  const reanswered = {
    ...next,
    testEstates: next.testEstates.map((e) => ({
      ...e,
      answers: e.answers.map((a) =>
        a.questionId === questionId ? { ...a, questionId: renamed } : a,
      ),
    })),
  };
  return renameLinks(reanswered, 'question', questionId, renamed);
}

// Flip a question's grain, preserving everything both grains share. party →
// dimension starts applying to nothing; dimension → party is asked once.
export function setGrain(
  wb: Workbook,
  questionId: string,
  grain: 'party' | 'dimension',
): Workbook {
  return mapQuestions(wb, (q) => {
    if (q.id !== questionId || q.grain === grain) return q;
    // exactOptionalPropertyTypes: an absent `why` must stay an absent KEY, not
    // a key set to undefined.
    const { why } = q;
    const common = {
      id: q.id,
      text: q.text,
      role: q.role,
      defaultMateriality: q.defaultMateriality,
      ladder: q.ladder,
      ...(why === undefined ? {} : { why }),
    };
    return grain === 'party'
      ? { ...common, grain: 'party', axis: 'assessment' }
      : { ...common, grain: 'dimension', appliesTo: [] };
  });
}

export function setAxis(
  wb: Workbook,
  questionId: string,
  axis: 'assessment' | 'party',
): Workbook {
  return mapQuestions(wb, (q) =>
    q.id === questionId && q.grain === 'party' ? { ...q, axis } : q,
  );
}

export function toggleAppliesTo(
  wb: Workbook,
  questionId: string,
  dimensionId: string,
): Workbook {
  return mapQuestions(wb, (q) => {
    if (q.id !== questionId || q.grain !== 'dimension') return q;
    return q.appliesTo.includes(dimensionId)
      ? { ...q, appliesTo: q.appliesTo.filter((d) => d !== dimensionId) }
      : { ...q, appliesTo: [...q.appliesTo, dimensionId] };
  });
}

// The editable half of a rung. `id` is absent by design: identity is minted
// once and no surface edits it.
export type RungPatch = Partial<Pick<Rung, 'description' | 'points' | 'seal'>>;

// Where a rung moves in AUTHORED ORDER: 'earlier' is one index toward the
// ladder's bottom (index 0), 'later' one index toward its top. Named in
// ladder terms, not screen terms, so no caller has to guess which way is up.
export type RungMove = 'earlier' | 'later';

// Append a blank rung at the current top's points and SEAL, so a new rung can
// never break R22/R23 the moment it appears. Its id is the highest SURVIVING
// `choice-N` suffix plus one, so it can never collide with a rung that exists.
// A trailing id freed by a removal may be re-minted: safe, because a stored
// `rungId` is only ever resolved against the workbook it lives in.
export function addRung(wb: Workbook, questionId: string): Workbook {
  return mapQuestions(wb, (q) => {
    if (q.id !== questionId) return q;
    const highestSuffix = q.ladder.reduce((highest, rung) => {
      const match = /^choice-(\d+)$/.exec(rung.id);
      return match === null ? highest : Math.max(highest, Number(match[1]));
    }, 0);
    const top = q.ladder[q.ladder.length - 1];
    const rung: Rung = {
      id: `choice-${highestSuffix + 1}`,
      description: '',
      points: top?.points ?? 0,
      seal: top?.seal ?? 0,
    };
    return { ...q, ladder: [...q.ladder, rung] };
  });
}

// Patch one rung in place. Nothing sorts: authored order IS the ladder,
// so a rung whose SEAL now falls stays where the author put it
// and R23 glows. An emptied description keeps the rung.
export function updateRung(
  wb: Workbook,
  questionId: string,
  rungId: string,
  patch: RungPatch,
): Workbook {
  return mapQuestions(wb, (q) =>
    q.id === questionId
      ? { ...q, ladder: q.ladder.map((rung) => (rung.id === rungId ? { ...rung, ...patch } : rung)) }
      : q,
  );
}

// Drop a rung and every test-estate answer pinned to it (R11). An unknown id is
// a no-op.
export function removeRung(wb: Workbook, questionId: string, rungId: string): Workbook {
  const next = mapQuestions(wb, (q) =>
    q.id === questionId ? { ...q, ladder: q.ladder.filter((rung) => rung.id !== rungId) } : q,
  );
  return {
    ...next,
    testEstates: next.testEstates.map((e) => ({
      ...e,
      answers: e.answers.filter(
        (answer) => !(answer.questionId === questionId && answer.rungId === rungId),
      ),
    })),
  };
}

// Swap a rung with its neighbour in authored order. A no-op at the ends and for
// an unknown id. Reordering changes no reference, so no answer cascades.
export function moveRung(
  wb: Workbook,
  questionId: string,
  rungId: string,
  move: RungMove,
): Workbook {
  return mapQuestions(wb, (q) => {
    if (q.id !== questionId) return q;
    const from = q.ladder.findIndex((rung) => rung.id === rungId);
    const to = move === 'earlier' ? from - 1 : from + 1;
    if (from === -1 || to < 0 || to >= q.ladder.length) return q;
    const ladder = [...q.ladder];
    const [moved] = ladder.splice(from, 1);
    ladder.splice(to, 0, moved);
    return { ...q, ladder };
  });
}
