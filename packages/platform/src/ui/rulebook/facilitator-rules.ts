import type { RuleSection } from './content';

// The FACILITATOR's rule set — what someone running the room needs to know. They
// author nothing and answer nothing: they import an instrument, seed the estate,
// hand it out, and then decide what lands. So the cards that matter are about
// CONSEQUENCE (what a seeding choice does to the reading, what a resolution
// commits) rather than about how a rung should be worded.

// Sourced from the authoring rulebook §3.7, §4.1–4.2 and §6, the spec,
// and the merge spec's non-negotiable invariants.

// STARTER SET. It covers the sections where the facilitator ACTS. the inspection
// sections they only read (front sheet, objectives, roles) have no card yet and
// correctly grey out in help mode until one is written.

export const FACILITATOR_RULES: RuleSection[] = [
  {
    id: 'overview',
    tag: '§ 3.7',
    eyebrow: 'The instrument',
    title: 'The workbook is the estate',
    paras: [
      'One imported file is the whole instrument: the SEAL scale, the dimensions, the roles, the party types, the objectives and every question. What this assessment covers is already fixed — there is no scope wizard, no per-session dimension list, and nothing you can narrow here.',
      'Fitting the instrument to one department is a re-authored workbook version, not a narrowing at setup. If the shape is wrong for the room, the answer is a different workbook, and it goes back to whoever authored it.',
    ],
  },
  {
    id: 'dimensions',
    tag: '§ 4.1',
    eyebrow: 'Scope & criticality',
    title: 'Critical is the gate’s reach',
    paras: [
      'Every dimension in the workbook is in scope, and criticality is an authored flag you are reading, not choosing. The floor reads material party answers plus material dimension answers on CRITICAL dimensions only; the score sweeps every material answer, critical or not.',
      'That is why the two outputs disagree in a useful way: a non-critical weakness moves the score and leaves the floor alone, and a single critical SEAL-0 floors an otherwise strong estate.',
    ],
  },
  {
    id: 'party-types',
    tag: '§ 4.2',
    eyebrow: 'Party types',
    title: 'The taxonomy, not the roster',
    paras: [
      'Party types are workbook content — institution, service provider, subcontractor, supplier — and each carries a kind of either assessed or third-party. That kind is the one property the engine reads to tell the assessed "us" from the compellable supply chain; it is never inferred from an id or a name.',
      'Exactly one type is the assessed one. The concrete parties you seed at setup each point at one of these types.',
    ],
  },
  {
    id: 'parties',
    tag: '§ 4.2',
    eyebrow: 'Concrete parties',
    title: 'Seeded by you, added by them',
    paras: [
      'Concrete parties are this estate’s fact: a name, a type, and the dimensions that party serves. You seed the ones the room already knows; a participant adds third parties they discover while answering, under a name-namespaced id, and those arrive on their partial.',
      'The serves edges are what put a party under a question, and coloured by each third party’s worst material answer they ARE the exposure map — which compellable party stands under which dimension. The assessed party is never a risk row.',
    ],
    watch:
      'Seeding nobody is worse than seeding roughly: with no chain, the graceful default is just institution plus primary provider, and every subcontractor risk reads as absent rather than unknown.',
  },
  {
    id: 'setup',
    tag: 'Setup',
    eyebrow: 'The workbook-assessment',
    title: 'Name the estate, seed the roster, hand it out',
    paras: [
      'Setup turns an imported workbook into the artifact the room fills: the estate’s name and description, plus the seeded party roster. Export it and it is what each participant opens.',
      'Everything a participant sends back is a partial: their answers, the third parties they added, and their claim log. It carries the workbook inside it, so a partial on its own is enough to start a merge.',
    ],
  },
  {
    id: 'questions',
    tag: '§ 5.1',
    eyebrow: 'Units',
    title: 'Answers are per unit, not per question',
    paras: [
      'A recorded fact names its target: the whole assessment, one concrete party, one dimension, or one stratum of a dimension. That expansion is derived from the grain and the roster — nobody authors the fanned-out form.',
      'The moment one stratum refinement exists for a question and dimension, that dimension is assessed per stratum for that question: each stratum is a full unit, and any lingering whole-dimension answer is superseded and ignored. No double counting.',
    ],
  },
  {
    id: 'merge',
    tag: 'Merge',
    eyebrow: 'Landing partials',
    title: 'Nothing lands without a human decision',
    paras: [
      'Partials land one at a time, and every clash is decided on its own card. There is no bulk apply at any scope and no suggestion is ever applied without a press — a control that recorded twenty resolutions from one press would be a rubber stamp, which is the thing this queue exists to prevent.',
      'Only a workbook id-and-version mismatch refuses a partial outright. Everything else lands, flagged. Nothing is lost either: every discarded answer and every party mutation is named in an append-only ledger with its before and after, and a changed mind appends another landing rather than editing one.',
    ],
    watch:
      'Every candidate carries the claim that produced it, so “who said this” is answerable from the file alone. Resolve on the claim, not on who you happened to speak to last.',
  },
  {
    id: 'dashboard',
    tag: '§ 6',
    eyebrow: 'The two outputs',
    title: 'Gate and rank — never one number',
    paras: [
      'The SEAL floor is the MINIMUM over the gating answers, not an average: one material SEAL-0 on a critical dimension floors everything, and no amount of strength elsewhere lifts it. It carries its unknowns inseparably — “SEAL-2 · 3 unknowns” is the whole reading.',
      'The Sovereignty Score is earned over attainable per objective, weighted and renormalised over covered weight. It ranks estates above the floor; it never substitutes for it. Read them as a pair or the room will average them in their heads.',
    ],
    watch:
      'The floor is minted at finalize. Anything shown before that is a preview of where it stands today, and it can only fall as more answers arrive.',
  },
];
