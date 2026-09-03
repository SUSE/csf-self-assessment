import type {
  AnswerLedgerRecord,
  AnswerSnapshot,
  ClashChoice,
  Landing,
  LandingEnvelope,
  LedgerCandidate,
  LedgerRecord,
  Party,
  PartyLedgerRecord,
  Question,
  Target,
  Workbook,
} from '../schema';
import { questionOf, targetKey } from '../assessment';
import { answerLabel, rungLabel } from '../utils/answer-label';
import { targetLabel } from '../utils/target-label';
import { authorityLabel } from './authority';
import { sameStanding } from './snapshot';

// Reading the append-only merge ledger as a sequence of LANDINGS (landing-history
// §2.4): what stands now, what a unit's history was, and how the records group
// into units. Pure — no clock. Nothing here is stored.

const FACILITATOR = 'facilitator';

const unitKey = (questionId: string, target: Target): string => `${questionId} ${targetKey(target)}`;

const envelopeOf = (landing: Landing): LandingEnvelope => {
  const { records: _records, ...envelope } = landing;
  return envelope;
};

export type LandingEffect = 'new' | 'changed' | 'cleared' | 'unchanged';

export function effectOf(record: AnswerLedgerRecord): LandingEffect {
  if (sameStanding(record.before, record.after)) return 'unchanged';
  if (record.before === null) return 'new';
  if (record.after === null) return 'cleared';
  return 'changed';
}

/** One Landing's derived reading (§2.4). Nothing here is stored. The four effect
 *  counts partition `unitsReviewed`; the process counts overlay it. */
export type LandingSummary = {
  unitsReviewed: number;
  newUnits: number;
  changed: number;
  cleared: number;
  unchanged: number;
  agreements: number;
  resolvedClashes: number;
  partyDecisions: number;
};

export function landingSummary(landing: Landing): LandingSummary {
  const summary: LandingSummary = {
    unitsReviewed: 0,
    newUnits: 0,
    changed: 0,
    cleared: 0,
    unchanged: 0,
    agreements: 0,
    resolvedClashes: 0,
    partyDecisions: 0,
  };
  for (const record of landing.records) {
    if (record.kind === 'party') {
      summary.partyDecisions += 1;
      continue;
    }
    summary.unitsReviewed += 1;
    switch (effectOf(record)) {
      case 'new':
        summary.newUnits += 1;
        break;
      case 'changed':
        summary.changed += 1;
        break;
      case 'cleared':
        summary.cleared += 1;
        break;
      case 'unchanged':
        summary.unchanged += 1;
        break;
    }
    if (record.decision.kind === 'agreed') summary.agreements += 1;
    if (record.decision.kind === 'resolved') summary.resolvedClashes += 1;
  }
  return summary;
}

/** The first seven characters — display shorthand only (§2.1.9). */
export function shortLandingId(id: string): string {
  return id.slice(0, 7);
}

/** The candidate that produced this record's standing answer, or null when the
 *  record emptied the unit. */
export function standingCandidate(record: AnswerLedgerRecord): LedgerCandidate | null {
  const standing = record.after;
  if (standing === null) return null;
  const decision = record.decision;
  switch (decision.kind) {
    case 'sole-source':
      return candidateFrom(record, decision.from, standing);
    case 'agreed':
      return candidateFrom(record, decision.kept, standing);
    case 'resolved':
      return decision.choice.kind === 'take'
        ? candidateFrom(record, decision.choice.from, standing)
        : { from: FACILITATOR, answer: standing, claim: null, authority: 'out-of-claim' };
  }
}

function candidateFrom(
  record: AnswerLedgerRecord,
  from: string,
  standing: AnswerSnapshot,
): LedgerCandidate {
  const candidate = record.candidates.find((c) => c.from === from);
  return {
    from,
    answer: standing,
    claim: candidate?.claim ?? null,
    authority: candidate?.authority ?? 'out-of-claim',
  };
}

const standingLabel = (question: Pick<Question, 'ladder'>, answer: AnswerSnapshot | null): string =>
  answer === null ? 'nothing stands here' : answerLabel(question, answer);

/** How a clash was settled, in words — `kept Jane`, `re-answered at “r2” (SEAL 2)`. */
export function choiceSentence(choice: ClashChoice, question: Pick<Question, 'ladder'>): string {
  switch (choice.kind) {
    case 'take':
      return `kept ${choice.from}`;
    case 'reanswer':
      return `re-answered at ${rungLabel(question, choice.rungId)}`;
    case 'grain':
      return choice.keep === 'strata' ? 'kept the strata' : 'kept the roll-up';
  }
}

const noteSuffix = (note: string): string => (note === '' ? '' : ` “${note}”`);

