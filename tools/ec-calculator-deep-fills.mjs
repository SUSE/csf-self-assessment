// A ONE-OFF generator: it turns samples/eu-csf-calculator-deep-workbook.json
// into the two committed participant fills over it. No spreadsheet is read here.
// Run as `node tools/ec-calculator-deep-fills.mjs` from the repo root.
//
// The flat fills next door (tools/ec-calculator-fills.mjs) differ in four
// answers on a 48-unit instrument, which is all a grain-free workbook can show.
// The deep workbook has dimensions, strata and a chain of parties, so this pair
// exercises the whole merge surface instead: all four clash classes, units only
// one participant reached, and two names for one real party.
//
// Alex is the broad first pass; Jane is a scoped second pass by the person who
// actually runs security and looked closer at compute. Every difference between
// them is declared in a table below, so the demo explains itself.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Repo-relative input: the committed deep workbook. */
export const WORKBOOK_PATH = 'samples/eu-csf-calculator-deep-workbook.json';

/** Repo-relative outputs, in this order. */
export const ALEX_PATH = 'samples/eu-csf-calculator-deep-fill-alex.json';
export const JANE_PATH = 'samples/eu-csf-calculator-deep-fill-jane.json';

/** The lineage both fills share. Frozen literals — a checked-in fixture never
 *  reads the clock. */
export const WORKBOOK_ASSESSMENT_ID = 'wa-deep-2026-08-16T00:00:00.000Z';
export const ESTATE = 'EC calculator deep-analysis demo estate';

/** The only party the facilitator seeds: the assessed organisation. Everyone on
 *  the supply chain arrives through a participant's `partiesAdded`, which is
 *  what puts two names for one provider in front of the merge. */
export const SEEDED_PARTY = {
  id: 'us',
  name: 'The assessed organisation',
  type: 'assessed-organisation',
  serves: [],
};

const REPO_ROOT = new URL('../', import.meta.url);

const STACK = ['compute', 'storage', 'network', 'iam', 'platform', 'security', 'software-supply', 'edge'];

/** Alex walked the whole chain as procurement described it. */
export const ALEX_PARTIES_ADDED = [
  { id: 'helios-cloud', name: 'Helios Cloud EU', type: 'contractor', serves: STACK },
  { id: 'secops-eu', name: 'SecOps Europe', type: 'sub-contractor', serves: ['security'] },
  {
    id: 'siliconware',
    name: 'SiliconWare Corp.',
    type: 'supplier',
    serves: ['compute', 'storage', 'network'],
  },
];

/** Jane names the same sub-contractor by the same id, the same provider by a
 *  DIFFERENT id — the party collision the facilitator has to absorb — and one
 *  party Alex never had. */
export const JANE_PARTIES_ADDED = [
  {
    id: 'helios-europe',
    name: 'Helios Cloud Europe SAS',
    type: 'contractor',
    serves: ['compute', 'storage', 'network', 'iam', 'platform', 'security'],
  },
  { id: 'secops-eu', name: 'SecOps Europe', type: 'sub-contractor', serves: ['security'] },
  {
    id: 'rhine-estate',
    name: 'Rhine Datacenter Estate',
    type: 'supplier',
    serves: ['facilities'],
  },
];

/** Alex claims the room: one blanket claim over the single authored role. */
export const ALEX_CLAIMS = [{ roles: ['ALL'], dimensions: [], parties: [] }];

/** Jane claims what she owns by name, then a blanket claim behind it. The named
 *  claim wins where it covers, so her answers there land as `owner` and Alex's
 *  as `blanket` — the authority ladder, visible in the merge queue. */
export const JANE_CLAIMS = [
  {
    roles: ['ALL'],
    dimensions: ['security', 'iam', 'compute'],
    parties: ['secops-eu', 'helios-europe', 'rhine-estate'],
  },
  { roles: ['ALL'], dimensions: [], parties: [] },
];

/** The dimensions Jane looked at. Everything else she left to Alex. */
export const JANE_DIMENSIONS = ['compute', 'storage', 'network', 'iam', 'security', 'facilities'];

/** The estate-wide questions Jane also answered. The other twelve she skipped. */
export const JANE_ASSESSMENT_QUESTIONS = [
  'SOV-1.3',
  'SOV-2.5',
  'SOV-3.5',
  'SOV-4.3',
  'SOV-5.7',
  'SOV-6.2',
  'SOV-7.3',
  'SOV-7.4',
];

