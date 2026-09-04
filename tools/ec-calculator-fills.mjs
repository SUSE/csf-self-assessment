// A ONE-OFF generator: it turns samples/ec-guidance-complete/workbook.json into the
// two committed participant fills over it. The .xlsx is never read here.
// Run as `node tools/ec-calculator-fills.mjs` from the repo root.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Repo-relative input: the committed EC workbook. The .xlsx is NOT read here. */
export const WORKBOOK_PATH = 'samples/ec-guidance-complete/workbook.json';

/** Repo-relative outputs, in this order. */
export const ALEX_PATH = 'samples/ec-guidance-complete/alex.json';
export const JANE_PATH = 'samples/ec-guidance-complete/jane.json';

/** The lineage both fills share (spec §9: same estate, parties, claims,
 *  workbook version and workbookAssessment id). Frozen literals — a checked-in
 *  fixture never reads the clock. */
export const WORKBOOK_ASSESSMENT_ID = 'wa-2026-08-16T00:00:00.000Z';
export const ESTATE = 'EC calculator demo estate';

/** The one concrete party. The workbook declares exactly one party type and it
 *  is `assessed`, so `partiesAdded` is necessarily empty on both fills. */
export const PARTY = {
  id: 'subject',
  name: 'Assessed organisation',
  type: 'assessed-organisation',
  serves: [],
};

/** One claim: the single authored role over everything (no dimensions exist). */
export const CLAIMS = [{ roles: ['ALL'], dimensions: [], parties: [] }];

/** The question the source leaves blank, and the synthetic answer that closes
 *  it: `choice-1` — "No clear participation", 0 points, SEAL 4 — which holds
 *  Alex at the source's own score and floor. */
export const SYNTHETIC_QUESTION_ID = 'SOV-1.6';
export const SYNTHETIC_RUNG_ID = 'choice-1';
export const SYNTHETIC_EVIDENCE =
  'The source spreadsheet leaves this blank; nothing in this estate documents participation in an EU strategic programme.';

/** Jane's four changes, keyed by question id (spec §9). Everything else is a
 *  verbatim copy of Alex. */
export const JANE_CHANGES = {
  'SOV-1.1': { state: 'answered', rungId: 'choice-3' },
  'SOV-1.2': { state: 'answered', rungId: 'choice-4' },
  'SOV-2.1': { state: 'dont-know' },
  'SOV-2.2': {
    state: 'na',
    reason:
      'Extraterritorial exposure is handled by the group legal entity, outside this estate.',
  },
};

const REPO_ROOT = new URL('../', import.meta.url);

/** @param {object} workbook the parsed EC workbook
 *  @returns {Map<string,string>} questionId → rungId: the estate's 47 source
 *  selections with SOV-1.6 filled in at SYNTHETIC_RUNG_ID. */
export function baseSelections(workbook) {
  const worked = workbook.testEstates.find((e) => e.id === 'source-worked-example');
  const selections = new Map(worked.answers.map((a) => [a.questionId, a.rungId]));
  selections.set(SYNTHETIC_QUESTION_ID, SYNTHETIC_RUNG_ID);
  return selections;
}

function answerRow(question, name, selections, change) {
  const row = {
    questionId: question.id,
    target: { kind: 'assessment' },
  };
  const state = change?.state ?? 'answered';
  if (state === 'answered') {
    row.state = 'answered';
    row.rungId = change?.rungId ?? selections.get(question.id);
  } else if (state === 'na') {
    row.state = 'na';
    row.reason = change.reason;
  } else {
    row.state = state;
  }
  if (question.id === SYNTHETIC_QUESTION_ID && state === 'answered') {
    row.evidence = SYNTHETIC_EVIDENCE;
  }
  row.gesture = {
    groupId: `${name.toLowerCase()}-${question.id}`,
    placement: 'individual',
  };
  return row;
}

/** @param {object} workbook
 *  @param {string} name participant name, 'Alex' or 'Jane'
 *  @param {Record<string, object>} changes overrides keyed by question id
 *  @returns {object} an AssessmentSchema-valid PARTIAL, ready for JSON.stringify. */
export function buildFill(workbook, name, changes) {
  const selections = baseSelections(workbook);
  const answers = workbook.objectives
    .flatMap((o) => o.questions)
    .map((question) => answerRow(question, name, selections, changes[question.id]));

  return {
    meta: {
      workbookId: workbook.meta.id,
      workbookVersion: workbook.meta.version,
      estate: ESTATE,
      workbookAssessment: WORKBOOK_ASSESSMENT_ID,
      participant: { name },
    },
    workbook,
    parties: [PARTY],
    claims: CLAIMS,
    partiesAdded: [],
    ledger: [],
    answers,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const workbook = JSON.parse(readFileSync(new URL(WORKBOOK_PATH, REPO_ROOT), 'utf8'));
  for (const [path, name, changes] of [
    [ALEX_PATH, 'Alex', {}],
    [JANE_PATH, 'Jane', JANE_CHANGES],
  ]) {
    writeFileSync(
      new URL(path, REPO_ROOT),
      `${JSON.stringify(buildFill(workbook, name, changes), null, 2)}\n`,
      'utf8',
    );
  }
}