// The `serves` edges the survivor inherited: what stands on the survivor after,
// minus what it already had (§2.3.3). `before[0]` is the estate side by contract.
function servesSuffix(record: PartyLedgerRecord): string {
  const had = new Set(record.before[0].serves);
  const gained = record.after[0].serves.filter((dim) => !had.has(dim));
  return gained.length === 0 ? '' : ` +${gained.join(', ')}`;
}

function partySentence(record: PartyLedgerRecord): string {
  const decision = record.decision;
  switch (decision.kind) {
    case 'add':
      return `${record.after[0].name} (${decision.party}) joins the estate`;
    case 'absorb':
      return `${record.before[1].name} and ${record.before[0].name} are one provider — kept “${decision.name}” as ${decision.into}${servesSuffix(record)}${noteSuffix(decision.note)}`;
    case 'rename':
      return `${record.before[1].name} and ${record.before[0].name} are one provider — kept “${decision.name}” as ${decision.party}${servesSuffix(record)}${noteSuffix(decision.note)}`;
    case 'split':
      return `${record.after[1].name} kept separate as ${decision.id}${noteSuffix(decision.note)}`;
  }
}

/** One ledger record read as a sentence — the History list, the unit ledger and
 *  the credibility strip all speak with this one voice. Data, not judgment. */
export function recordSentence(record: LedgerRecord, workbook: Pick<Workbook, 'objectives'>): string {
  if (record.kind === 'party') return partySentence(record);
  const question = questionOf(workbook, record.questionId) ?? { ladder: [] };
  const decision = record.decision;
  switch (decision.kind) {
    case 'sole-source':
      return `only ${decision.from} answered — ${standingLabel(question, record.after)}`;
    case 'agreed':
      return `${decision.among.join(' and ')} agreed — ${standingLabel(question, record.after)}`;
    case 'resolved': {
      const said = record.candidates.map((c) => `${c.from} said ${answerLabel(question, c.answer)}`).join('; ');
      return `${said} → ${choiceSentence(decision.choice, question)} — ${standingLabel(question, record.after)}${noteSuffix(decision.note)}`;
    }
  }
}

/** One answer record together with the Landing that carried it — the envelope
 *  only, never the whole batch. */
export type UnitHistoryEntry = { landing: LandingEnvelope; record: AnswerLedgerRecord };

/** One unit's full history, in ledger order — `git blame` for an answer (§3.4). */
export function unitHistory(
  ledger: readonly Landing[],
  questionId: string,
  target: Target,
): UnitHistoryEntry[] {
  const key = unitKey(questionId, target);
  const entries: UnitHistoryEntry[] = [];
  for (const landing of ledger) {
    const envelope = envelopeOf(landing);
    for (const record of landing.records) {
      if (record.kind !== 'answer') continue;
      if (unitKey(record.questionId, record.target) !== key) continue;
      entries.push({ landing: envelope, record });
    }
  }
  return entries;
}

export type LedgerUnit = { questionId: string; target: Target; entries: UnitHistoryEntry[] };

/** Answer records grouped by unit, units in first-appearance order across
 *  Landings and entries within a unit in ledger order. Party records are not
 *  units and are excluded. */
export function ledgerUnits(ledger: readonly Landing[]): LedgerUnit[] {
  const units = new Map<string, LedgerUnit>();
  for (const landing of ledger) {
    const envelope = envelopeOf(landing);
    for (const record of landing.records) {
      if (record.kind !== 'answer') continue;
      const key = unitKey(record.questionId, record.target);
      const entry: UnitHistoryEntry = { landing: envelope, record };
      const unit = units.get(key);
      if (unit === undefined) {
        units.set(key, { questionId: record.questionId, target: record.target, entries: [entry] });
      } else {
        unit.entries.push(entry);
      }
    }
  }
  return [...units.values()];
}

/** The claim behind one candidate, in words: `blanket claim`,
 *  `outside their claims`, or `claim naming <subjects>` — the dimension and
 *  party NAMES the claim listed, dimensions first, each in the claim's own
 *  order. An `owner` candidate whose claim named nothing reads `claim owner`. */
export function claimPhrase(
  candidate: Pick<LedgerCandidate, 'claim' | 'authority'>,
  workbook: Pick<Workbook, 'dimensions'>,
  parties: readonly Party[],
): string {
  if (candidate.authority !== 'owner') return authorityLabel(candidate.authority);
  const claim = candidate.claim;
  if (claim === null) return authorityLabel('owner');
  const named = [
    ...claim.dimensions.map((id) => targetLabel(workbook, parties, { kind: 'dimension', dimension: id })),
    ...claim.parties.map((id) => targetLabel(workbook, parties, { kind: 'party', party: id })),
  ];
  return named.length === 0 ? authorityLabel('owner') : `claim naming ${named.join(', ')}`;
}

/** One entry as every ledger view reads it: its Landing, the sentence, plus one
 *  line per candidate naming WHO stood behind it and the claim that produced it
 *  (invariant #5). */
