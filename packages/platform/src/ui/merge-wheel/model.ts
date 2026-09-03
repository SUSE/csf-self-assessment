import type { Answer, Party, Seal, Target, Workbook } from '../../schema';
import type { ExposureEdge } from '../../score-engine';
import type { LandingClash } from '../../merge';
import { clashCandidates } from '../../merge';
import { findAnswer, questionOf, questionUnits, sealOfAnswer } from '../../assessment';
import { exposureReader, informative, type ChipKind, type ExposureMarker } from '../wheel';

// The pure model behind MergeWheel (delivery §4.3). The facilitator's view of one
// estate, in the same grammar as QuestionWheel: the estate's CHIPS are the spokes.
// Dimension chips take the right arc, party chips the left, and the single
// assessment chip sits at 12 o'clock on the divider — the two chip families are
// disjoint fan-out axes and are drawn as such, so nothing implies a dimension ×
// party cell that no answer can ever occupy.
//
// Two readings share the layout:
//   coverage — how much of each chip is dealt with, split covered /
//              claimed-incomplete / unclaimed (delivery §2.3.5). Only the SCOPE LOG
//              can tell the last two apart: claimed-incomplete is a person's gap,
//              unclaimed is an estate gap. Until the scope log lands (delivery-S3)
//              pass `scope` yourself or accept the honest degraded reading below.
//   merge    — the distinct SEAL values recorded on each chip, with every
//              unresolved conflict drawn as the span between its competing rungs.
//
// This module computes NO estate truth. `floor` is an INPUT, taken from
// `evaluate()` on the finalized assessment — never derived here (invariant #3),
// and null on a working merge because only a finalized assessment carries a floor.

/** One chip's scope-log reading, supplied by the host. `covered` is derived from
 * the answers, so only the split of what is left needs to come from outside. */
export type ChipScope = {
  kind: ChipKind;
  key: string;
  claimedIncomplete: number;
};

export type ChipConflict = {
  questionId: string;
  target: Target;
  /** The distinct SEALs the competing partials asserted, ascending. */
  seals: Seal[];
  /** The kept SEAL once the facilitator resolves it; null while open. */
  resolved: Seal | null;
};

export type MergeChip = {
  kind: ChipKind;
  key: string;
  name: string;
  sub: string;
  /** Critical dimensions gate; every party chip and the assessment chip gate. */
  gates: boolean;
  total: number;
  /** Units carrying a record of any state — answered, don't-know or n/a. */
  covered: number;
  claimedIncomplete: number;
  unclaimed: number;
  /** Distinct SEALs recorded on this chip, ascending. */
  seals: Seal[];
  conflicts: ChipConflict[];
  /** The `serves` edges hanging off this chip, read in whichever direction the
   * chip faces: a DIMENSION chip lists the third parties standing under it,
   * coloured by their own compellability; a PARTY chip lists the dimensions it
   * reaches, with the critical ones emphasised — its blast radius. Context, never
   * units. Empty on the assessment chip and whenever no edges were supplied. */
  exposure: ExposureMarker[];
};

export type MergeWheelModel = {
  chips: MergeChip[];
  total: number;
  covered: number;
  claimedIncomplete: number;
  unclaimed: number;
  openConflicts: number;
  resolvedConflicts: number;
  /** Passed straight through from the caller; see module note. */
  floor: Seal | null;
  unknowns: number;
  /** The widest marker stack on any chip — what the label ring must clear. */
  maxExposure: number;
  /** False when every chip would show the same markers: with one provider serving
   * everything the ring is noise, so hosts default to hiding it. */
  exposureInformative: boolean;
};

export type MergeWheelInput = {
  workbook: Workbook;
  parties: Party[];
  /** The union of every accepted partial's answers so far. */
  answers: Answer[];
  /** Still-open clashes from `reviewLanding()`. */
  clashes?: LandingClash[];
  /** Clashes the facilitator has already settled, kept as ledger records. */
  resolutions?: { questionId: string; target: Target; seal: Seal }[];
  /** Per-chip scope-log reading. Omit and everything unanswered reads as
   * unclaimed — honest, because without a scope log the two are indistinguishable. */
  scope?: ChipScope[];
  /** From `evaluate()` on the finalized assessment. Null before finalize. */
  floor?: Seal | null;
  unknowns?: number;
  /** `evaluate().exposure`. Absent = no marker ring. */
  exposure?: ExposureEdge[];
};

function chipOf(target: Target): { kind: ChipKind; key: string } {
  if (target.kind === 'dimension' || target.kind === 'dimension-stratum') {
    return { kind: 'dimension', key: target.dimension };
  }
  if (target.kind === 'party') return { kind: 'party', key: target.party };
  return { kind: 'assessment', key: 'assessment' };
}

function ascending(seals: Seal[]): Seal[] {
  return [...new Set(seals)].sort((a, b) => a - b);
}

