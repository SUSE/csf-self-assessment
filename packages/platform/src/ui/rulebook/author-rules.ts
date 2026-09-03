import type { RuleSection } from './content';

// The AUTHOR's rule set — a curated, compact gloss of the canonical authoring
// rulebook (docs/authoring-rulebook.md). Each card is keyed by an `id` a control
// or an overview finding cites via `data-rule` / `RuleCite`. Most keys are the
// doc's section numbers ('3.2', '6', …). where one doc section (§3.3, the
// Question) governs several distinct controls, it is split into field-matched
// cards ('grain', 'role', 'question') that all still show the § 3.3 tag — so
// hovering the grain toggle explains grain, hovering the role explains roles,
// and neither buries the other. Ordered to follow the editor top-to-bottom,
// which is how the resting list reads.

// One of three audience sets (see participant-rules / facilitator-rules): the
// app hands the one its reader needs to `createHelp`, and every control's
// gating follows from what that set holds.

export const AUTHOR_RULES: RuleSection[] = [
  {
    id: 'overview',
    tag: '§ 3.7',
    eyebrow: 'The workbook',
    title: 'One file is the whole instrument',
    paras: [
      'A workbook is meta, front sheet, the SEAL scale, dimensions, roles, party types, objectives, test estates and any recommendations — one file that travels. The workbook IS the estate: what an assessment covers is fixed here, before the file ever reaches a participant. There is no scope wizard at fill time.',
      'The overview reads that instrument back at you without running it. Spoke length on the wheel is the question-unit count that will fan onto a chip, so a busy dimension reaches the rim and one no question touches is a stub. The readings beside it — objectives, strata, budget — all come from the definition alone.',
    ],
  },
  {
    id: 'frontsheet',
    tag: '§ 3.7',
    eyebrow: 'Front sheet',
    title: 'What the room reads before answering',
    paras: [
      'The front sheet holds the opening declarations: the ceiling this assessment can honestly reach, what a don’t-know means here, and the pre-work someone should have done before the session starts.',
      'It is read once, by everyone, before the first rung is chosen — so it is the only place to set an expectation that would otherwise have to be repeated on every question.',
    ],
  },
  {
    id: '3.5',
    tag: '§ 3.5',
    eyebrow: 'Objective (SOV)',
    title: 'The scored grouping',
    paras: [
      'An objective is a named, weighted grouping of questions — the SOV in an id like SOV-3.exit-inventory. The EC’s eight ship as the default core set with their inherited weights; you may rename, reweight, add or drop. Nothing special-cases the number eight.',
      'It does exactly three jobs: score weighting, reporting granularity (a per-objective SEAL, with the question that binds it named), and authorship grouping. A question id follows the convention SOV-n.slug and is unique across the workbook.',
    ],
  },
  {
    id: 'grain',
    tag: '§ 3.3',
    eyebrow: 'Grain',
    title: 'Party or dimension',
    paras: [
      'The grain decides what one question fans out over. Dimension grain is asked once per authored, applicable dimension — use it for anything that can differ between Compute and Network. Party grain interrogates a party.',
      'On party grain the axis sets the reach — see the axis toggle. Arbitrary author-invented axes are rejected: two axes plus strata is the whole mechanism.',
    ],
  },
  {
    id: 'axis',
    tag: '§ 3.3',
    eyebrow: 'Axis',
    title: 'Asked once, or per provider',
    paras: [
      '“Asked once” (the assessment axis) records one answer for the whole estate — the strategic fact that does not vary by party, like whether an exit inventory exists.',
      '“Per provider” (the party axis) fans the question out over every declared party — institution, primary provider, each subprocessor. Those answers, coloured by each party’s worst rung, draw the exposure map: which compellable party stands under which dimension.',
    ],
  },
  {
    id: 'role',
    tag: '§ 3.3',
    eyebrow: 'Role',
    title: 'Who answers in the room',
    paras: [
      'The role is the knowledge-owner who can answer this question in the room, without contract review or a research project. Roles are workbook-authored — an ordered list defined in the Roles editor, the twin of dimensions; the code (its id, like OPS) is the badge on the card, editable until a question uses it, then frozen.',
      'The Roles page reads out load per role — question count and estimated minutes, in workbook order. It is informational only: the distribution is a downstream fact of the questions that exist, not a target, and nothing is flagged missing or overloaded.',
    ],
  },
  {
    id: 'party',
    tag: '§ 4.2',
    eyebrow: 'Party type',
    title: 'The compellable supply chain',
    paras: [
      'A party type is a kind of party the estate can involve — the twin of dimensions and roles. The EC four ship as the default: institution, primary provider, subprocessor, supplier. Party-axis questions fan out over the parties an assessment declares of these types.',
      'Exactly one type is the assessed party (kind “assessed”, the estate owner) and cannot be deleted; the rest are third parties. Each party’s worst material party-axis answer colours the exposure map — which compellable party stands under which dimension.',
    ],
  },
  {
    id: '3.4',
    tag: '§ 3.4',
    eyebrow: 'Materiality',
    title: 'What can floor the estate',
    paras: [
      'Two independent axes — does the question score, does it gate the floor. Material scores and gates: it feeds the minimum rule and can floor everything. Ranking scores and never gates. Informational is recorded and reported, scored nowhere and never gating. n/a excludes the question entirely.',
      'Ranking is for a ladder whose top rung nobody can reach — no EU-origin AI accelerators at scale, no leading-edge EU fab, no certification scheme for component provenance. Its points still rank, so a weak answer costs score; only its SEAL stops feeding the floor, which would otherwise hold every estate at SEAL-3 forever for a thing the world cannot supply. The other case is a ladder flat at one SEAL: its gate can never move, so as material it reports a floor that carries no signal.',
      'Materiality is per-question workbook data, so a “this objective goes informational” decision is a content edit, not an engine change.',
    ],
    watch:
      'Ask two questions. Should a bad answer here floor the whole estate? If not, it is not material. Should it count toward the score at all? If not, make it informational. Ranking needs a named blocker in the world — never a question you would rather not fail.',
  },
  {
    id: 'question',
    tag: '§ 3.3',
    eyebrow: 'Question text',
    title: 'One askable fact',
    paras: [
      'The top box is the question itself — the one askable sentence the participant reads and answers on the ladder below. The box beneath it is not a second question; it is the why (the rationale).',
      'Ask exactly one fact: an “and” in the stem often asks two at once, forcing one rung to stand for conflicting truths. It must be answerable in the room, by its role, within the slot.',
    ],
  },
  {
    id: 'why',
    tag: '§ 3.3',
    eyebrow: 'Why line',
    title: 'The rationale, not a question',
    paras: [
      'This is the why, not a second question — the line a facilitator reads aloud when the room asks “why are we being asked this?”. It is a quality requirement, though the strict schema permits it to be absent; it is never asked and never scored.',
      'It names the capability under stress the question defends: what the answer actually changes. Ladder lint flags a missing why.',
    ],
  },
  {
    id: 'dimension',
    tag: '§ 3.6',
    eyebrow: 'Dimension',
    title: 'What the workbook puts in scope',
    paras: [
      'A dimension is a canonical technical part of the estate — the core ten: Compute, Storage, Network, IAM, Platform, AI/ML, Software supply, Security, Edge, Facilities. Every dimension authored in the workbook is in scope; there is no assessment-time declared flag and no structural n/a.',
      '“Critical” marks the SEAL gate’s reach — the floor reads material answers on critical dimensions only, while the score sweeps scoring answers on every authored dimension. Changing scope means re-authoring and versioning the workbook.',
    ],
  },
  {
    id: 'strata',
    tag: '§ 3.6',
    eyebrow: 'Strata',
    title: 'Sub-parts a dimension splits into',
    paras: [
      'Strata name the sub-parts a dimension chip can split into — the canonical set is service / software / hardware / chips. Leave it blank for an unsplittable dimension; an authored list needs at least two unique names.',
      'Strata are not an axis: the split happens at answer time, only when the truth genuinely differs by stratum. Sovereign Kubernetes on US silicon is the case — software can reach SEAL-3 while chips sit at SEAL-0.',
    ],
  },
  {
    id: '3.6',
    tag: '§ 3.6',
    eyebrow: 'Applies-to',
    title: 'Which dimensions a question covers',
    paras: [
      'A dimension-grain question names at least one authored dimension that exists (rule R6). It is asked once per applicable dimension — or per stratum, when the truth genuinely differs within that dimension.',
      'Strata are not an axis: service / software / hardware / chips name the sub-parts a dimension chip can split into, and the split happens at answer time.',
    ],
    watch:
      'The coverage grid glows for any dimension no question reaches. The classic dimension gaps — IAM, network and facilities — must never recur.',
  },
  {
    id: '3.2',
    tag: '§ 3.2',
    eyebrow: 'Rung & ladder',
    title: 'Each rung is a control fact',
    paras: [
      'A rung is a thing in its own right: a frozen id, its text, its authored point value and its SEAL tag. Choosing a rung asserts that rung’s SEAL; the question’s attainable maximum is the ladder’s highest point value.',
      'A ladder may skip levels when no honest middle description exists, and it may repeat one — several rungs at the same SEAL is the normal shape of a hosted instrument. Going up, neither points nor SEAL may fall (rules R22/R23). Every rung states a capability under stress — who controls, whose law applies — not how well-run the programme is.',
    ],
    watch:
      'Floor-trap: a rung drags a sovereign estate down for missing paperwork. Ceiling-leak: a rung lets a foreign-dependent estate climb by producing documents. Both are authoring defects.',
  },
  {
    id: 'value',
    tag: '§ 3.2',
    eyebrow: 'Rung value',
    title: 'What this rung is worth',
    paras: [
      'Value is the rung’s authored points — the ranking number, never derived from the SEAL beside it. Choosing this rung earns exactly these points, and the question’s attainable maximum is the ladder’s highest value, so capping the top rung is a scoring decision, not just wording.',
      'Points are exact and may be fractional — the EC source carries 41.67, 83.34, 125.01, and its Value column is this field. Going up the ladder a value may repeat but never falls (R22). Points rank; they never gate: on a material gating unit, even a zero-value rung still pins the floor at its own SEAL.',
    ],
    watch:
      'Value is the ranking axis, SEAL is the gate. Nudging a value so an estate reads better moves the score and nothing else — if you meant the floor to move, that is the SEAL.',
  },
  {
    id: '7',
    tag: '§ 7',
    eyebrow: 'Authoring quality bars',
    title: 'Lint, gauges & test estates',
    paras: [
      'A rung must be checkable, not arguable — hedged quantifiers (most, some, partially, recently, ad hoc) fail the ladder lint. Also caught: a compound stem, a missing why-line, a ladder flat at one SEAL (its floor cannot move) and two rungs that read alike.',
      'Test estates re-evaluate on every edit against the real engine, so a change that flips a floor announces itself: a ceiling-leak shows as the hyperscaler climbing, a floor-trap as the EU stack sinking. Budget stays ≤ 40 questions, ≤ 90 minutes.',
    ],
  },
  {
    id: '6',
    tag: '§ 6',
    eyebrow: 'Scoring',
    title: 'Gate vs rank — two outputs',
    paras: [
      'The SEAL floor is the minimum over the gating answers — not an average. A single material SEAL-0 gating answer floors everything. The floor carries its unknowns inseparably: “SEAL-2 · 3 unknowns”.',
      'The Sovereignty Score is earned ÷ attainable per objective, weighted and renormalised over covered weight. It ranks above the floor and never substitutes for it.',
    ],
  },
  {
    id: '8',
    tag: '§ 8',
    eyebrow: 'The teaching workbook',
    title: 'Fixtures locked to the engine',
    paras: [
      'The basic teaching workbook (SOV-3, five questions, four dimensions, three estates) demonstrates the core question, ladder, grain, strata and test-estate mechanics. Its prepared workbook-assessment contains no participant answers; the filled answer-side fixture is the separate teaching-deep-analysis set.',
      'Current regression readings are engine-produced: the basic estates score 38.8889, 18.75 and 71.875 at floors 1, 0 and 1; the filled deep-analysis assessment reads floor SEAL-0 · 1 unknown and score 44.25.',
    ],
  },
  {
    id: '3.8',
    tag: '§ 3.8',
    eyebrow: 'Recommendation',
    title: 'A vendor offer, authored in the workbook',
    paras: [
      'A recommendation is workbook content: a title, a one-line action, and a body of paragraphs — a line starting “- ” renders as a bullet. It surfaces on the Recommendations page, reached from the stage header beside the dashboard, and it moves no number: the engine never sees one.',
      'Every workbook that carries a recommendation must name its recommender — who is speaking and the disclosure they make. The page leads with that attribution, so no offer is read without knowing whose it is. One contact call-to-action is optional: author it and the page opens and closes with that button; leave it out and the page ends on its last offer.',
    ],
    watch:
      'It is an offer, not a finding. Never phrase it as a consistency check, a gap or a rule — the dashboard beside it is statistics, and this is the one surface that sells.',
  },
  {
    id: 'recommendation-link',
    tag: '§ 3.8',
    eyebrow: 'Link & trigger',
    title: 'You link it; nothing infers it',
    paras: [
      'A link is an explicit typed pointer to one question, one dimension or one objective. Several links mean union — the recommendation fires when any of them fires — never a boolean expression. There is no condition language, no match mode and no inferred association.',
      'A link fires when the minimum asserted seal over the facts it covers is at or below the authored threshold. Only answered facts count: a don’t-know, an n/a and an unanswered unit never trigger a pitch. Materiality is not consulted — a recommendation is not a gate, and an informational answer is still a stated condition.',
    ],
    watch:
      'A threshold set too high advertises into a healthy estate; one set too low leaves the card dead. Read it against the test estates before shipping.',
  },
  {
    id: 'horizon',
    tag: '§ 3.8',
    eyebrow: 'Horizon',
    title: 'Renewal or strategic — the band it lands in',
    paras: [
      'Renewal means addressable at the next contract renewal, and lands in the page’s Quick wins chapter. Strategic means a 12–36 month programme, and lands in Strategic moves. Two values, one per chapter, and every recommendation sits in exactly one band.',
      'Order is your emphasis within the band; ties break on id, so the room always reads the same sequence. There is no priority, no severity and no effort estimate — they rank nothing and claim an urgency a workbook author cannot know about an estate they have never seen.',
    ],
  },
];
