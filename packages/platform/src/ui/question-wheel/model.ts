import type { Answer, Party, Question, Seal, Target, Workbook } from '../../schema';
import { gates, scores, type ExposureEdge } from '../../score-engine';
import { attainablePoints, findAnswer, questionUnits, rungIn, sealOfAnswer, targetKey } from '../../assessment';
import { exposureReader, informative, type ExposureMarker } from '../wheel';

// The pure model behind QuestionWheel. One question's
// fan-out laid out as spokes: the ANGLE is the target unit, the RADIUS is the SEAL
// rung placed on it (rung position IS the level, ), so an unplaced
// unit is a spoke with no dot and the units that gate collapse visually onto the
// innermost dot.

// Units come from `questionUnits()` — the same function the fill surface walks — so
// the wheel never invents its own fan-out and inherits split semantics for free
// (: once a stratum refinement exists, the dimension is assessed per
// stratum and the whole-dimension answer is superseded).

// OUTSIDE the rim sits the `serves` EDGES (ui/wheel/exposure) — what the heat map
// structurally cannot show, since party answers report into the objective column
// and are never painted across dimension rows.

// This module computes NO estate truth. `bindingPotential` is the minimum over
// THIS question's gating units — the "per-answer binding potential" the fill
// surface is explicitly allowed to show. It is not the estate
// floor: only a finalized assessment carries one, and only `evaluate()` computes
// it. Marker seals are likewise an INPUT, taken from the engine's
// exposure result; the wheel never derives a party's compellability itself.

export type WheelUnitState = 'unanswered' | 'answered' | 'dont-know' | 'na';

export type WheelUnit = {
  // `targetKey(target)` — stable across renders.
  key: string;
  target: Target;
  // Chip name: the dimension, the party, or the estate.
  label: string;
  // Second line: the stratum, the party type, or ''.
  sub: string;
  // Whether a bad answer here can floor the estate: critical dimensions, every
  // party unit, and the assessment unit — and only while the question is material.
  gates: boolean;
  state: WheelUnitState;
  seal: Seal | null;
  // An answered unit carrying an evidence note.
  evidence: boolean;
  // Placed by a group gesture — the swept share the credibility lens reports
  // . Description, never judgment: the engine scores it identically.
  swept: boolean;
  // Third parties serving this unit's dimension. Empty on party and assessment
  // units, and empty whenever no exposure edges were supplied.
  exposure: ExposureMarker[];
};

export type WheelModel = {
  units: WheelUnit[];
  // Whether this question's answers can gate the estate floor at all — the
  // per-unit `gates` also requires a critical dimension. Replaces `material`.
  gatesFloor: boolean;
  // Minimum over gating ANSWERED units. Not the estate floor — see module note.
  bindingPotential: Seal | null;
  // Don't-knows on gating units: the holes that travel with the floor
  // inseparably ("SEAL-2 · 1 unknown",).
  unknowns: number;
  // Every don't-know on this question, gating or not.
  dontKnowTotal: number;
  // Units with no record at all — a progress state, never a zero.
  open: number;
  na: number;
  placed: number;
  gating: number;
  evidenced: number;
  swept: number;
  // The answered units' authored rung points (rulebook §6).
  earned: number;
  // max(rung.points) per unit still in the denominator: answered and unanswered
  // count, don't-know and n/a are removed.
  attainable: number;
  // The widest marker stack on any unit — what the label ring must clear. A
  // don't-know takes the first slot (it sits outside the ladder, not on a rung),
  // then the served parties stack outward behind it.
  maxMarkerStack: number;
  // The widest served-party stack alone.
  maxExposure: number;
  // False when every unit would show an identical marker set: with one provider
  // serving everything the ring is noise, so hosts default to hiding it. A
  // single-unit question is always informative — there is nothing to compare.
  exposureInformative: boolean;
};