export function mergeWheelModel(input: MergeWheelInput): MergeWheelModel {
  const { workbook, parties, answers } = input;
  const clashes = input.clashes ?? [];
  const resolutions = input.resolutions ?? [];
  const scope = input.scope ?? [];

  const chips = new Map<string, MergeChip>();
  const seals = new Map<string, Seal[]>();

  function ensure(kind: ChipKind, key: string): MergeChip {
    const id = `${kind}:${key}`;
    let chip = chips.get(id);
    if (chip) return chip;

    let name = key;
    let sub = '';
    let gates = true;
    if (kind === 'dimension') {
      const dimension = workbook.dimensions.find((d) => d.id === key);
      name = dimension?.name ?? key;
      gates = dimension?.critical ?? false;
      sub = gates ? '' : 'scores, no gate';
    } else if (kind === 'party') {
      const party = parties.find((p) => p.id === key);
      name = party?.name ?? key;
      sub = workbook.parties.find((t) => t.id === party?.type)?.name ?? '';
    } else {
      name = 'Whole estate';
      sub = 'asked once';
    }

    chip = {
      kind,
      key,
      name,
      sub,
      gates,
      total: 0,
      covered: 0,
      claimedIncomplete: 0,
      unclaimed: 0,
      seals: [],
      conflicts: [],
      exposure: [],
    };
    chips.set(id, chip);
    seals.set(id, []);
    return chip;
  }

  // Every authored dimension is in scope — the workbook IS the estate (ADR-0005) —
  // so a dimension no question reaches still earns a spoke, visibly empty.
  for (const dimension of workbook.dimensions) ensure('dimension', dimension.id);
  for (const party of parties) ensure('party', party.id);

  for (const objective of workbook.objectives) {
    for (const question of objective.questions) {
      for (const target of questionUnits(workbook, parties, answers, question)) {
        const { kind, key } = chipOf(target);
        const chip = ensure(kind, key);
        chip.total += 1;
        const answer = findAnswer(answers, question.id, target);
        if (answer === undefined) continue;
        chip.covered += 1;
        if (answer.state === 'answered') {
          const seal = sealOfAnswer(question, answer);
          if (seal !== null) seals.get(`${kind}:${key}`)?.push(seal);
        }
      }
    }
  }

  function attach(questionId: string, target: Target, unitSeals: Seal[], resolved: Seal | null): void {
    const { kind, key } = chipOf(target);
    ensure(kind, key).conflicts.push({ questionId, target, seals: ascending(unitSeals), resolved });
  }

  for (const clash of clashes) {
    const clashQuestion = questionOf(workbook, clash.questionId) ?? { ladder: [] };
    const unitSeals = clashCandidates(clash)
      .map((c) => c.answer)
      .map((answer) => sealOfAnswer(clashQuestion, answer))
      .filter((seal): seal is Seal => seal !== null);
    attach(clash.questionId, clash.target, unitSeals, null);
  }
  for (const resolution of resolutions) {
    attach(resolution.questionId, resolution.target, [resolution.seal], resolution.seal);
  }

  // The `serves` edges, read in whichever direction the chip faces.
  const edges = input.exposure ?? [];
  const serves = exposureReader(workbook, parties, edges);

  const ordered = [...chips.values()];
  for (const chip of ordered) {
    chip.seals = ascending(seals.get(`${chip.kind}:${chip.key}`) ?? []);
    const claimed = scope.find((s) => s.kind === chip.kind && s.key === chip.key)?.claimedIncomplete ?? 0;
    const left = chip.total - chip.covered;
    chip.claimedIncomplete = Math.max(0, Math.min(claimed, left));
    chip.unclaimed = left - chip.claimedIncomplete;

    if (edges.length === 0) continue;
    if (chip.kind === 'dimension') {
      chip.exposure = serves.forDimension(chip.key);
    } else if (chip.kind === 'party' && serves.isThirdParty(chip.key)) {
      chip.exposure = edges
        .filter((edge) => edge.party === chip.key)
        .map((edge) => ({
          key: edge.dimension,
          label: workbook.dimensions.find((d) => d.id === edge.dimension)?.name ?? edge.dimension,
          seal: null,
          emphasis: workbook.dimensions.find((d) => d.id === edge.dimension)?.critical ?? false,
        }));
    }
  }

  const sum = (pick: (chip: MergeChip) => number): number =>
    ordered.reduce((total, chip) => total + pick(chip), 0);

  return {
    chips: ordered,
    total: sum((c) => c.total),
    covered: sum((c) => c.covered),
    claimedIncomplete: sum((c) => c.claimedIncomplete),
    unclaimed: sum((c) => c.unclaimed),
    openConflicts: clashes.length,
    resolvedConflicts: resolutions.length,
    floor: input.floor ?? null,
    unknowns: input.unknowns ?? 0,
    maxExposure: ordered.reduce((max, c) => (c.exposure.length > max ? c.exposure.length : max), 0),
    exposureInformative: informative(ordered.map((c) => c.exposure)),
  };
}

export function markerTitle(chip: MergeChip, marker: ExposureMarker): string {
  if (chip.kind === 'party') {
    return `${chip.name} reaches ${marker.label}${marker.emphasis ? ' — a critical dimension' : ''}`;
  }
  return marker.seal === null
    ? `${marker.label} serves ${chip.name} — compellability not yet answered`
    : `${marker.label} serves ${chip.name} — compellable at SEAL-${marker.seal}`;
}

export function chipTitle(chip: MergeChip): string {
  const open = chip.conflicts.filter((c) => c.resolved === null).length;
  const gate = chip.gates ? 'gates the floor' : 'scores only, never floors';
  const reach =
    chip.exposure.length === 0
      ? ''
      : chip.kind === 'party'
        ? `; reaches ${chip.exposure.length} dimension${chip.exposure.length === 1 ? '' : 's'}`
        : `; served by ${chip.exposure.map((m) => m.label).join(', ')}`;
  return `${chip.name} — ${chip.covered} of ${chip.total} covered, ${chip.claimedIncomplete} claimed-incomplete, ${chip.unclaimed} unclaimed, ${open} open conflict${open === 1 ? '' : 's'}, ${gate}${reach}`;
}

/** Where `count` of `total` reaches between hub and rim; the hub when total is 0. */
export function coverageRadius(hub: number, rim: number, total: number, count: number): number {
  return total === 0 ? hub : hub + (rim - hub) * (count / total);
}
