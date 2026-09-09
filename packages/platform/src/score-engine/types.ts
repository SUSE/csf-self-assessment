// The engine's output shapes. Every view reads these and recomputes nothing
// (analytics). Rules live in docs/csf_scoring.md and
// docs/specs/analytics.md.
import type { Landing, Materiality, PartyKind, Role, Seal, Target } from '../schema';

export type ObjectiveResult = {
  id: string;
  seal: Seal | null;
  binding: string[];
  unknowns: string[];
  score: number | null;
  // Every in-scope don't-know on this objective, regardless of materiality or
  // gating — where admitted ignorance clusters, not just the floor's holes.
  dontKnowCount: number;
};

export type OverallResult = {
  floor: Seal | null;
  binding: string[];
  unknowns: string[];
  score: number | null;
  answered: number;
  total: number;
  dontKnowCount: number;
};

export type StratumCell = {
  stratum: string;
  seal: Seal;
  provenance: 'group' | 'individual' | 'mixed';
};

// One heat-map cell: the min seal asserted for an (objective, dimension) over
// dimension-level AND stratum answers, with the gesture provenance behind it.
// Emitted only where a material fact was asserted ( — no painting).
// `strata` holds the asserted strata of a split cell in workbook order; [] when
// unsplit.
export type HeatCell = {
  objective: string;
  dimension: string;
  seal: Seal;
  provenance: 'group' | 'individual' | 'mixed';
  strata: StratumCell[];
};

// The heat map's columns: declared dimensions in workbook order.
export type DeclaredDimension = { id: string; name: string; critical: boolean };

// One answered material answer that GATES the floor — a party or assessment
// answer, or a critical-dimension one. Carries objective, role and evidence note
// so the Reader tags a rung without recomputing.
export type StaircaseBinding = {
  questionId: string;
  objectiveId: string;
  role: Role;
  dimension: string | null;
  stratum: string | null;
  party: string | null;
  seal: Seal;
  evidence: string | null;
};

// One rung of the binding-constraint climb: at `floor`, everything in `binding`
// pins the estate there; lifting them all raises the floor to `unlocksTo` (null
// when nothing else gates below the ceiling). Ascending by `floor`, always < 4.
export type StaircaseStep = {
  floor: Seal;
  unlocksTo: Seal | null;
  binding: StaircaseBinding[];
};

// An exposure-map row: `kind` is resolved from workbook.parties, never guessed
// from the id.
export type DeclaredParty = {
  id: string;
  name: string;
  type: string;
  kind: PartyKind;
  serves: string[];
};

// A declared THIRD-PARTY serving a declared dimension; the assessed party never
// produces an edge. `worstSeal` is that party's worst material
// party-axis answer — its compellability — or null when nothing is answered.
export type ExposureEdge = { party: string; dimension: string; worstSeal: Seal | null };

// Counts, not a ratio: the lens renders "3 of 12", never a percentage.
export type EvidenceCoverage = { evidenced: number; total: number };

// How the file was PRODUCED, never how it scores.
export type Credibility = {
  sweptRatio: number | null;
  dontKnowCount: number;
  evidenceCoverage: EvidenceCoverage;
  ledger: Landing[];
};

// One asserted answer flattened to the facets a heat axis groups by.
export type HeatFact = {
  objective: string;
  questionId: string;
  role: Role;
  target: Target;
  dimension: string | null;
  stratum: string | null;
  party: string | null;
  state: 'answered' | 'dont-know' | 'na';
  seal: Seal | null;
  // The question's authored materiality, carried so a reader asks `gates()` or
  // `scores()` and never re-derives the distinction. Replaces `material`.
  materiality: Materiality;
  swept: boolean;
  evidence: boolean;
};

// Unit-grain coverage — the ONLY coverage a view may read; `overall.answered`
// is per QUESTION and is banned from views (analytics).
export type UnitCoverage = {
  total: number;
  answered: number;
  dontKnow: number;
  na: number;
  unanswered: number;
};

// An in-scope unit with no recorded answer of any state.
export type OpenUnit = {
  questionId: string;
  objectiveId: string;
  role: Role;
  target: Target;
  materiality: Materiality;
};

// A unit that WOULD gate the floor but was answered don't-know — the floor's own
// hole. `overall.unknowns` is this set deduped to question ids.
export type FloorHole = {
  questionId: string;
  objectiveId: string;
  role: Role;
  target: Target;
};

export type EngineResult = {
  overall: OverallResult;
  objectives: ObjectiveResult[];
  heatmap: HeatCell[];
  declaredDimensions: DeclaredDimension[];
  declaredParties: DeclaredParty[];
  staircase: StaircaseStep[];
  // Every gating answer, flat, in walk order. `staircase` drops the SEAL-4 rungs
  // (they constrain nothing), so a view wanting all of them reads this.
  gating: StaircaseBinding[];
  floorHoles: FloorHole[];
  exposure: ExposureEdge[];
  credibility: Credibility;
  facts: HeatFact[];
  units: UnitCoverage;
  openUnits: OpenUnit[];
};
