import {
  choiceSentence,
  disputedRecords,
  disputedSentences,
  ledgerSummary,
  standingAuthors,
  standingUnits,
} from '../merge';
import type { AnswerSnapshot, Party, Seal, Workbook } from '../schema';
import type { EngineResult } from '../score-engine';
import { questionOf, sealOfAnswer, targetKey } from '../assessment';
import { answerLabel } from '../utils/answer-label';
import { targetLabel } from '../utils/target-label';

export type SweptReading =
  | {
      kind: 'measured';
      swept: number;
      answered: number;
      // `10.7%` — one decimal.
      percent: string;
      // `9 of 84 answers were placed by a group gesture — 10.7%.`
      line: string;
    }
  | { kind: 'none'; reason: string };

// One contributor's share of the file as it stands. The whole roster is here,
// ranked — a reading that must fit in a fixed height folds its own tail, which
// is a decision about the space it got, not about the estate.
export type ContributorShare = {
  // The identity the ledger recorded: a participant, or `facilitator`.
  name: string;
  units: number;
  // Share of the standing units, 0–1.
  fraction: number;
};

export type LedgerReading =
  | {
      kind: 'landed';
      // Who placed the answers that stand, most first.
      contributors: ContributorShare[];
      // Units the ledger covers that still hold an answer — what the shares
      // above are shares OF. Below `units` wherever a decision emptied one.
      standing: number;
      records: number;
      units: number;
      disputed: number;
      // `2 contributors placed the 90 answers that stand.`
      line: string;
      // `34 of 149 records were disputed on landing.`
      disputedLine: string;
      // `The ledger covers 94 answer units.`
      coverage: string;
      // `disputedSentences()`, ledger order — the Report prints these; the tile
      // reports the count and leaves the records to Merge → History.
      disputes: string[];
    }
  | { kind: 'unlanded'; reason: string };

export type CredibilityTile = {
  swept: SweptReading;
  ledger: LedgerReading;
  caption: string;
};

const CAPTION =
  'Provenance describes how the file was produced, never how it scores — the engine reads a swept answer and an individual one identically.';

const NOTHING_ANSWERED =
  'Nothing answered yet — a gesture share needs an answer to describe.';

const plural = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`;

const NOTHING_LANDED =
  'One contributor, nothing merged — no partial has landed, so there is no ledger to read.';

// One unit a contributor placed, as the rail reads it. Unit grain, because that
// is the grain the arc counted — a question with three targets that one person
// answered twice contributes two.
export type ContributorUnit = {
  // `<questionId>|<targetKey(target)>`.
  key: string;
  questionId: string;
  questionText: string;
  // What the unit is asked about, in words.
  label: string;
  // The answer that stands, as the rail marks it.
  state: AnswerSnapshot['state'];
  seal: Seal | null;
  evidence: boolean;
  // The same answer in words: `SEAL 2`, `don't know`, `n/a`.
  answer: string;
  // How it settled: `sole source`, `agreed`, `resolved a clash`.
  settled: string;
};

// One contributor's slice, opened: every unit whose standing answer is theirs.
// Derived from the live ledger, so a contributor the ledger no longer names —
// a re-landing that superseded all of their answers — resolves to nothing.
export type ContributorInspection = {
  name: string;
  // `38 of 130` — the arc's own numbers, so the rail cannot disagree with it.
  count: string;
  note: string;
  // Ledger order: the order the units first appeared.
  units: ContributorUnit[];
};

const SETTLED: Readonly<Record<'sole-source' | 'agreed' | 'resolved', string>> = {
  'sole-source': 'sole source',
  agreed: 'agreed',
  resolved: 'resolved a clash',
};

export function contributorInspection(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
  name: string,
): ContributorInspection | null {
  const standing = standingUnits(result.credibility.ledger);
  const mine = standing.filter((unit) => unit.from === name);
  if (mine.length === 0) return null;

  const questions = new Map(
    workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]),
  );
  return {
    name,
    count: `${mine.length} of ${standing.length}`,
    note: `Answers that stand because ${name} placed them. What each one replaced is in Merge → History.`,
    units: mine.map((unit) => {
      const question = questionOf(workbook, unit.questionId) ?? { ladder: [] };
      return {
        key: `${unit.questionId}|${targetKey(unit.target)}`,
        questionId: unit.questionId,
        questionText: questions.get(unit.questionId) ?? unit.questionId,
        label: targetLabel(workbook, parties, unit.target),
        state: unit.answer.state,
        seal: sealOfAnswer(question, unit.answer),
        evidence: unit.answer.state === 'answered' && unit.answer.evidence !== undefined,
        answer: answerLabel(question, unit.answer),
        settled: SETTLED[unit.decision],
      };
    }),
  };
}

// Which of the tile's two ratios was pressed — the same word the row marks itself
// with, so the press and the rail cannot name different things.
export type ProvenanceFact = 'swept' | 'disputed';