/** The assessed organisation is not its own third party: the entity questions
 *  ask about the chain, so both participants mark `us` out of scope, the same
 *  way and for the same reason. It lands as agreement, not a clash. */
export const SELF_NA_REASON =
  'The assessed organisation itself — the entity questions target its contractors, sub-contractors and suppliers.';

/** GRAIN CLASH. Alex answered compute as one block; Jane split it into the four
 *  layer boxes the diagram draws inside it, and the split is the whole point:
 *  a sovereign service standing on foreign silicon. The facilitator keeps the
 *  roll-up or keeps the strata — the one decision a rung cannot express. */
export const JANE_COMPUTE_STRATA = {
  questionId: 'SOV-4.2',
  dimension: 'compute',
  rungs: {
    service: 'choice-5',
    software: 'choice-4',
    hardware: 'choice-2',
    chips: 'choice-1',
  },
};

/** DIVERGENCE. Both answered; the rungs differ. Jane runs security and has
 *  looked at the contracts, so she reads these lower than the broad pass did. */
export const JANE_DIVERGENCES = [
  { questionId: 'SOV-4.2', target: { kind: 'dimension', dimension: 'security' }, rungId: 'choice-2' },
  { questionId: 'SOV-7.6', target: { kind: 'dimension', dimension: 'security' }, rungId: 'choice-2' },
  { questionId: 'SOV-3.4', target: { kind: 'dimension', dimension: 'storage' }, rungId: 'choice-4' },
  { questionId: 'SOV-6.3', target: { kind: 'dimension', dimension: 'iam' }, rungId: 'choice-2' },
  { questionId: 'SOV-1.1', target: { kind: 'party', party: 'secops-eu' }, rungId: 'choice-2' },
  { questionId: 'SOV-2.2', target: { kind: 'party', party: 'secops-eu' }, rungId: 'choice-5' },
];

/** GAP. One side knows, the other says so. Firmware provenance is the honest
 *  don't-know of every estate that has never opened a server. */
export const JANE_GAPS = [
  { questionId: 'SOV-5.3', target: { kind: 'dimension', dimension: 'compute' } },
  { questionId: 'SOV-5.3', target: { kind: 'dimension', dimension: 'storage' } },
  { questionId: 'SOV-5.3', target: { kind: 'dimension', dimension: 'network' } },
  { questionId: 'SOV-5.1', target: { kind: 'dimension', dimension: 'facilities' } },
];

/** SCOPE. One side answered; the other says the question does not apply here.
 *  That outranks a gap: it disputes the unit, not the knowledge. */
export const JANE_SCOPE_EXCLUSIONS = [
  {
    questionId: 'SOV-5.2',
    target: { kind: 'dimension', dimension: 'facilities' },
    reason: 'The estate is leased. Manufacturing location belongs to the landlord, not this assessment.',
  },
  {
    questionId: 'SOV-3.1',
    target: { kind: 'dimension', dimension: 'network' },
    reason: 'Nothing at rest on the network layer — key control is answered at compute and storage.',
  },
];

const targetKey = (target) =>
  target.kind === 'assessment'
    ? 'assessment'
    : target.kind === 'party'
      ? `party:${target.party}`
      : target.kind === 'dimension'
        ? `dimension:${target.dimension}`
        : `stratum:${target.dimension}/${target.stratum}`;

const unitKey = (questionId, target) => `${questionId} ${targetKey(target)}`;

/** @param {object} workbook @returns {Map<string,string>} questionId → rungId,
 *  the source worked example's selections. SOV-1.6 is absent: the source leaves
 *  it blank, and neither participant invents an answer for it. */
export function baseSelections(workbook) {
  const worked = workbook.testEstates.find((e) => e.id === 'source-worked-example');
  return new Map(worked.answers.map((a) => [a.questionId, a.rungId]));
}

/** Every answer unit one participant's roster and scope reaches. */
function unitsFor(workbook, parties, { dimensions, assessmentQuestions }) {
  const units = [];
  for (const question of workbook.objectives.flatMap((o) => o.questions)) {
    if (question.grain === 'dimension') {
      for (const dimension of question.appliesTo) {
        if (dimensions && !dimensions.includes(dimension)) continue;
        units.push({ questionId: question.id, target: { kind: 'dimension', dimension } });
      }
    } else if (question.axis === 'party') {
      for (const party of parties) {
        units.push({ questionId: question.id, target: { kind: 'party', party: party.id } });
      }
    } else if (!assessmentQuestions || assessmentQuestions.includes(question.id)) {
      units.push({ questionId: question.id, target: { kind: 'assessment' } });
    }
  }
  return units;
}

