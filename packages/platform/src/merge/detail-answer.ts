import type {
  AnswerLedgerRecord,
  AnswerSnapshot,
  Authority,
  ClashClass,
  Gesture,
  LedgerDecision,
  Question,
  Seal,
  Workbook,
} from '../schema';
import { questionOf, sealOfAnswer } from '../assessment';
import { sealName } from '../score-engine';
import { answerLabel, rungLabel } from '../utils/answer-label';
import { targetLabel } from '../utils/target-label';
import { authorityLabel } from './authority';
import type { LandingEffect } from './ledger';
import { claimPhrase, effectOf, standingCandidate } from './ledger';
import type { RecordRef } from './record-ref';
import { recordRef } from './record-ref';
import type { DetailContext } from './detail-context';

// One answer record as the detail reads it (§4.6): two labelled peer snapshots,
// the human action between them, and every candidate that was in play.

/** One side of an answer panel (§4.6). `absent` renders **No standing answer** —
 *  never SEAL-0 (§2.2.3). */
export type SnapshotReading =
  | { kind: 'absent' }
  | {
      kind: 'present';
      stateLabel: string;
      seal: Seal | null;
      sealLevel: string | null;
      placement: Gesture['placement'];
      evidence: string | null;
      reason: string | null;
    };

const STATE_LABELS = {
  answered: 'answered',
  'dont-know': 'don’t know',
  na: 'not applicable',
} as const;

export function snapshotReading(
  snapshot: AnswerSnapshot | null,
  workbook: Pick<Workbook, 'sealLevels'>,
  question: Pick<Question, 'ladder'>,
): SnapshotReading {
  if (snapshot === null) return { kind: 'absent' };
  const seal = sealOfAnswer(question, snapshot);
  return {
    kind: 'present',
    stateLabel: STATE_LABELS[snapshot.state],
    seal,
    sealLevel: seal === null ? null : sealName(workbook.sealLevels, seal),
    placement: snapshot.gesture.placement,
    evidence: snapshot.state === 'answered' ? snapshot.evidence ?? null : null,
    reason: snapshot.state === 'na' ? snapshot.reason ?? null : null,
  };
}

/** One candidate as the disclosure reads it (§4.6), `standing` marking the one that
 *  became the answer. */
export type CandidateReading = {
  from: string;
  answer: string;
  claim: string;
  authority: Authority;
  authorityLabel: string;
  evidence: string | null;
  placement: Gesture['placement'];
  standing: boolean;
};

export type AnswerPanel = {
  kind: 'answer';
  ref: RecordRef;
  label: string;
  objectiveId: string;
  objectiveName: string;
  questionId: string;
  questionText: string;
  targetLabel: string;
  effect: LandingEffect;
  process: LedgerDecision['kind'];
  clash: ClashClass | null;
  before: SnapshotReading;
  after: SnapshotReading;
  decision: string;
  rationale: string | null;
  candidates: CandidateReading[];
  candidatesOpen: boolean;
};

/** Where a record naming a question this workbook does not carry is filed, so no
 *  record can vanish from the detail. */
export const UNPLACED_OBJECTIVE: { id: string; name: string } = {
  id: 'unplaced',
  name: 'Other records',
};

function decisionHeadline(decision: LedgerDecision, question: Pick<Question, 'ladder'>): string {
  switch (decision.kind) {
    case 'agreed':
      return `Agreed by ${decision.among.join(' and ')}`;
    case 'sole-source':
      return `Only ${decision.from} answered`;
    case 'resolved':
      switch (decision.choice.kind) {
        case 'take':
          return `Took ${decision.choice.from}’s answer`;
        case 'reanswer':
          return `Facilitator set ${rungLabel(question, decision.choice.rungId)}`;
        case 'grain':
          return decision.choice.keep === 'strata'
            ? 'Kept the per-stratum answers'
            : 'Kept the whole-dimension answer';
      }
  }
}

export function answerPanel(
  record: AnswerLedgerRecord,
  objective: { id: string; name: string },
  ctx: DetailContext,
): AnswerPanel {
  const workbook = ctx.workbookAssessment.workbook;
  const question = questionOf(workbook, record.questionId) ?? { ladder: [] };
  const label = targetLabel(workbook, ctx.parties, record.target);
  const decision = record.decision;
  const note = decision.kind === 'resolved' ? decision.note : '';
  const standing = standingCandidate(record);
  return {
    kind: 'answer',
    ref: recordRef(record),
    label: `${record.questionId} · ${label}`,
    objectiveId: objective.id,
    objectiveName: objective.name,
    questionId: record.questionId,
    questionText: questionOf(workbook, record.questionId)?.text ?? '',
    targetLabel: label,
    effect: effectOf(record),
    process: decision.kind,
    clash: decision.kind === 'resolved' ? decision.clash : null,
    before: snapshotReading(record.before, workbook, question),
    after: snapshotReading(record.after, workbook, question),
    decision: decisionHeadline(decision, question),
    rationale: note === '' ? null : note,
    candidates: record.candidates.map((candidate) => ({
      from: candidate.from,
      answer: answerLabel(question, candidate.answer),
      claim: claimPhrase(candidate, workbook, ctx.parties),
      authority: candidate.authority,
      authorityLabel: authorityLabel(candidate.authority),
      evidence: candidate.answer.state === 'answered' ? candidate.answer.evidence ?? null : null,
      placement: candidate.answer.gesture.placement,
      standing: standing !== null && standing.from === candidate.from,
    })),
    candidatesOpen: decision.kind === 'resolved',
  };
}
