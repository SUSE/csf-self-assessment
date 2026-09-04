// A ONE-OFF generator: it turns samples/ec-guidance-complete/workbook.json — the
// faithful import, which must stay grain-free — into the DEEP-ANALYSIS variant
// described by the Implementation Guidance, "Depth of analysis" (p12-13). The
// .xlsx is never read here, and the faithful import is never written.
// Run as `node tools/ec-calculator-deep-workbook.mjs` from the repo root.
//
// The guidance asks its questions across "all sovereignty dimensions" AND "all
// the technical layers", and forbids the evaluation stopping "at the level of
// the legal entity which applied to the tender". This file is that instruction
// applied to the imported instrument: the same 48 questions and the same 233
// rungs, re-grained onto the two fan-out axes the model already has.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Repo-relative input: the committed faithful import. Never written here. */
export const WORKBOOK_PATH = 'samples/ec-guidance-complete/workbook.json';

/** Repo-relative output. */
export const OUTPUT_PATH = 'samples/ec-guidance-deep-analysis/workbook.json';

const REPO_ROOT = new URL('../', import.meta.url);

const META = {
  id: 'eu-csf-calculator-deep',
  version: '1.0.0',
  title: 'EU Cloud Sovereignty Framework — Sovereignty Calculator (deep analysis)',
};

// The nine blocks of the guidance's technical-dimensions diagram (p12), each
// carrying the layer boxes drawn inside it. `critical` is the guidance's own
// foundation list: "compute, storage, network, security, IAM and critical PaaS
// services" — the rest are in scope and score, but never gate the floor.
const DIMENSIONS = [
  { id: 'compute', name: 'Compute', strata: ['service', 'software', 'hardware', 'chips'], critical: true },
  { id: 'storage', name: 'Storage', strata: ['service', 'software', 'hardware', 'chips'], critical: true },
  { id: 'network', name: 'Network', strata: ['service', 'software', 'hardware', 'chips'], critical: true },
  { id: 'iam', name: 'IAM', strata: ['identity', 'access'], critical: true },
  { id: 'platform', name: 'Platform (Containers, PaaS)', strata: ['service', 'software'], critical: true },
  {
    id: 'security',
    name: 'Security',
    strata: ['siem-service', 'siem-software', 'threat', 'xdr-edr'],
    critical: true,
  },
  {
    id: 'software-supply',
    name: 'Software supply (Development)',
    strata: ['service', 'software'],
    critical: false,
  },
  { id: 'edge', name: 'Edge (Advanced: DDoS, CDN)', strata: ['ddos', 'cdn'], critical: false },
  { id: 'facilities', name: 'Facilities (Power, Estate)', strata: ['power', 'cooling', 'building'], critical: false },
];

const ALL = DIMENSIONS.map((d) => d.id);
/** Everything but the physical estate — the layers software and services run on. */
const STACK = ALL.filter((id) => id !== 'facilities');
/** Where the estate's data rests, moves or is decided about. */
const DATA = ['compute', 'storage', 'network', 'iam', 'platform', 'security'];
/** The blocks the diagram draws physical parts inside. */
const PHYSICAL = ['compute', 'storage', 'network', 'facilities'];
/** The three blocks with a Chips box. */
const SILICON = ['compute', 'storage', 'network'];

// The chain the guidance names: the entity that signed, everyone under it, and
// the suppliers behind them (footnotes 1 and 2, p13).
const PARTY_TYPES = [
  {
    id: 'assessed-organisation',
    name: 'Assessed organisation',
    kind: 'assessed',
    description:
      'The organisation the calculator is filled in about. Deep analysis starts here and does not stop here.',
  },
  {
    id: 'contractor',
    name: 'Contractor',
    kind: 'third-party',
    description: 'The legal entity that signed the contract — the one the guidance says the evaluation must not stop at.',
  },
  {
    id: 'sub-contractor',
    name: 'Sub-contractor',
    kind: 'third-party',
    description: 'A legal entity involved in the delivery of the contract (guidance footnote 1).',
  },
  {
    id: 'supplier',
    name: 'Supplier',
    kind: 'third-party',
    description:
      'A legal entity that delivers hardware or software but never reaches the infrastructure unsupervised (guidance footnote 2).',
  },
];

