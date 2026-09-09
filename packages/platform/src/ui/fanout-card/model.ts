import type { Answer, Question, Seal, Target } from '../../schema';
import { findAnswer, sealOfAnswer, targetKey } from '../../assessment';
import type { OffKind } from '../off-ladder/types';
import type {
  AnsweredGroup,
  Chip,
  FanoutUnit,
  NaGroup,
  RenderGroup,
  TrayCopy,
  UnitNoun,
} from './types';

// Everything the fan-out card DERIVES from what it is handed — the chips, the
// bins they rest in, the tray copy, and the last-group readings the qualify
// column needs. Pure and grain-agnostic, like the card itself: plain `Map`, no
// reactivity, so the same reading is testable without mounting a component.

// A unit shows as split when the user peeled it (splitIntents) OR it already
// carries a stratum answer — the same union splitDimensionsOf derives from the
// answers, generalised so the card never reaches for a grain-specific helper.
function isSplit(
  unit: FanoutUnit,
  question: Question,
  answers: readonly Answer[],
  splitIntents: readonly string[],
): boolean {
  return (
    splitIntents.includes(unit.key) ||
    (unit.strata ?? []).some((s) => findAnswer([...answers], question.id, s.target) !== undefined)
  );
}

export function chipsFor(
  question: Question,
  units: readonly FanoutUnit[],
  answers: readonly Answer[],
  splitIntents: readonly string[],
): Chip[] {
  return units.flatMap((u): Chip[] => {
    const strata = u.strata ?? [];
    return isSplit(u, question, answers, splitIntents) && strata.length > 0
      ? strata.map((s) => ({ key: s.key, unitKey: u.key, label: s.label, short: s.short, critical: u.critical, splittable: true, isStratum: true, target: s.target, answer: findAnswer([...answers], question.id, s.target) }))
      : [{ key: u.key, unitKey: u.key, label: u.label, short: u.label, critical: u.critical, splittable: strata.length > 0, isStratum: false, target: u.target, answer: findAnswer([...answers], question.id, u.target) }];
  });
}

// Tray = truly unplaced only; answered chips rest on rungs, n/a & don't-know
// chips rest in their off-ladder rows.
export function unplaced(chips: readonly Chip[]): Chip[] {
  return chips.filter((c) => c.answer === undefined);
}

// Resolved = every unit DEALT WITH (on a rung, don't-know, or n/a).
export function resolvedCount(chips: readonly Chip[]): number {
  return chips.filter((c) => c.answer !== undefined).length;
}

export function restingOnRung(chips: readonly Chip[], rungId: string): Chip[] {
  return chips.filter((c) => c.answer?.state === 'answered' && c.answer.rungId === rungId);
}

export function restingOff(chips: readonly Chip[], kind: OffKind): Chip[] {
  return chips.filter((c) => c.answer?.state === kind);
}

export function trayCopy(active: Chip | null, toPlace: number, noun: UnitNoun): TrayCopy {
  return {
    title:
      active !== null
        ? `${active.label} selected`
        : `${toPlace} ${toPlace === 1 ? noun.one : noun.many} to place`,
    hint:
      active !== null
        ? 'Tap a rung or an off-ladder row — or just drag it there.'
        : 'Drag each onto a rung, or onto Nobody knows / Doesn’t apply.',
  };
}

export function lastAnsweredGroup(q: Question, answers: readonly Answer[]): AnsweredGroup | null {
  let max = -1;
  let id: string | null = null;
  let seal: Seal | null = null;
  for (const a of answers) {
    if (a.questionId !== q.id || a.state !== 'answered') continue;
    const m = /^g(\d+)$/.exec(a.gesture.groupId);
    const n = m ? Number(m[1]) : -1;
    if (n > max) {
      max = n;
      id = a.gesture.groupId;
      seal = sealOfAnswer(q, a);
    }
  }
  return id === null || seal === null ? null : { groupId: id, seal };
}

export function evidenceIn(q: Question, answers: readonly Answer[], groupId: string): string {
  for (const a of answers) {
    if (a.questionId !== q.id || a.gesture.groupId !== groupId || a.state !== 'answered') continue;
    return a.evidence ?? '';
  }
  return '';
}

export function lastNaGroup(
  q: Question,
  answers: readonly Answer[],
  chips: readonly Chip[],
): NaGroup | null {
  let max = -1;
  let id: string | null = null;
  let reason = '';
  let target: Target | null = null;
  for (const a of answers) {
    if (a.questionId !== q.id || a.state !== 'na') continue;
    const m = /^g(\d+)$/.exec(a.gesture.groupId);
    const n = m ? Number(m[1]) : -1;
    if (n > max) {
      max = n;
      id = a.gesture.groupId;
      reason = a.reason ?? '';
      target = a.target;
    }
  }
  if (id === null) return null;
  const key = target !== null ? targetKey(target) : null;
  const label = key === null ? '' : chips.find((c) => targetKey(c.target) === key)?.label ?? '';
  return { groupId: id, reason, label };
}

// Group a bin's chips by parent dimension: a split dimension becomes ONE segmented
// pill (the strata that landed HERE, with a k/all fraction on a rung fragment);
// everything else stays a plain chip. Preserves units order (chips derive in it).
export function renderGroups(
  bin: readonly Chip[],
  allChips: readonly Chip[],
  units: readonly FanoutUnit[],
  fragment: boolean,
): RenderGroup[] {
  const byUnit = new Map<string, Chip[]>();
  for (const c of bin) byUnit.set(c.unitKey, [...(byUnit.get(c.unitKey) ?? []), c]);
  const out: RenderGroup[] = [];
  for (const [unitKey, cs] of byUnit) {
    const head = cs[0];
    if (head === undefined) continue;
    if (head.isStratum) {
      const total = allChips.filter((c) => c.unitKey === unitKey).length;
      out.push({ grouped: true, unitKey, name: units.find((u) => u.key === unitKey)?.label ?? unitKey, critical: head.critical, fraction: fragment ? `${cs.length}/${total}` : null, segs: cs });
    } else {
      out.push({ grouped: false, chip: head, strataCount: units.find((u) => u.key === unitKey)?.strata?.length ?? 0 });
    }
  }
  return out;
}
