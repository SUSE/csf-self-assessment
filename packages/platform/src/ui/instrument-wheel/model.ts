import type { Answer, Party, Question, Seal, Target, Workbook } from '../../schema';
import { authorGauges } from '../../author';
import { findAnswer, questionUnits, sealOfAnswer } from '../../assessment';
import { minSeal } from '../../score-engine';
import type { ChipKind } from '../wheel';

// The pure model behind InstrumentWheel — the Author's "instrument at a glance"
// on the workbook overview (workbench overview stage). It borrows the MergeWheel
// GRAMMAR one purpose over: the spokes are the instrument's chips — dimensions on
// the right arc, party TYPES on the left, the assessment chip at 12 o'clock —
// but here nothing is answered. A spoke's length is not coverage, it is the
// QUESTION-UNIT COUNT that will fan onto that chip when the instrument is filled,
// so the wheel reads as a radial bar chart of where the author's questions land:
// a busy dimension reaches the rim, a dimension no question touches is a visible
// stub (a gap to close), and the party arc shows the taxonomy each concrete party
// will answer against.

// This is deliberately NOT the MergeWheel with faked answers. There are no live
// answers to colour by in the Author app, and painting every spoke "unclaimed"
// would be a lie. Instead every number here is derivable from the workbook
// DEFINITION alone (the twin of authorGauges, whose budget/coverage/role figures
// it reuses so the two never drift). It computes no estate truth and reads no
// clock — pure counts over the draft, recomputed on every edit.

export type InstrumentSection = 'objectives' | 'dimensions' | 'parties' | 'roles' | 'testEstates';

export type InstrumentChip = {
  kind: ChipKind;
  key: string;
  // Chip name: the dimension, the party type, or "Whole estate".
  name: string;
  // Second label line: the party class, "asked once", or ''.
  sub: string;
  // Question-units that fan onto this chip: dimension-grain units per dimension,
  // party-axis questions per party type (every party of any type answers them),
  // assessment-axis questions on the estate chip. The spoke length.
  count: number;
  // Drawn in emphasis ink: a critical dimension (it gates), the assessed party
  // (the "us"), and the assessment chip (always gates).
  emphasis: boolean;
  // count === 0. Only a real signal for dimensions — a dimension no question
  // reaches is a coverage gap; still earns a spoke (the workbook IS the estate).
  empty: boolean;
  // Dimensions: how many strata this dimension splits into (0 = unsplittable).
  // Drawn as layer ticks outside the rim. 0 for party/assessment chips.
  strata: number;
  // Where clicking this chip navigates the workbench.
  section: InstrumentSection;
};

// Every count/stat the overview can honestly show from the definition alone.
// Budget-shaped figures (questions, units, minutes, targets) and the uncovered /
// unused readings are taken from authorGauges so the wheel and the Author HUD
// always agree; the rest are direct workbook tallies.
export type InstrumentStats = {
  objectives: number;
  // Objective weights; a valid workbook sums to exactly 100.
  weightSum: number;
  questions: number;
  questionTarget: number;
  // Party-grain question count (both axes).
  partyGrain: number;
  // Dimension-grain question count.
  dimensionGrain: number;
  answerUnits: number;
  estimatedMinutes: number;
  minutesTarget: number;
  dimensions: number;
  criticalDimensions: number;
  // Dimensions no question reaches — the coverage gaps (authorGauges).
  uncoveredDimensions: number;
  // Total strata across every dimension.
  strata: number;
  // Dimensions that split into at least one stratum.
  splitDimensions: number;
  partyTypes: number;
  // Party types whose kind is not the assessed class.
  thirdPartyTypes: number;
  roles: number;
  // Authored roles no question uses yet.
  unusedRoles: number;
  testEstates: number;
};

export type InstrumentModel = {
  chips: InstrumentChip[];
  // The busiest chip's count — what a full-rim spoke represents. 0 when the
  // workbook has no questions yet (every spoke is then a bare stub).
  maxCount: number;
  // Sum of every chip's count — total answer interactions the instrument fans to.
  totalUnits: number;
  stats: InstrumentStats;
};

