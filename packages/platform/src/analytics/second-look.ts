import type { Party, Question, Seal, Target, Workbook } from '../schema';
import { gates, type EngineResult, type HeatFact } from '../score-engine';
import { targetKey } from '../assessment';
import { targetLabel } from '../utils/target-label';
import { bindingTarget } from './staircase';

/** The five hand-written checks (analytics §2.8). Adding one is a code change with
 *  a test: there is no rule format, no authorable condition language, no engine. */
export type CheckId =
  | 'concentration'
  | 'chain-visibility'
  | 'unserved-dimension'
  | 'hidden-layer'
  | 'undefended-claim';

/** A unit the check invites the room to open. */
export type CheckOpen = {
  key: string;
  questionId: string;
  questionText: string;
  /** The exact answer unit, so the rail reads THIS unit rather than the whole
   *  question — a check can list one question under several targets. */
  target: Target;
  /** The unit's target label: `whole estate`, a dimension name, a party name. */
  label: string;
};

/** The share of what the check read that it is asking about — `part` of `whole`, in
 *  the units `CHECK_META.subject` names. Structural throughout: never a seal. */
export type CheckRatio = { part: number; whole: number };

export type ConsistencyCheck = {
  id: CheckId;
  title: string;
  ratio: CheckRatio;
  /** The rung someone chose, in the workbook's own words; null when the check has
   *  no asserted side (§2.8 check 3). */
  asserted: string | null;
  /** What the declared model says. */
  structural: string;
  /** Always a question, never a verdict (analytics invariant #5). */
  question: string;
  opens: CheckOpen[];
};

export type SecondLookTile =
  | { kind: 'flagged'; headline: string; caption: string; checks: ConsistencyCheck[] }
  | { kind: 'clear'; reason: string };

/** The initial set is exactly five (§2.8; a sixth is deferred to a later slice, §8). */
export const CHECK_COUNT = 5;

/** Every check, in reading order, whether or not it fired — the tile draws one dial
 *  each, so a check that came back clear still has to be nameable. `subject` names
 *  what its ratio counts. */
export const CHECK_META: { id: CheckId; title: string; subject: string }[] = [
  { id: 'concentration', title: 'Concentration', subject: 'critical dimensions' },
  { id: 'chain-visibility', title: 'Chain visibility', subject: 'critical dimensions' },
  { id: 'unserved-dimension', title: 'Unserved dimension', subject: 'declared dimensions' },
  { id: 'hidden-layer', title: 'Hidden layer', subject: 'layered dimensions' },
  { id: 'undefended-claim', title: 'Undefended claim', subject: 'gating claims' },
];

const titleOf = (id: CheckId): string => CHECK_META.find((m) => m.id === id)!.title;

const CONCENTRATION_QUESTION = 'SOV-1.concentration';
const CHAIN_VISIBILITY_QUESTION = 'SOV-5.chain-visibility';

const CAPTION =
  'Each check reads an asserted answer beside what the declared model says. It asks, and moves nothing — not the floor, not the score, not a cell.';

// The five are named on the tile itself, one dial each, so the sentence no longer
// lists them back.
const CLEAR_REASON = 'All five checks read consistently against the declared model.';

function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function rungDescription(question: Question | undefined, seal: Seal): string {
  return question?.ladder.find((rung) => rung.seal === seal)?.description ?? '';
}

