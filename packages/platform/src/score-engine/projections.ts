// Declared facts and the derived maps, projected from the workbook, the roster
// and the gating set — so no view recomputes scope.
import type { Answer, Landing, Party, Seal, Workbook } from '../schema';
import type { Scope } from './scope';
import type {
  Credibility,
  DeclaredDimension,
  DeclaredParty,
  ExposureEdge,
  StaircaseBinding,
  StaircaseStep,
} from './types';

export function declaredDimensionsOf(workbook: Workbook, scope: Scope): DeclaredDimension[] {
  return workbook.dimensions
    .filter((d) => scope.dimensions.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, critical: scope.critical.has(d.id) }));
}

export function declaredPartiesOf(parties: Party[], scope: Scope): DeclaredParty[] {
  return parties.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    kind: scope.partyKindOf(p.type),
    serves: p.serves.filter((d) => scope.dimensions.has(d)), // only declared dims are real edges
  }));
}

// One edge per (declared THIRD-PARTY, served declared dimension). The colour is
// the party's worst party-axis seal — one compellability fact repeated over its
// served columns, NEVER written into heatmap[].
export function exposureOf(
  parties: DeclaredParty[],
  gating: StaircaseBinding[],
): ExposureEdge[] {
  const worst = new Map<string, Seal>();
  for (const b of gating) {
    if (b.party === null) continue;
    const prev = worst.get(b.party);
    if (prev === undefined || b.seal < prev) worst.set(b.party, b.seal);
  }
  return parties
    .filter((p) => p.kind === 'third-party')
    .flatMap((p) =>
      p.serves.map((dimension) => ({
        party: p.id,
        dimension,
        worstSeal: worst.get(p.id) ?? null,
      })),
    );
}

// The binding-constraint climb: each distinct gating level below SEAL-4 is a rung
// — the answers pinned there and the floor lifting them all would unlock.
export function staircaseOf(gating: StaircaseBinding[]): StaircaseStep[] {
  const levels = [...new Set(gating.map((b) => b.seal))].sort((a, b) => a - b);
  return levels
    .filter((level) => level < 4)
    .map((level) => ({
      floor: level,
      unlocksTo: levels.find((s) => s > level) ?? null,
      binding: gating.filter((b) => b.seal === level),
    }));
}

// How the file was produced (invariant #4 — none of it moves a score): the
// group-placed share of in-scope answered answers (null, never NaN, when none
// are), the don't-know grand total, and evidence presence over the gating set.
export function credibilityOf(
  answers: Answer[],
  ledger: Landing[],
  gating: StaircaseBinding[],
  scope: Scope,
): Credibility {
  const inScopeAnswered = answers.filter((a) => a.state === 'answered' && scope.inScope(a));
  return {
    sweptRatio:
      inScopeAnswered.length === 0
        ? null
        : inScopeAnswered.filter((a) => a.gesture.placement === 'group').length /
          inScopeAnswered.length,
    dontKnowCount: answers.filter((a) => a.state === 'dont-know' && scope.inScope(a)).length,
    evidenceCoverage: {
      evidenced: gating.filter((b) => b.evidence !== null).length,
      total: gating.length,
    },
    ledger,
  };
}