export function instrumentModel(workbook: Workbook): InstrumentModel {
  const gauges = authorGauges(workbook);

  // Dimension-grain units per dimension, and the party/assessment tallies.
  const perDimension = new Map<string, number>(workbook.dimensions.map((d) => [d.id, 0]));
  let partyAxisQuestions = 0;
  let assessmentQuestions = 0;
  let partyGrain = 0;
  let dimensionGrain = 0;

  for (const objective of workbook.objectives) {
    for (const question of objective.questions) {
      if (question.grain === 'party') {
        partyGrain += 1;
        if (question.axis === 'party') partyAxisQuestions += 1;
        else assessmentQuestions += 1;
      } else {
        dimensionGrain += 1;
        for (const d of question.appliesTo) {
          if (perDimension.has(d)) perDimension.set(d, (perDimension.get(d) ?? 0) + 1);
        }
      }
    }
  }

  const chips: InstrumentChip[] = [];

  // The assessment chip (top): the party-grain questions asked once for the estate.
  chips.push({
    kind: 'assessment',
    key: 'assessment',
    name: 'Whole estate',
    sub: `${assessmentQuestions} question${assessmentQuestions === 1 ? '' : 's'} · asked once`,
    count: assessmentQuestions,
    emphasis: true,
    empty: assessmentQuestions === 0,
    strata: 0,
    section: 'objectives',
  });

  // Dimension chips (right arc), in workbook order — every authored dimension
  // earns a spoke, empty or not (the workbook IS the estate).
  for (const dimension of workbook.dimensions) {
    const count = perDimension.get(dimension.id) ?? 0;
    const strata = dimension.strata?.length ?? 0;
    chips.push({
      kind: 'dimension',
      key: dimension.id,
      name: dimension.name || dimension.id,
      sub: `${count} question${count === 1 ? '' : 's'}${strata > 0 ? ` · ${strata} strata` : ''}`,
      count,
      emphasis: dimension.critical,
      empty: count === 0,
      strata,
      section: 'dimensions',
    });
  }

  // Party-type chips (left arc), in workbook order. Party-axis questions are asked
  // of EVERY concrete party regardless of type, so each type carries the same load
  // — the arc is the taxonomy, not a per-type question count. Still, show that load
  // per spoke (like a dimension shows its own), so the count is never invisible.
  for (const party of workbook.parties) {
    const assessed = party.kind === 'assessed';
    chips.push({
      kind: 'party',
      key: party.id,
      name: party.name || party.id,
      sub: `${partyAxisQuestions} question${partyAxisQuestions === 1 ? '' : 's'} · ${assessed ? 'assessed party' : 'third party'}`,
      count: partyAxisQuestions,
      emphasis: assessed,
      empty: partyAxisQuestions === 0,
      strata: 0,
      section: 'parties',
    });
  }

  const roleLoads = gauges.roleReadout.loads;
  const stats: InstrumentStats = {
    objectives: workbook.objectives.length,
    weightSum: workbook.objectives.reduce((sum, o) => sum + o.weight, 0),
    questions: gauges.budget.questionCount,
    questionTarget: gauges.budget.questionTarget,
    partyGrain,
    dimensionGrain,
    answerUnits: gauges.budget.answerUnits,
    estimatedMinutes: gauges.budget.estimatedMinutes,
    minutesTarget: gauges.budget.minutesTarget,
    dimensions: workbook.dimensions.length,
    criticalDimensions: workbook.dimensions.filter((d) => d.critical).length,
    uncoveredDimensions: gauges.coverage.uncoveredDimensions.length,
    strata: workbook.dimensions.reduce((sum, d) => sum + (d.strata?.length ?? 0), 0),
    splitDimensions: workbook.dimensions.filter((d) => (d.strata?.length ?? 0) > 0).length,
    partyTypes: workbook.parties.length,
    thirdPartyTypes: workbook.parties.filter((p) => p.kind !== 'assessed').length,
    roles: workbook.roles.length,
    unusedRoles: roleLoads.filter((l) => l.questionCount === 0).length,
    testEstates: workbook.testEstates.length,
  };

  return {
    chips,
    maxCount: chips.reduce((max, c) => (c.count > max ? c.count : max), 0),
    totalUnits: chips.reduce((sum, c) => sum + c.count, 0),
    stats,
  };
}