const ROLES = [
  {
    id: 'ALL',
    name: 'Assessment team',
    description:
      'The whole room. The source calculator splits its questions across no roles, so one role carries all 48 here too.',
  },
];

/** The 9 questions the guidance asks of the legal entities themselves, "covering
 *  most of the strategic and jurisdictional dimensions" (p13). Each is asked
 *  once per party on the chain, not once for the estate. */
export const ENTITY_QUESTION_IDS = [
  'SOV-1.1', // EU/EEA legal entity control
  'SOV-1.2', // Change of control risk
  'SOV-1.4', // Financial independence from non-EU capital
  'SOV-1.5', // EU economic contribution
  'SOV-2.1', // Primary legal jurisdiction
  'SOV-2.2', // Extraterritorial laws
  'SOV-2.3', // Data access pathways
  'SOV-2.4', // Export control restrictions
  'SOV-2.6', // IP holder jurisdiction
];

/** The 19 questions the guidance asks "for every relevant entity involved in the
 *  technical dimensions" (p13), each mapped to the diagram blocks where it is a
 *  real question. A question absent from both tables keeps the source grain:
 *  asked once for the whole estate. */
export const DIMENSION_QUESTION_APPLIES_TO = {
  'SOV-1.8': ALL, // Resilience to cut-off
  'SOV-3.1': DATA, // Customer control over encryption keys
  'SOV-3.2': DATA, // Transparent data flows & access logs
  'SOV-3.3': DATA, // Secure deletion & proof of erasure
  'SOV-3.4': DATA, // Data location strictly in EU/EEA
  'SOV-4.1': STACK, // Portability & interoperability
  'SOV-4.2': ALL, // Ability to operate without foreign dependencies
  'SOV-4.4': ALL, // Support channels
  'SOV-4.5': ALL, // Documentation & knowledge transfer
  'SOV-4.6': ALL, // Subcontractor & suppliers jurisdiction
  'SOV-5.1': PHYSICAL, // Origin of components
  'SOV-5.2': PHYSICAL, // Manufacturing location
  'SOV-5.3': SILICON, // Firmware provenance
  'SOV-5.4': STACK, // Origin of software
  'SOV-5.5': STACK, // Software packaging, distribution, updates
  'SOV-5.6': ALL, // Single point of dependency
  'SOV-6.1': STACK, // Interoperability & open interfaces
  'SOV-6.3': STACK, // Open source availability
  'SOV-7.6': ALL, // Maintenance autonomy
};

const FRONT_SHEET = [
  'This is the deep-analysis variant of the imported EC calculator. The instrument is unchanged — the same 8 objectives, the same 48 questions, the same 233 rungs, the same weights and the same five ranking questions. What changes is how often each question is asked, which is what the Implementation Guidance means by "Depth of analysis" (p12-13): the information is gathered "across all sovereignty dimensions" and "all the technical layers, to identify all the hidden dependencies and supply chain". samples/ec-guidance-complete/workbook.json remains the faithful import and is not touched.',
  'The nine dimensions are the nine blocks of the guidance\'s technical-dimensions diagram (p12), each keeping the layer boxes drawn inside it as its strata. Compute, Storage, Network, IAM, Platform and Security are marked critical — the guidance\'s own floor list, "compute, storage, network, security, IAM and critical PaaS services". Software supply (Development), Edge (Advanced) and Facilities (Power, Estate) are in scope and score, but never gate the floor.',
  'The guidance reports that its 43-question version asks 9 questions of the contractor and sub-contractor entities and 19 "for every relevant entity involved in the technical dimensions". Those two counts are published; the question-by-question split is not. This workbook applies the same counts to the imported 48: 9 questions are asked once per party on the chain, 19 once per technical dimension, and the remaining 20 keep the source grain of one answer for the whole estate. Which question sits in which set is our reading of the guidance, not an EC ruling.',
  'The chain is the guidance\'s own: "the evaluation must not stop at the level of the legal entity which applied to the tender but all its chains of sub-contractors and suppliers". Sub-contractors are legal entities involved in delivering the contract; suppliers deliver hardware or software and never reach the infrastructure unsupervised (footnotes 1 and 2, p13).',
  'Please note: column E "score" has been filled with fictitious values that do not refer to any specific example for the sole purpose of exemplification. — the source calculator\'s own note. The estate named "Source worked example" reproduces those fictitious selections, so it demonstrates the instrument and measures nobody.',
  'Seven rows of the source carry a SEAL tag with no readable text (rows 7, 17, 31, 33, 38, 48, 49). A choice nobody can read is not a choice, so they are not imported: 233 rungs, not 240. Nothing else was changed, repaired or reworded.',
  'Five questions — SOV-3.5, SOV-5.1, SOV-5.2, SOV-5.3 and SOV-6.5 — score but never gate. That is the source\'s own published remedy (Implementation Guidance, Lessons learnt, p13): "The level SEAL-4 … is not achievable today in the context of EU Sovereignty considering existing dependencies to specific supply chains (chips, hardware). Relaxing level SEAL-4, at least temporarily, would allow to make more difference between providers." Under deep analysis three of the five now land per dimension, which is where the chips and hardware dependency actually lives.',
];

