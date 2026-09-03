import type { Answer, Party, PartyType, Question, Seal, Target, Workbook } from '../../schema';
import { findAnswer, questionUnits, sealOfAnswer } from '../../assessment';
import { minSeal, sealName } from '../../score-engine';

// Which question (and which of its answer units) the rail has open is NOT here: it
// is one member of the Inspector's subject union, ui/inspector's InspectSelection.

// The critical dimension ids (the SEAL gate reads these — delivery §2.1,
// ADR-0005). Shown as a ⚑ flag on a dimension in the detail so the facilitator
// sees which dimensions can pin the estate floor.
export function criticalDimensions(workbook: Workbook): Set<string> {
  return new Set(workbook.dimensions.filter((d) => d.critical).map((d) => d.id));
}

// One unit of a question, resolved against a loaded assessment's answers: the
// target it fans over (a dimension / stratum / party / the estate) and the SEAL
// selected there — or the recorded off-ladder state, or `unanswered` when the
// assessment carries nothing for it. `seal` is set only when `state==='answered'`.
export type UnitSeal = {
  target: Target;
  state: 'answered' | 'dont-know' | 'na' | 'unanswered';
  /** The rung this unit selected; null unless `state === 'answered'`. The rung,
   *  not the SEAL, is what tells two units apart (invariant #3). */
  rungId: string | null;
  seal: Seal | null;
};

// The selected seals for a question, one per unit it covers (its dimensions /
// strata / parties / the estate), read from a loaded assessment's answers. Empty
// answers (e.g. a bare imported workbook) → every unit `unanswered`.
export function questionUnitSeals(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  question: Question,
): UnitSeal[] {
  return questionUnits(workbook, parties, answers, question).map((target): UnitSeal => {
    const a = findAnswer(answers, question.id, target);
    if (!a) return { target, state: 'unanswered', rungId: null, seal: null };
    if (a.state === 'answered')
      return { target, state: 'answered', rungId: a.rungId, seal: sealOfAnswer(question, a) };
    return { target, state: a.state, rungId: null, seal: null };
  });
}

// The LOWEST selected seal across a question's covered units — the SEAL rank the
// facilitator scans in the list, and the one the estate floor would read from this
// question (lower SEAL = more exposed). null when no unit is answered yet, so a
// bare workbook or an untouched question shows no rank.
export function questionLowestSeal(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  question: Question,
): Seal | null {
  const seals = questionUnitSeals(workbook, parties, answers, question).flatMap((u) =>
    u.state === 'answered' && u.seal !== null ? [u.seal] : [],
  );
  return seals.length ? minSeal(seals) : null;
}

// How many units of a question the assessment actually answered (a rung, not a
// don't-know / n/a / unanswered) — the "· of N answered" count beside the lowest.
export function answeredUnitCount(unitSeals: UnitSeal[]): number {
  return unitSeals.filter((u) => u.state === 'answered').length;
}

// How a question fans out, in words: dimension grain → one answer per applicable
// dimension; party axis → one per declared party; assessment axis → asked once for
// the whole estate. The grain line under the question's identity.
export function questionGrainLabel(question: Question): string {
  return question.grain === 'dimension'
    ? 'Dimension grain · one answer per applicable dimension'
    : question.axis === 'party'
      ? 'Party grain · one answer per declared party'
      : 'Party grain · asked once for the whole estate';
}

/** One stratum of a split dimension, with the seal selected for it (null when that
 *  stratum is unanswered inside a loaded assessment). */
export type StratumSeal = { stratum: string; seal: Seal | null };

/** One dimension a dimension-grain question applies to, resolved against the
 *  loaded answers: its lowest selected seal, whether it gates the floor, and the
 *  per-stratum seals when it was split (else its bare declared strata). */
export type DimensionCoverage = {
  id: string;
  name: string;
  critical: boolean;
  strata: string[];
  seal: Seal | null;
  strataSeals: StratumSeal[];
};