export function questionWheelModel(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  question: Question,
  exposure: ExposureEdge[] = [],
): WheelModel {
  const gatesFloor = gates(question.defaultMateriality);
  const scored = scores(question.defaultMateriality);
  const perUnit = attainablePoints(question);

  const serves = exposureReader(workbook, parties, exposure);

  const units = questionUnits(workbook, parties, answers, question).map((target): WheelUnit => {
    const answer = findAnswer(answers, question.id, target);
    let label = '';
    let sub = '';
    let critical = true;
    let markers: ExposureMarker[] = [];

    if (target.kind === 'dimension' || target.kind === 'dimension-stratum') {
      const dimension = workbook.dimensions.find((d) => d.id === target.dimension);
      label = dimension?.name ?? target.dimension;
      critical = dimension?.critical ?? false;
      sub = target.kind === 'dimension-stratum' ? target.stratum : '';
      markers = serves.forDimension(target.dimension);
    } else if (target.kind === 'party') {
      const party = parties.find((p) => p.id === target.party);
      label = party?.name ?? target.party;
      sub = workbook.parties.find((t) => t.id === party?.type)?.name ?? '';
    } else {
      label = 'Whole estate';
      sub = 'asked once';
    }

    return {
      key: targetKey(target),
      target,
      label,
      sub,
      gates: gatesFloor && critical,
      state: answer?.state ?? 'unanswered',
      seal: answer === undefined ? null : sealOfAnswer(question, answer),
      evidence: answer?.state === 'answered' && answer.evidence !== undefined,
      swept: answer?.gesture.placement === 'group',
      exposure: markers,
    };
  });

  let bindingPotential: Seal | null = null;
  let unknowns = 0;
  let dontKnowTotal = 0;
  let open = 0;
  let na = 0;
  let placed = 0;
  let gating = 0;
  let evidenced = 0;
  let swept = 0;
  let earned = 0;
  let attainable = 0;

  for (const unit of units) {
    if (unit.gates) gating += 1;
    if (unit.state === 'unanswered') {
      open += 1;
      if (scored) attainable += perUnit;
      continue;
    }
    if (unit.state === 'na') {
      na += 1;
      continue;
    }
    if (unit.state === 'dont-know') {
      dontKnowTotal += 1;
      if (unit.gates) unknowns += 1;
      continue;
    }
    placed += 1;
    if (unit.swept) swept += 1;
    if (unit.evidence) evidenced += 1;
    if (scored) {
      attainable += perUnit;
      const answer = findAnswer(answers, question.id, unit.target);
      const rung = answer?.state === 'answered' ? rungIn(question, answer.rungId) : undefined;
      earned += rung?.points ?? 0;
    }
    if (unit.gates && unit.seal !== null && (bindingPotential === null || unit.seal < bindingPotential)) {
      bindingPotential = unit.seal;
    }
  }

  return {
    units,
    gatesFloor,
    bindingPotential,
    unknowns,
    dontKnowTotal,
    open,
    na,
    placed,
    gating,
    evidenced,
    swept,
    earned,
    attainable,
    maxMarkerStack: units.reduce(
      (max, u) => Math.max(max, (u.state === 'dont-know' ? 1 : 0) + u.exposure.length),
      0,
    ),
    maxExposure: units.reduce((max, u) => (u.exposure.length > max ? u.exposure.length : max), 0),
    exposureInformative: informative(units.map((u) => u.exposure)),
  };
}

export function markerTitle(marker: ExposureMarker): string {
  return marker.seal === null
    ? `${marker.label} serves this dimension — compellability not yet answered`
    : `${marker.label} serves this dimension — compellable at SEAL-${marker.seal}`;
}

export function unitTitle(unit: WheelUnit): string {
  const name = unit.sub ? `${unit.label} · ${unit.sub}` : unit.label;
  const gate = unit.gates ? 'gates the floor' : 'scores only, never floors';
  const served =
    unit.exposure.length > 0 ? `; served by ${unit.exposure.map((m) => m.label).join(', ')}` : '';
  if (unit.state === 'answered') {
    return `${name} — SEAL-${unit.seal}, ${gate}${unit.evidence ? ', evidence recorded' : ', no evidence'}${unit.swept ? ', swept' : ''}${served}`;
  }
  if (unit.state === 'dont-know') return `${name} — don't know, ${gate}${served}`;
  if (unit.state === 'na') return `${name} — n/a, excluded${served}`;
  return `${name} — no record yet, ${gate}${served}`;
}

// The <desc> prose: what the picture says, for a screen reader.
export function wheelSummary(model: WheelModel, exposed: boolean): string {
  const undefended = model.gating - model.evidenced;
  const ring = exposed
    ? ' Markers outside the rim are the third parties serving each dimension.'
    : '';
  return (
    'Each spoke is a target unit; the radius of its dot is the SEAL rung placed on it. ' +
    `${model.open} unit${model.open === 1 ? '' : 's'} with no record, ` +
    `${model.unknowns} unknown${model.unknowns === 1 ? '' : 's'} on a gating unit, ` +
    `${undefended} gating answer${undefended === 1 ? '' : 's'} without evidence.${ring}`
  );
}

// True when this unit's dot sits on the question's binding rung and the host
// asked for the binding ring.
export function isBinding(model: WheelModel, unit: WheelUnit, showBinding: boolean): boolean {
  return (
    showBinding &&
    unit.gates &&
    unit.seal !== null &&
    model.bindingPotential !== null &&
    unit.seal === model.bindingPotential
  );
}