const WORKED_ESTATE_DESCRIPTION =
  'The same 47 fictitious selections the source spreadsheet ships, now spread across the chain and the nine dimensions. Every answer is one uniformity claim — the source made its selections about a single provider, so the deep grain repeats them rather than inventing per-layer truth. SOV-1.6 is left unanswered because the source leaves it blank. It demonstrates the instrument and measures nobody.';

const CEILING_ESTATE_DESCRIPTION =
  'A ceiling probe, not a claim about any vendor: a hypothetical fully-European chain that takes the top rung everywhere except the five silicon questions, where it takes choice-4, the second-from-top rung. It exists to answer one question — is SEAL-4 reachable once every layer and every entity is asked?';

/** The chain both estates carry: who serves which diagram block. */
const CHAIN = [
  { id: 'us', name: 'The assessed organisation', type: 'assessed-organisation', serves: [] },
  { id: 'contractor', name: 'The contracting provider', type: 'contractor', serves: STACK },
  { id: 'secops', name: 'Managed security sub-contractor', type: 'sub-contractor', serves: ['security'] },
  { id: 'hardware', name: 'Hardware supplier', type: 'supplier', serves: PHYSICAL },
];

/** Re-grains one imported question. Everything else about it is copied. */
function deepen(question) {
  const appliesTo = DIMENSION_QUESTION_APPLIES_TO[question.id];
  if (appliesTo) {
    const { axis: _axis, ...rest } = question;
    return { ...rest, grain: 'dimension', appliesTo };
  }
  return {
    ...question,
    axis: ENTITY_QUESTION_IDS.includes(question.id) ? 'party' : 'assessment',
  };
}

function estate(source, description) {
  return {
    id: source.id,
    name: source.name,
    description,
    parties: CHAIN,
    answers: source.answers,
  };
}

/** @param {object} imported the parsed faithful import
 *  @returns {object} the deep workbook, ready for JSON.stringify — WorkbookSchema-valid. */
export function buildDeepWorkbook(imported) {
  const estates = new Map(imported.testEstates.map((e) => [e.id, e]));
  return {
    meta: META,
    frontSheet: FRONT_SHEET,
    sealLevels: imported.sealLevels,
    dimensions: DIMENSIONS,
    roles: ROLES,
    parties: PARTY_TYPES,
    objectives: imported.objectives.map((objective) => ({
      ...objective,
      questions: objective.questions.map(deepen),
    })),
    testEstates: [
      estate(estates.get('source-worked-example'), WORKED_ESTATE_DESCRIPTION),
      estate(estates.get('best-available-today'), CEILING_ESTATE_DESCRIPTION),
    ],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const imported = JSON.parse(readFileSync(new URL(WORKBOOK_PATH, REPO_ROOT), 'utf8'));
  writeFileSync(
    new URL(OUTPUT_PATH, REPO_ROOT),
    `${JSON.stringify(buildDeepWorkbook(imported), null, 2)}\n`,
    'utf8',
  );
}