// The dimensions a dimension-grain question fans over, each with its selected
// seal(s): the whole-dimension answer, or — when split — one seal per stratum (with
// the dimension's lowest shown on the row). [] for any non-dimension question.
export function dimensionCoverage(
  workbook: Workbook,
  question: Question,
  unitSeals: UnitSeal[],
): DimensionCoverage[] {
  if (question.grain !== 'dimension') return [];
  const critical = criticalDimensions(workbook);
  return question.appliesTo.map((id): DimensionCoverage => {
    const d = workbook.dimensions.find((x) => x.id === id);
    const units = unitSeals.filter(
      (u) =>
        (u.target.kind === 'dimension' || u.target.kind === 'dimension-stratum') &&
        u.target.dimension === id,
    );
    const seals = units.flatMap((u) => (u.state === 'answered' && u.seal !== null ? [u.seal] : []));
    const seal = seals.length ? minSeal(seals) : null;
    const strataSeals = units
      .filter((u) => u.target.kind === 'dimension-stratum')
      .map((u): StratumSeal => ({
        stratum: u.target.kind === 'dimension-stratum' ? u.target.stratum : '',
        seal: u.state === 'answered' ? u.seal : null,
      }));
    return {
      id,
      name: d?.name ?? id,
      critical: critical.has(id),
      strata: d?.strata ?? [],
      seal,
      strataSeals,
    };
  });
}

/** One concrete declared party a party-axis question is answered for, with its
 *  selected seal and its kind (assessed party vs third party). */
export type PartyCoverage = { id: string; name: string; kind: PartyType['kind']; seal: Seal | null };

// The concrete parties a party-axis question fans over, each with its selected
// seal. [] for a dimension-grain or assessment-axis question.
export function partyCoverage(
  workbook: Workbook,
  parties: Party[],
  question: Question,
  unitSeals: UnitSeal[],
): PartyCoverage[] {
  if (!(question.grain === 'party' && question.axis === 'party')) return [];
  return parties.map((p): PartyCoverage => {
    const u = unitSeals.find((x) => x.target.kind === 'party' && x.target.party === p.id);
    return {
      id: p.id,
      name: p.name,
      kind: workbook.parties.find((t) => t.id === p.type)?.kind ?? 'third-party',
      seal: u !== undefined && u.state === 'answered' ? u.seal : null,
    };
  });
}

// The single whole-estate answer of an assessment-axis question, or null (for any
// other question, or when the estate answer is not selected yet).
export function assessmentSeal(question: Question, unitSeals: UnitSeal[]): Seal | null {
  if (!(question.grain === 'party' && question.axis === 'assessment')) return null;
  const u = unitSeals.find((x) => x.target.kind === 'assessment');
  return u !== undefined && u.state === 'answered' ? u.seal : null;
}

/** One rung of the answer ladder, resolved against the loaded answers: whether a
 *  unit selected it, how many did, and whether it is the binding (lowest) result. */
export type LadderRung = {
  /** The frozen rung id — the render key, because a SEAL may repeat. */
  rungId: string;
  seal: Seal;
  name: string;
  description: string;
  selected: boolean;
  binding: boolean;
  seats: number;
};

// The answer ladder for a question in authored order, each rung marked with how
// many units selected it and whether it is the binding lowest. Seats count the
// units that picked THIS rung, so two rungs at one SEAL never share a unit.
export function answerLadder(
  workbook: Workbook,
  question: Question,
  unitSeals: UnitSeal[],
  lowest: Seal | null,
): LadderRung[] {
  const seatsAt = (rungId: string): number =>
    unitSeals.filter((u) => u.state === 'answered' && u.rungId === rungId).length;
  return question.ladder.map((rung): LadderRung => {
    const seats = seatsAt(rung.id);
    const selected = seats > 0;
    return {
      rungId: rung.id,
      seal: rung.seal,
      name: sealName(workbook.sealLevels, rung.seal),
      description: rung.description,
      selected,
      binding: selected && rung.seal === lowest,
      seats,
    };
  });
}