export function secondLookTile(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): SecondLookTile {
  const questions = workbook.objectives.flatMap((o) => o.questions);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const textOf = (id: string): string => questionById.get(id)?.text ?? id;
  // One unit to open, keyed by the unit itself: the same question can appear under
  // several targets in one check, and each must be its own selection in the rail.
  const openOn = (questionId: string, target: Target): CheckOpen => ({
    key: `${questionId}|${targetKey(target)}`,
    questionId,
    questionText: textOf(questionId),
    target,
    label: targetLabel(workbook, parties, target),
  });
  const asserted = result.facts.filter((f) => f.state === 'answered' && gates(f.materiality));
  const criticalDims = result.declaredDimensions.filter((d) => d.critical);
  const thirdParties = result.declaredParties.filter((p) => p.kind === 'third-party');

  const checks: ConsistencyCheck[] = [];

  const concentrationFact = asserted.find(
    (f) => f.questionId === CONCENTRATION_QUESTION && f.seal !== null && f.seal >= 1,
  );
  const concentrationSeal = concentrationFact?.seal ?? null;
  if (concentrationSeal !== null && criticalDims.length > 0) {
    const carrier = thirdParties.find(
      (p) => p.serves.filter((d) => criticalDims.some((c) => c.id === d)).length === criticalDims.length,
    );
    if (carrier !== undefined) {
      checks.push({
        id: 'concentration',
        title: titleOf('concentration'),
        // The carrier is found only where it serves EVERY critical dimension, so the
        // dial reads full — which is the finding.
        ratio: { part: criticalDims.length, whole: criticalDims.length },
        asserted: `SEAL-${concentrationSeal} · ${rungDescription(
          questionById.get(CONCENTRATION_QUESTION),
          concentrationSeal,
        )}`,
        structural: `The roster puts ${carrier.name} under ${criticalDims.length} of ${
          criticalDims.length
        } critical ${criticalDims.length === 1 ? 'dimension' : 'dimensions'}.`,
        question: 'Is one provider really carrying this?',
        opens: [openOn(CONCENTRATION_QUESTION, { kind: 'assessment' })],
      });
    }
  }

  const chainFact = asserted.find(
    (f) => f.questionId === CHAIN_VISIBILITY_QUESTION && f.seal !== null && f.seal >= 2,
  );
  const chainSeal = chainFact?.seal ?? null;
  if (chainSeal !== null) {
    const soleServed = criticalDims.filter(
      (d) => thirdParties.filter((p) => p.serves.includes(d.id)).length === 1,
    );
    if (soleServed.length > 0) {
      checks.push({
        id: 'chain-visibility',
        title: titleOf('chain-visibility'),
        ratio: { part: soleServed.length, whole: criticalDims.length },
        asserted: `SEAL-${chainSeal} · ${rungDescription(
          questionById.get(CHAIN_VISIBILITY_QUESTION),
          chainSeal,
        )}`,
        structural: `The roster names ${thirdParties.length} ${
          thirdParties.length === 1 ? 'third party' : 'third parties'
        }; ${listPhrase(soleServed.map((d) => d.name))} each ${
          soleServed.length === 1 ? 'stands' : 'stand'
        } on exactly one of them.`,
        question: 'Can the chain really be named below these providers?',
        opens: [openOn(CHAIN_VISIBILITY_QUESTION, { kind: 'assessment' })],
      });
    }
  }

  const unserved = result.declaredDimensions.filter(
    (d) => !result.declaredParties.some((p) => p.serves.includes(d.id)),
  );
  if (unserved.length > 0) {
    checks.push({
      id: 'unserved-dimension',
      title: titleOf('unserved-dimension'),
      ratio: { part: unserved.length, whole: result.declaredDimensions.length },
      asserted: null,
      structural: `${listPhrase(unserved.map((d) => d.name))} ${
        unserved.length === 1 ? 'is' : 'are'
      } declared in scope, and no party on the roster serves ${
        unserved.length === 1 ? 'it' : 'them'
      }.`,
      question: 'Who runs this?',
      opens: [],
    });
  }

  const splitDims = result.declaredDimensions.filter((d) =>
    asserted.some((f) => f.dimension === d.id && f.stratum !== null),
  );
  const wholeOnly = criticalDims.filter((d) => {
    const strata = workbook.dimensions.find((w) => w.id === d.id)?.strata ?? [];
    if (strata.length === 0) return false;
    if (result.facts.some((f) => f.dimension === d.id && f.stratum !== null)) return false;
    return asserted.some((f) => f.dimension === d.id && f.stratum === null);
  });
  if (splitDims.length > 0 && wholeOnly.length > 0) {
    const lowestOf = (dimension: string): HeatFact => {
      const candidates = asserted.filter((f) => f.dimension === dimension && f.stratum === null);
      return [...candidates].sort((a, b) => (a.seal ?? 0) - (b.seal ?? 0))[0]!;
    };
    checks.push({
      id: 'hidden-layer',
      title: titleOf('hidden-layer'),
      // Of the dimensions this estate answers at a layer at all, how many were
      // nonetheless taken whole. The two sets cannot overlap.
      ratio: { part: wholeOnly.length, whole: wholeOnly.length + splitDims.length },
      asserted: `${listPhrase(wholeOnly.map((d) => d.name))} ${
        wholeOnly.length === 1 ? 'was' : 'were'
      } each answered whole.`,
      structural: `${listPhrase(splitDims.map((d) => d.name))} ${
        splitDims.length === 1 ? 'is' : 'are'
      } split into layers; each of these declares layers of its own.`,
      question: 'Is the weakness hiding at one layer?',
      opens: wholeOnly.map((d) =>
        openOn(lowestOf(d.id).questionId, { kind: 'dimension', dimension: d.id }),
      ),
    });
  }

  const strongClaims = result.gating.filter((b) => b.seal >= 3);
  const undefended = strongClaims
    .filter((b) => b.evidence === null)
    .sort((a, b) => b.seal - a.seal);
  if (undefended.length > 0) {
    checks.push({
      id: 'undefended-claim',
      title: titleOf('undefended-claim'),
      ratio: { part: undefended.length, whole: strongClaims.length },
      asserted: `${strongClaims.length} gating ${
        strongClaims.length === 1 ? 'answer claims' : 'answers claim'
      } SEAL-3 or SEAL-4.`,
      structural: `${undefended.length} of them ${
        undefended.length === 1 ? 'records' : 'record'
      } no evidence note.`,
      question: 'Would these hold up if someone asked for the document?',
      opens: undefended.map((b) => openOn(b.questionId, bindingTarget(b))),
    });
  }

  if (checks.length === 0) return { kind: 'clear', reason: CLEAR_REASON };

  return {
    kind: 'flagged',
    headline: `${checks.length} of ${CHECK_COUNT} checks found something to ask about.`,
    caption: CAPTION,
    checks,
  };
}