// --- results overlay: the answered SEALs, read per spoke ----------------------
// The Author app has no answers, so instrumentModel above stays structural. But
// the FACILITATOR imports returned partials (or merges several), and those carry
// real answers — the same ones the Questions inspector shows a SealBadge for. This
// rolls those answers up to the wheel's OWN chip taxonomy so the overview can mark
// each spoke with the SEAL rank it was answered at, without recolouring the
// importance-inked bar. It is the twin of question-inspector's questionLowestSeal,
// aggregated one grain coarser (a whole spoke, not one question), and reuses the
// same primitives (questionUnits + findAnswer) so the reading never drifts.

// Chips are keyed exactly as InstrumentChip: a dimension id, a party TYPE id, or
// 'assessment'. Party-axis answers are recorded against CONCRETE parties, so they
// roll up to the answering party's TYPE (the arc the wheel actually draws). Pure —
// no clock, no estate truth; `seal` is the lowest ANSWERED seal (floor-oriented,
// matching questionLowestSeal), null when nothing on the chip is answered yet.

export type ChipSeal = {
  // Question-units that fan onto this chip — counted at the SAME grain
  // instrumentModel sizes the spoke by (one per question × chip, NOT expanded by
  // strata or by concrete party), so `Σ total` equals the wheel's `totalUnits`
  // and the overview's coverage never shows a denominator the wheel contradicts.
  total: number;
  // Of `total`, the question-units FULLY dealt with — every underlying concrete
  // unit (each stratum, each party of the type) carries a recorded answer.
  covered: number;
  // Lowest ANSWERED seal across every concrete unit on the chip, or null when
  // none is answered (the worst-case rank, as questionLowestSeal reads it).
  seal: Seal | null;
};

export function instrumentSeals(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
): Map<string, ChipSeal> {
  const out = new Map<string, ChipSeal>();
  const seals = new Map<string, Seal[]>();
  const ensure = (id: string): ChipSeal => {
    let chip = out.get(id);
    if (!chip) {
      chip = { total: 0, covered: 0, seal: null };
      out.set(id, chip);
      seals.set(id, []);
    }
    return chip;
  };

  // The same chip taxonomy instrumentModel draws: a party target rolls up to its
  // concrete party's TYPE (the arc), a dimension/stratum to its dimension, the
  // assessment axis to the single estate chip.
  const chipId = (target: Target): string | null => {
    if (target.kind === 'dimension' || target.kind === 'dimension-stratum') {
      return `dimension:${target.dimension}`;
    }
    if (target.kind === 'party') {
      const type = parties.find((p) => p.id === target.party)?.type;
      return type ? `party:${type}` : null;
    }
    return 'assessment:assessment';
  };

  for (const objective of workbook.objectives) {
    for (const question of objective.questions) {
      // A question fans onto a chip through one OR MORE concrete units (a split
      // dimension's strata; every declared party of a type). The spoke counts the
      // question ONCE, so group the concrete units by chip and score the group.
      const groups = new Map<string, Target[]>();
      for (const target of questionUnits(workbook, parties, answers, question)) {
        const id = chipId(target);
        if (id === null) continue;
        const group = groups.get(id);
        if (group) group.push(target);
        else groups.set(id, [target]);
      }
      for (const [id, targets] of groups) {
        const chip = ensure(id);
        chip.total += 1;
        let recorded = 0;
        for (const target of targets) {
          const answer = findAnswer(answers, question.id, target);
          if (answer === undefined) continue;
          recorded += 1;
          if (answer.state === 'answered') {
            const seal = sealOfAnswer(question, answer);
            if (seal !== null) seals.get(id)?.push(seal);
          }
        }
        // Covered only when every concrete unit is dealt with — the honest
        // "answered" claim, never over-reported by a single stratum/party.
        if (recorded === targets.length) chip.covered += 1;
      }
    }
  }

  for (const [id, chip] of out) {
    const answered = seals.get(id) ?? [];
    chip.seal = answered.length ? minSeal(answered) : null;
  }
  return out;
}

