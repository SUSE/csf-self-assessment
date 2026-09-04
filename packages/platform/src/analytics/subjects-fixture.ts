// Test-only fixture (node: reads the repo's estate files with fs).
// Imported by platform tests ONLY — never by app or platform runtime code,
// and never re-exported from a barrel. Holds the two evaluated estates every
// analytics oracle is measured against: Alex's partial, the drivable
// two-landing union, and the workbook-assessment as distributed with nothing
// answered.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { alexRaw, janeRaw, workbookAssessmentRaw } from '../test-fixtures';
import { AssessmentSchema, WorkbookAssessmentSchema, WorkbookSchema } from '../schema';
import type {
  Assessment,
  ClashResolution,
  Party,
  PartyDecision,
  Target,
  Workbook,
} from '../schema';
import { targetKey } from '../assessment';
import { isClash } from '../merge/clash-types';
import { reviewLanding } from '../merge/review';
import { finalizeLanded, land } from '../merge/land';
import { suggest } from '../merge/suggest';
import { evaluateTestEstate } from '../author/estates';
import { evaluate } from '../score-engine';
import type { EngineResult } from '../score-engine';

const alex = AssessmentSchema.parse(alexRaw);
const WA = WorkbookAssessmentSchema.parse(workbookAssessmentRaw);
const JANE = AssessmentSchema.parse(janeRaw);

const rosterA = [...alex.parties, ...(alex.partiesAdded ?? [])];
const alexEstate = { ...alex, parties: rosterA };
const A = evaluate(alexEstate.workbook, alexEstate);

const COLLISION: PartyDecision = {
  added: 'modelhouse',
  choice: { kind: 'absorb', into: 'modelhouse', name: 'Modelhouse AI GmbH' },
  note: '',
};

const alexLanding = (() => {
  const outcome = land(
    { parties: WA.parties, answers: [] },
    [],
    alex,
    { resolutions: [], partyDecisions: [] },
    { id: '11111111-1111-4111-8111-111111111111', at: 'T1', note: '' },
  );
  if (!outcome.ok) throw new Error('Alex should land with nothing to decide');
  return outcome;
})();

const unitKey = (questionId: string, target: Target): string => `${questionId}:${targetKey(target)}`;

// The nine divergences the authority ladder cannot separate. Jane and Alex both
// answer under a blanket claim with the same evidence-presence, so `ladder`
// falls through both rungs and `suggest` returns null — correctly (merge.md
// §2.3.1, "or null on a full tie"). A facilitator resolves these by hand, so the
// fixture records the same call rather than inventing a tiebreak rule the
// product does not have: keep the answer already landed. Every note is the one a
// facilitator would leave.
//
// This is a closed list, not a fallback. An unlisted tie throws below, so a
// fixture edit that creates a new one fails loudly instead of being silently
// decided for us.
const FULL_TIES: ReadonlyMap<string, string> = new Map([
  ['SOV-1.concentration:assessment', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-3.key-custody:dimension:compute', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-3.verified-deletion:dimension:storage', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-4.eu-operations-staff:assessment', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-5.chain-visibility:assessment', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-5.hardware-provenance:dimension-stratum:compute:software', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-5.hardware-provenance:dimension:storage', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-6.licence-rights:dimension:security', 'ladder ties — kept Alex’s landed answer'],
  ['SOV-8.hardware-circularity:assessment', 'ladder ties — kept Alex’s landed answer'],
]);

const janeLanding = (() => {
  const clashes = reviewLanding(alexLanding.base, alexLanding.ledger, JANE, [COLLISION]).units.filter(isClash);
  const resolutions: ClashResolution[] = clashes.map((clash) => {
    const suggestion = suggest(clash);
    if (suggestion !== null) {
      return { questionId: clash.questionId, target: clash.target, choice: suggestion.choice, note: '' };
    }
    const key = unitKey(clash.questionId, clash.target);
    const note = FULL_TIES.get(key);
    if (note === undefined || clash.kind !== 'unit-clash') throw new Error(`unrecorded full tie: ${key}`);
    return {
      questionId: clash.questionId,
      target: clash.target,
      choice: { kind: 'take', from: clash.base.from },
      note,
    };
  });
  const decided = resolutions.filter((r) => r.note !== '').length;
  if (decided !== FULL_TIES.size) throw new Error(`expected ${FULL_TIES.size} full ties, decided ${decided}`);
  const outcome = land(
    alexLanding.base,
    alexLanding.ledger,
    JANE,
    { resolutions, partyDecisions: [COLLISION] },
    { id: '22222222-2222-4222-8222-222222222222', at: 'T2', note: '' },
  );
  if (!outcome.ok) throw new Error('the decided landing should commit');
  return outcome;
})();

const janeEstate = finalizeLanded(WA, janeLanding.base, janeLanding.ledger);
const C = evaluate(janeEstate.workbook, janeEstate);

/** One evaluated estate, in the shape every tile model takes — and the assessment
 *  it was evaluated from, which the Report needs (ADR-0019). `workbook` and
 *  `parties` are read OFF `assessment`, so the four can never drift. */
export type Subject = {
  assessment: Assessment;
  result: EngineResult;
  workbook: Workbook;
  parties: Party[];
};

/** Alex's partial, evaluated over `parties ∪ partiesAdded` (analytics §2.2). */
export const SUBJECT_A: Subject = {
  assessment: alexEstate,
  result: A,
  workbook: alexEstate.workbook,
  parties: alexEstate.parties,
};

/** The drivable two-landing estate: Alex landed, then Jane with the `modelhouse`
 *  collision absorbed, every clash the ladder can separate decided by
 *  `suggest()`, and the nine it cannot decided by the recorded facilitator call
 *  in `FULL_TIES`. */
export const SUBJECT_C: Subject = {
  assessment: janeEstate,
  result: C,
  workbook: janeEstate.workbook,
  parties: janeEstate.parties,
};

const oneEstate = finalizeLanded(WA, alexLanding.base, alexLanding.ledger);

/** Alex landed and nothing else: the facilitator's estate after ONE landing.
 *  The twin of SUBJECT_A through the merge — same answers, the workbook
 *  assessment's roster. */
export const SUBJECT_ONE: Subject = {
  assessment: oneEstate,
  result: evaluate(oneEstate.workbook, oneEstate),
  workbook: oneEstate.workbook,
  parties: oneEstate.parties,
};

const emptyEstate = finalizeLanded(WA, { parties: WA.parties, answers: [] }, []);

/** The workbook-assessment as distributed, nothing answered: 0 facts, 57 units,
 *  a roster of the assessed party alone. The oracle for every empty state. */
export const SUBJECT_EMPTY: Subject = {
  assessment: emptyEstate,
  result: evaluate(emptyEstate.workbook, emptyEstate),
  workbook: emptyEstate.workbook,
  parties: emptyEstate.parties,
};

const readSample = (file: string): unknown =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../../../samples/${file}`, import.meta.url)), 'utf8'),
  );

const ecWorkbook = WorkbookSchema.parse(readSample('eu-csf-calculator-workbook.json'));
const ecEvaluation = evaluateTestEstate(ecWorkbook, ecWorkbook.testEstates[0]);

/** The EC calculator's `source-worked-example`, evaluated: 48 answer units over a
 *  workbook that declares NO dimensions. The oracle for invariant #13. */
export const SUBJECT_NO_DIMENSIONS: Subject = {
  assessment: ecEvaluation.assessment,
  result: ecEvaluation.result,
  workbook: ecEvaluation.assessment.workbook,
  parties: ecEvaluation.assessment.parties,
};