function answerRow(questionId, target, value, groupId) {
  return {
    questionId,
    target,
    ...value,
    gesture: { groupId, placement: 'group' },
  };
}

function fill(workbook, name, parties, partiesAdded, claims, answers) {
  return {
    meta: {
      workbookId: workbook.meta.id,
      workbookVersion: workbook.meta.version,
      estate: ESTATE,
      workbookAssessment: WORKBOOK_ASSESSMENT_ID,
      participant: { name },
    },
    workbook,
    parties,
    claims,
    partiesAdded,
    ledger: [],
    answers,
  };
}

/** Alex: one uniformity claim per question across everything his roster reaches,
 *  at the source worked example's rung. `us` is out of scope on the entity
 *  questions. A question the source left blank is left blank. */
export function buildAlex(workbook) {
  const selections = baseSelections(workbook);
  const roster = [SEEDED_PARTY, ...ALEX_PARTIES_ADDED];
  const answers = [];
  for (const { questionId, target } of unitsFor(workbook, roster, {})) {
    const groupId = `alex:${questionId}`;
    if (target.kind === 'party' && target.party === SEEDED_PARTY.id) {
      answers.push(answerRow(questionId, target, { state: 'na', reason: SELF_NA_REASON }, groupId));
      continue;
    }
    const rungId = selections.get(questionId);
    if (rungId === undefined) continue;
    answers.push(answerRow(questionId, target, { state: 'answered', rungId }, groupId));
  }
  return fill(workbook, 'Alex', [SEEDED_PARTY], ALEX_PARTIES_ADDED, ALEX_CLAIMS, answers);
}

/** Jane: the same instrument, a narrower scope, and every declared difference
 *  applied on top. */
export function buildJane(workbook) {
  const selections = baseSelections(workbook);
  const roster = [SEEDED_PARTY, ...JANE_PARTIES_ADDED];
  const divergences = new Map(
    JANE_DIVERGENCES.map((d) => [unitKey(d.questionId, d.target), d.rungId]),
  );
  const gaps = new Set(JANE_GAPS.map((g) => unitKey(g.questionId, g.target)));
  const exclusions = new Map(
    JANE_SCOPE_EXCLUSIONS.map((s) => [unitKey(s.questionId, s.target), s.reason]),
  );
  const grainRollUp = unitKey(JANE_COMPUTE_STRATA.questionId, {
    kind: 'dimension',
    dimension: JANE_COMPUTE_STRATA.dimension,
  });

  const answers = [];
  for (const { questionId, target } of unitsFor(workbook, roster, {
    dimensions: JANE_DIMENSIONS,
    assessmentQuestions: JANE_ASSESSMENT_QUESTIONS,
  })) {
    const key = unitKey(questionId, target);
    const groupId = `jane:${questionId}`;
    if (key === grainRollUp) {
      for (const [stratum, rungId] of Object.entries(JANE_COMPUTE_STRATA.rungs)) {
        answers.push(
          answerRow(
            questionId,
            { kind: 'dimension-stratum', dimension: JANE_COMPUTE_STRATA.dimension, stratum },
            { state: 'answered', rungId },
            `${groupId}:${stratum}`,
          ),
        );
      }
      continue;
    }
    if (target.kind === 'party' && target.party === SEEDED_PARTY.id) {
      answers.push(answerRow(questionId, target, { state: 'na', reason: SELF_NA_REASON }, groupId));
      continue;
    }
    if (gaps.has(key)) {
      answers.push(answerRow(questionId, target, { state: 'dont-know' }, groupId));
      continue;
    }
    const reason = exclusions.get(key);
    if (reason !== undefined) {
      answers.push(answerRow(questionId, target, { state: 'na', reason }, groupId));
      continue;
    }
    const rungId = divergences.get(key) ?? selections.get(questionId);
    if (rungId === undefined) continue;
    answers.push(answerRow(questionId, target, { state: 'answered', rungId }, groupId));
  }
  return fill(workbook, 'Jane', [SEEDED_PARTY], JANE_PARTIES_ADDED, JANE_CLAIMS, answers);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const workbook = JSON.parse(readFileSync(new URL(WORKBOOK_PATH, REPO_ROOT), 'utf8'));
  for (const [path, build] of [
    [ALEX_PATH, buildAlex],
    [JANE_PATH, buildJane],
  ]) {
    writeFileSync(
      new URL(path, REPO_ROOT),
      `${JSON.stringify(build(workbook), null, 2)}\n`,
      'utf8',
    );
  }
}