export type LedgerEntry = {
  landing: LandingEnvelope;
  record: AnswerLedgerRecord;
  sentence: string;
  sources: string[];
};

/** Unit-history entries read as ledger entries, in the order given. */
export function ledgerEntries(
  entries: readonly UnitHistoryEntry[],
  workbook: Pick<Workbook, 'dimensions' | 'objectives'>,
  parties: readonly Party[],
): LedgerEntry[] {
  return entries.map((entry) => ({
    landing: entry.landing,
    record: entry.record,
    sentence: recordSentence(entry.record, workbook),
    sources: entry.record.candidates.map((c) => `${c.from} · ${claimPhrase(c, workbook, parties)}`),
  }));
}

/** Every answer unit ONE question ever touched, labelled and read as entries —
 *  including a unit a grain decision emptied, which is why this reads the LEDGER
 *  and never the current answers. Units in first-appearance order, entries
 *  within a unit in ledger order. */
export type BlameUnit = { target: Target; label: string; entries: LedgerEntry[] };
export function questionBlame(
  ledger: readonly Landing[],
  questionId: string,
  workbook: Pick<Workbook, 'dimensions' | 'objectives'>,
  parties: readonly Party[],
): BlameUnit[] {
  return ledgerUnits(ledger)
    .filter((unit) => unit.questionId === questionId)
    .map((unit) => ({
      target: unit.target,
      label: targetLabel(workbook, parties, unit.target),
      entries: ledgerEntries(unit.entries, workbook, parties),
    }));
}

/** One unit as it STANDS: who placed the answer that holds now, what that answer
 *  says, how it settled, and the Landing that recorded it. */
export type StandingUnit = {
  questionId: string;
  target: Target;
  /** The identity behind the standing answer: a participant, or `facilitator`. */
  from: string;
  answer: AnswerSnapshot;
  decision: AnswerLedgerRecord['decision']['kind'];
  landing: LandingEnvelope;
};

/** Every unit that still holds an answer, read from the LAST record that touched
 *  it — so a superseded answer credits nobody and a unit a grain decision emptied
 *  is absent rather than standing for its old author. This is what makes the
 *  readings built on it summaries of the file rather than of the traffic that
 *  produced it. Units in first-appearance order. */
export function standingUnits(ledger: readonly Landing[]): StandingUnit[] {
  const standing: StandingUnit[] = [];
  for (const unit of ledgerUnits(ledger)) {
    const last = unit.entries.at(-1);
    if (last === undefined) continue;
    const candidate = standingCandidate(last.record);
    if (candidate === null) continue;
    standing.push({
      questionId: unit.questionId,
      target: unit.target,
      from: candidate.from,
      answer: candidate.answer,
      decision: last.record.decision.kind,
      landing: last.landing,
    });
  }
  return standing;
}

/** One contributor's authorship of the file as it stands: the units whose
 *  standing answer came from them. `facilitator` appears here like anyone else —
 *  a re-answer at the queue is authorship, and hiding it would be the one
 *  provenance omission that flatters the result. */
export type StandingAuthor = { from: string; units: number };

/** Who placed the answers that STAND, most units first, ties in first-appearance
 *  order. */
export function standingAuthors(ledger: readonly Landing[]): StandingAuthor[] {
  const units = new Map<string, number>();
  for (const unit of standingUnits(ledger)) {
    units.set(unit.from, (units.get(unit.from) ?? 0) + 1);
  }
  return [...units.entries()]
    .map(([from, count]) => ({ from, units: count }))
    .sort((a, b) => b.units - a.units);
}

/** The ledger at a glance for the credibility lens: how many Landings, how many
 *  records they hold, how many answer units those cover, and how many were
 *  DISPUTED (a `resolved` decision). */
export type LedgerSummary = {
  landings: number;
  records: number;
  units: number;
  disputed: number;
};
export function ledgerSummary(ledger: readonly Landing[]): LedgerSummary {
  return {
    landings: ledger.length,
    records: ledger.reduce((total, landing) => total + landing.records.length, 0),
    units: ledgerUnits(ledger).length,
    disputed: disputedRecords(ledger).length,
  };
}

/** The sentences of the disputed records only, in ledger order — what the
 *  credibility strip lists. The whole ledger is the History tab's job. */
export function disputedSentences(ledger: readonly Landing[], workbook: Pick<Workbook, 'objectives'>): string[] {
  return disputedRecords(ledger).map((record) => recordSentence(record, workbook));
}

/** Every record the room disagreed on, in ledger order — a `resolved` decision.
 *  Records, not units: a unit disputed twice is two of these, which is what makes
 *  the count the credibility tile reports a count of the traffic. */
export function disputedRecords(ledger: readonly Landing[]): AnswerLedgerRecord[] {
  return ledger.flatMap((landing) =>
    landing.records.filter(
      (record): record is AnswerLedgerRecord =>
        record.kind === 'answer' && record.decision.kind === 'resolved',
    ),
  );
}
