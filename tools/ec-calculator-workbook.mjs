// A ONE-OFF conversion script: it turns docs/eu-csf/calculator.xlsx into
// samples/ec-guidance-complete/workbook.json, which is committed and is what the
// product loads. The product never parses a spreadsheet , and
// docs/eu-csf/calculator.xlsx is read-only (it is never written by this tool).
// Run as `node tools/ec-calculator-workbook.mjs` from the repo root.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { extractSource } from './ec-calculator-source.mjs';

// The five questions that score but never gate.
export const RANKING_QUESTION_IDS = ['SOV-3.5', 'SOV-5.1', 'SOV-5.2', 'SOV-5.3', 'SOV-6.5'];

// Repo-relative output path.
export const OUTPUT_PATH = 'samples/ec-guidance-complete/workbook.json';

const SOURCE_PATH = 'docs/eu-csf/calculator.xlsx';
const SEAL_SOURCE_PATH = 'samples/csf-workbook.json';

const REPO_ROOT = new URL('../', import.meta.url);

const META = {
  id: 'eu-csf-calculator',
  version: '1.0.0',
  title: 'EU Cloud Sovereignty Framework — Sovereignty Calculator',
};

const ROLES = [
  {
    id: 'ALL',
    name: 'Assessment team',
    description:
      'The whole room. The source calculator splits its questions across no roles, so one role carries all 48.',
  },
];

const PARTY_TYPES = [
  {
    id: 'assessed-organisation',
    name: 'Assessed organisation',
    kind: 'assessed',
    description:
      'The organisation the calculator is filled in about. The source names no supply-chain parties, so the taxonomy has exactly one type.',
  },
];

const FRONT_SHEET = [
  'Please note: column E "score" has been filled with fictitious values that do not refer to any specific example for the sole purpose of exemplification. — the source calculator\'s own note. The estate named "Source worked example" reproduces those fictitious selections, so it demonstrates the instrument and measures nobody.',
  'Seven rows of the source carry a SEAL tag with no readable text (rows 7, 17, 31, 33, 38, 48, 49). A choice nobody can read is not a choice, so they are not imported: 233 rungs, not 240. Nothing else was changed, repaired or reworded.',
  'Five questions — SOV-3.5, SOV-5.1, SOV-5.2, SOV-5.3 and SOV-6.5 — score but never gate. That is the source\'s own published remedy (Implementation Guidance, Lessons learnt, p13): "The level SEAL-4 … is not achievable today in the context of EU Sovereignty considering existing dependencies to specific supply chains (chips, hardware). Relaxing level SEAL-4, at least temporarily, would allow to make more difference between providers." The rungs keep their honest SEAL tags; the five questions simply stop feeding the floor.',
];

const SOURCE_ESTATE_DESCRIPTION =
  'The 47 selections the source spreadsheet ships in column E, reproduced rung for rung. SOV-1.6 is left unanswered because the source leaves it blank. The source itself calls these values fictitious, so this estate demonstrates the instrument and measures nobody.';

const CEILING_ESTATE_DESCRIPTION =
  'A ceiling probe, not a claim about any vendor: a hypothetical fully-European provider that takes the top rung everywhere except the five silicon questions, where it takes choice-4, the second-from-top rung. It exists to answer one question — is SEAL-4 reachable at all?';

// SEAL is our gating vocabulary, not the source's: the levels are copied from
// samples/csf-workbook.json so the two can never drift.
function sealLevels() {
  return JSON.parse(readFileSync(new URL(SEAL_SOURCE_PATH, REPO_ROOT), 'utf8')).sealLevels;
}

function buildQuestion(question) {
  return {
    id: question.id,
    grain: 'party',
    axis: 'assessment',
    text: question.text,
    ...(question.why === null ? {} : { why: question.why }),
    role: ROLES[0].id,
    defaultMateriality: RANKING_QUESTION_IDS.includes(question.id) ? 'ranking' : 'material',
    ladder: question.rungs.map((rung, index) => ({
      id: `choice-${index + 1}`,
      description: rung.text,
      points: rung.points,
      seal: rung.seal,
    })),
  };
}

function estate(id, name, description, answers) {
  return {
    id,
    name,
    description,
    parties: [{ id: 'subject', name, type: PARTY_TYPES[0].id, serves: [] }],
    answers,
  };
}

// @returns {object} the workbook, ready for JSON.stringify — WorkbookSchema-valid.
export function buildWorkbook(source) {
  const objectives = source.objectives.map((objective) => ({
    id: objective.id,
    name: objective.name,
    description: objective.description,
    weight: objective.weight,
    questions: objective.questions.map(buildQuestion),
  }));

  const sourceQuestions = source.objectives.flatMap((o) => o.questions);

  const worked = estate(
    'source-worked-example',
    'Source worked example',
    SOURCE_ESTATE_DESCRIPTION,
    sourceQuestions.flatMap((question) => {
      const index = question.rungs.findIndex((rung) => rung.selected);
      return index < 0 ? [] : [{ questionId: question.id, rungId: `choice-${index + 1}` }];
    }),
  );
  const ceiling = estate(
    'best-available-today',
    'Best available today',
    CEILING_ESTATE_DESCRIPTION,
    sourceQuestions.map((question) => ({
      questionId: question.id,
      rungId: RANKING_QUESTION_IDS.includes(question.id)
        ? 'choice-4'
        : `choice-${question.rungs.length}`,
    })),
  );

  return {
    meta: META,
    frontSheet: FRONT_SHEET,
    sealLevels: sealLevels(),
    dimensions: [],
    roles: ROLES,
    parties: PARTY_TYPES,
    objectives,
    testEstates: [worked, ceiling],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const workbook = buildWorkbook(extractSource(fileURLToPath(new URL(SOURCE_PATH, REPO_ROOT))));
  writeFileSync(
    new URL(OUTPUT_PATH, REPO_ROOT),
    `${JSON.stringify(workbook, null, 2)}\n`,
    'utf8',
  );
}