// -- inspection: one chip, read as the questions that fan onto it ------------
// The overview's Inspector (right rail): click a spoke and see the questions it
// carries, grouped by the objective (SOV) that owns them. This is the twin of
// instrumentModel read one chip deep instead of the whole wheel — same taxonomy
// (a dimension key, a party-type key, the assessment chip), same "derived from
// the definition alone" rule, no clock and no answers. A dimension chip carries
// its dimension-grain questions (appliesTo), a party chip the party-axis
// questions (one answer per declared party, so every type carries them all), the
// assessment chip the asked-once questions. Returns null when the selection names
// a chip that no longer exists — a dimension or party removed after it was picked;
// the assessment chip is always resolvable.

export type InstrumentSelection = {
  chipKind: ChipKind;
  // The chip's key: a dimension id, a party-type id, or 'assessment'.
  key: string;
};

export type InspectedQuestion = {
  id: string;
  text: string;
  role: string;
  // The authored role's display NAME — what a rail shows. `role` is the key.
  roleName: string;
};

export type InspectedGroup = {
  // The owning objective — the SOV this run of questions belongs to.
  objectiveId: string;
  objectiveName: string;
  questions: InspectedQuestion[];
};

export type InstrumentInspection = {
  chipKind: ChipKind;
  key: string;
  // The chip's headline: the dimension/party name, or 'Whole estate'.
  name: string;
  // One-line descriptor of what the chip is and how its questions fan out.
  kindLabel: string;
  // Where a "manage" affordance deep-links — the section that owns this chip.
  section: InstrumentSection;
  // Total matching questions across every group.
  total: number;
  // Matching questions grouped by objective, in workbook order; only objectives
  // with at least one match appear. Empty when no question reaches this chip yet.
  groups: InspectedGroup[];
};

export function inspectChip(
  workbook: Workbook,
  selection: InstrumentSelection,
): InstrumentInspection | null {
  let name: string;
  let kindLabel: string;
  let section: InstrumentSection;
  let matches: (q: Question) => boolean;

  if (selection.chipKind === 'dimension') {
    const dimension = workbook.dimensions.find((d) => d.id === selection.key);
    if (!dimension) return null;
    name = dimension.name || dimension.id;
    const strata = dimension.strata?.length ?? 0;
    kindLabel =
      (dimension.critical ? 'critical dimension · gates the floor' : 'dimension · scores only') +
      (strata > 0 ? ` · ${strata} strata` : '');
    section = 'dimensions';
    matches = (q) => q.grain === 'dimension' && q.appliesTo.includes(selection.key);
  } else if (selection.chipKind === 'party') {
    const party = workbook.parties.find((p) => p.id === selection.key);
    if (!party) return null;
    name = party.name || party.id;
    kindLabel =
      (party.kind === 'assessed' ? 'assessed party' : 'third party') +
      ' · one answer per declared party';
    section = 'parties';
    matches = (q) => q.grain === 'party' && q.axis === 'party';
  } else {
    name = 'Whole estate';
    kindLabel = 'asked once for the estate';
    section = 'objectives';
    matches = (q) => q.grain === 'party' && q.axis === 'assessment';
  }

  const groups: InspectedGroup[] = [];
  let total = 0;
  for (const objective of workbook.objectives) {
    const questions = objective.questions.filter(matches).map((q) => ({
      id: q.id,
      text: q.text,
      role: q.role,
      roleName: workbook.roles.find((r) => r.id === q.role)?.name ?? q.role,
    }));
    if (questions.length === 0) continue;
    total += questions.length;
    groups.push({ objectiveId: objective.id, objectiveName: objective.name, questions });
  }

  return { chipKind: selection.chipKind, key: selection.key, name, kindLabel, section, total, groups };
}
