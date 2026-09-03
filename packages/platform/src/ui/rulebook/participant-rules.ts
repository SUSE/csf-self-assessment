import type { RuleSection } from './content';

// The PARTICIPANT's rule set — what someone answering the instrument needs to
// know, in their voice. Not a gloss of the authoring rulebook: an author is
// deciding what a rung should say, a participant is deciding which rung is true,
// and those are different questions. Sourced from the authoring rulebook §3.1
// (the scale), §4.2 (parties), §5.1–5.3 (targets, states, evidence) and the
// delivery spec §2.3 (claims).
//
// STARTER SET. It covers the four stage sections plus the answering surface's own
// concerns; the ids not present here are not an oversight — a section with no
// card correctly greys out in help mode, so this set can grow one card at a time
// without any wiring change.

export const PARTICIPANT_RULES: RuleSection[] = [
  {
    id: 'overview',
    tag: 'Front sheet',
    eyebrow: 'This assessment',
    title: 'Read the declarations first',
    paras: [
      'The overview carries the front sheet: the ceiling this assessment can honestly reach, what a don’t-know means here, and the pre-work someone should have done before the session. It is worth reading once, before the first question.',
      'What the assessment covers was fixed by whoever authored the workbook. You do not narrow it and you cannot add to it — you say which part of it you are speaking for. That is a claim.',
    ],
  },
  {
    id: 'claims',
    tag: 'Claims',
    eyebrow: 'What you speak for',
    title: 'A role hat over a subject',
    paras: [
      'A claim is an owner over a subject: the role hat(s) you are wearing, and the dimensions or providers you are answering about. A question reaches you only if it asks for a role you claimed, about a subject you claimed. Compose one, add it, compose another — claims are additive and the log records every one.',
      'The filter hides what no claim of yours covers; it forbids nothing. If something you know about is not showing, add a claim for it rather than working around the filter.',
    ],
    watch:
      'What you answer is what you claimed. A unit inside your claim left unanswered is your gap; a unit no claim covered is the estate’s gap — and the two read differently at merge, so claim honestly rather than broadly.',
  },
  {
    id: 'parties',
    tag: 'Parties',
    eyebrow: 'Who is in the chain',
    title: 'The institution, and everyone compellable',
    paras: [
      'Concrete parties are this estate’s fact, not workbook content: the assessed institution plus each provider, subcontractor and supplier, each carrying the dimensions it serves. The facilitator seeds the ones already known; you add third parties you know of.',
      'You cannot add the assessed party — the "us" is seeded once. Everything you add is a compellable outside party, and the dimensions you give it are what puts it under those questions.',
    ],
  },
  {
    id: 'questions',
    tag: 'Questions',
    eyebrow: 'Units, not questions',
    title: 'One question, several facts',
    paras: [
      'A question records a fact per unit, not one answer overall. Depending on how it was authored, that is once for the whole estate, once per provider, or once per dimension — and a dimension can split into strata (service, software, hardware, chips) when the truth genuinely differs by layer.',
      'A question is complete when every unit in front of you is dealt with — placed on a rung, or moved off the ladder as a don’t-know or a doesn’t-apply. Unanswered is not an answer; it is just not done yet.',
    ],
  },
  {
    id: 'seal',
    tag: 'SEAL',
    eyebrow: 'The scale',
    title: 'Capability under stress',
    paras: [
      'The five levels run SEAL-0 No Sovereignty to SEAL-4 Full Digital Sovereignty. Choosing a rung asserts that level — position on the ladder IS the answer, so read the rung’s words and pick the one that is true, not the one that sounds right.',
      'Every rung asks the same underlying thing: what still works if access breaks, who decides, and who can be compelled. It never asks how well-run the programme is. A well-managed dependency is still a dependency.',
    ],
    watch:
      'Do not aim for a rung. Aiming produces a number nobody can defend when a reviewer asks what it rests on.',
  },
  {
    id: 'dont-know',
    tag: 'Don’t know',
    eyebrow: 'Asserted ignorance',
    title: 'A real answer, and a useful one',
    paras: [
      'A don’t-know says the room checked and nobody here knows. It is recorded as an answer, not skipped, and it travels with the reading: a floor is reported as “SEAL-2 · 3 unknowns”, never as a clean SEAL-2.',
      'It is the honest move when the alternative is a guess. Guessing a rung buries the gap; a don’t-know names it, and names it where whoever can close it will see it.',
    ],
  },
  {
    id: 'na',
    tag: 'Doesn’t apply',
    eyebrow: 'Genuinely inapplicable',
    title: 'Not the same as “we don’t do that yet”',
    paras: [
      'Doesn’t-apply means the thing being asked about cannot exist for this unit — not that it is absent, unfinished or out of your remit. Something you simply do not have is usually a low rung, not an exclusion.',
      'You can leave a short reason. It is read by a human at review and by nobody else; the engine never reads it.',
    ],
    watch:
      'Scope was authored, so there is no structural n/a. If a whole dimension is genuinely irrelevant to this estate, that is a workbook that needs re-authoring, not a page of exclusions.',
  },
  {
    id: 'evidence',
    tag: 'Evidence',
    eyebrow: 'What the rung rests on',
    title: 'One note, for the reviewer',
    paras: [
      'An answered rung can carry one evidence note — the contract clause, the architecture fact, the test result the choice stands on. A SEAL level without evidence cannot be defended before a reviewer.',
      'It never changes the score: the engine does not read it. It is counted as “N of M” over the answers that set the floor, which is exactly where a missing note costs you.',
    ],
  },
];