// One unit behind a provenance ratio, as the rail reads it.
export type ProvenanceUnit = {
  // Unique per ROW, not per unit: a unit disputed twice is two rows.
  key: string;
  questionId: string;
  questionText: string;
  label: string;
  roleName: string;
  // How the clash settled (`kept Jane`) — disputed rows only, `''` for a swept one.
  settled: string;
  // The answer this row stands for; null where the resolution emptied the unit.
  reading: {
    state: AnswerSnapshot['state'];
    seal: Seal | null;
    evidence: boolean;
    answer: string;
  } | null;
};

export type ProvenanceInspection = {
  title: string;
  // The tile's own numbers, so the rail cannot disagree with the bar beside it.
  count: string;
  note: string;
  units: ProvenanceUnit[];
};

const PROVENANCE_NOTE: Readonly<Record<ProvenanceFact, string>> = {
  swept: 'Answers a facilitator placed for the whole room in one gesture. The engine reads a swept answer and an individual one identically — this says how the file was produced, not how it scores.',
  disputed:
    'Records where the room did not agree and the facilitator settled it. What each one replaced is in Merge → History.',
};

export function provenanceInspection(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
  fact: ProvenanceFact,
): ProvenanceInspection | null {
  const questions = new Map(
    workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q]),
  );
  const roleName = (id: string): string => workbook.roles.find((r) => r.id === id)?.name ?? id;
  const question = (id: string) => questions.get(id);

  if (fact === 'swept') {
    const answered = result.facts.filter((f) => f.state === 'answered');
    const swept = answered.filter((f) => f.swept);
    if (swept.length === 0) return null;
    return {
      title: 'Placed by a group gesture',
      count: `${swept.length} of ${answered.length}`,
      note: PROVENANCE_NOTE.swept,
      units: swept.map((f) => ({
        key: `${f.questionId}|${targetKey(f.target)}`,
        questionId: f.questionId,
        questionText: question(f.questionId)?.text ?? f.questionId,
        label: targetLabel(workbook, parties, f.target),
        roleName: roleName(f.role),
        settled: '',
        reading: {
          state: 'answered',
          seal: f.seal,
          evidence: f.evidence,
          answer: f.seal === null ? '' : `SEAL ${f.seal}`,
        },
      })),
    };
  }

  const ledger = result.credibility.ledger;
  const disputed = disputedRecords(ledger);
  if (disputed.length === 0) return null;
  return {
    title: 'Disputed on landing',
    count: `${disputed.length} of ${ledgerSummary(ledger).records}`,
    note: PROVENANCE_NOTE.disputed,
    units: disputed.map((record, index) => {
      const after = record.after;
      return {
        // Two landings can dispute one unit, so the row's identity is its place in
        // the ledger, never the unit it touched.
        key: `${record.questionId}|${targetKey(record.target)}|${index}`,
        questionId: record.questionId,
        questionText: question(record.questionId)?.text ?? record.questionId,
        label: targetLabel(workbook, parties, record.target),
        roleName: roleName(question(record.questionId)?.role ?? ''),
        settled:
          record.decision.kind === 'resolved'
            ? choiceSentence(record.decision.choice, question(record.questionId) ?? { ladder: [] })
            : '',
        reading:
          after === null
            ? null
            : {
                state: after.state,
                seal: sealOfAnswer(question(record.questionId) ?? { ladder: [] }, after),
                evidence: after.state === 'answered' && after.evidence !== undefined,
                answer: answerLabel(question(record.questionId) ?? { ladder: [] }, after),
              },
      };
    }),
  };
}

export function credibilityTile(result: EngineResult, workbook: Pick<Workbook, 'objectives'>): CredibilityTile {
  const answeredFacts = result.facts.filter((f) => f.state === 'answered');
  const answered = answeredFacts.length;
  const swept = answeredFacts.filter((f) => f.swept).length;

  const sweptReading: SweptReading =
    answered === 0
      ? { kind: 'none', reason: NOTHING_ANSWERED }
      : (() => {
          const percent = `${((swept / answered) * 100).toFixed(1)}%`;
          return {
            kind: 'measured',
            swept,
            answered,
            percent,
            line: `${swept} of ${answered} answers were placed by a group gesture — ${percent}.`,
          };
        })();

  const ledger = result.credibility.ledger;
  const summary = ledgerSummary(ledger);
  const authors = standingAuthors(ledger);
  const standing = authors.reduce((total, author) => total + author.units, 0);
  const ledgerReading: LedgerReading =
    ledger.length === 0
      ? { kind: 'unlanded', reason: NOTHING_LANDED }
      : {
          kind: 'landed',
          contributors: authors.map((author) => ({
            name: author.from,
            units: author.units,
            fraction: standing === 0 ? 0 : author.units / standing,
          })),
          standing,
          records: summary.records,
          units: summary.units,
          disputed: summary.disputed,
          line: `${plural(authors.length, 'contributor')} placed the ${standing} answer${standing === 1 ? '' : 's'} that stand${standing === 1 ? 's' : ''}.`,
          disputedLine: `${summary.disputed} of ${plural(summary.records, 'record')} ${summary.disputed === 1 ? 'was' : 'were'} disputed on landing.`,
          coverage: `The ledger covers ${plural(summary.units, 'answer unit')}.`,
          disputes: disputedSentences(ledger, workbook),
        };

  return { swept: sweptReading, ledger: ledgerReading, caption: CAPTION };
}
