import { z } from 'zod';
import type { LedgerRecord, PartyLedgerRecord } from '../schema';
import { TargetSchema } from '../schema';
import { targetKey } from '../assessment';

// Which affected record inside a Landing a reading is anchored on (§4.5): what the
// navigator marks `aria-current`, and the panel Back returns to. Identity is
// DERIVED from the record — never its position in `records`.
export const RecordRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('party'), party: z.string().min(1) }),
  z.object({ kind: z.literal('answer'), questionId: z.string().min(1), target: TargetSchema }),
]);

export type RecordRef = z.infer<typeof RecordRefSchema>;

// The party a party record's decision is ABOUT — the incoming representation for
// `absorb`, the colliding id for `rename`, the fresh id for `split`, the joining
// party for `add`. Unique inside one Landing: at most one decision settles each
// incoming addition.
export function partySubject(record: PartyLedgerRecord): string {
  const decision = record.decision;
  switch (decision.kind) {
    case 'add':
      return decision.party;
    case 'absorb':
      return decision.from;
    case 'rename':
      return decision.party;
    case 'split':
      return decision.id;
  }
}

export function recordRef(record: LedgerRecord): RecordRef {
  switch (record.kind) {
    case 'party':
      return { kind: 'party', party: partySubject(record) };
    case 'answer':
      return { kind: 'answer', questionId: record.questionId, target: record.target };
  }
}

export function sameRecordRef(a: RecordRef, b: RecordRef): boolean {
  if (a.kind === 'party') return b.kind === 'party' && a.party === b.party;
  return (
    b.kind === 'answer' &&
    a.questionId === b.questionId &&
    targetKey(a.target) === targetKey(b.target)
  );
}

// A stable string for `{#each}` keys and the `data-record` attribute the detail
// scrolls to: `party:<id>` or `answer:<questionId> <targetKey>`.
export function recordRefKey(ref: RecordRef): string {
  return ref.kind === 'party'
    ? `party:${ref.party}`
    : `answer:${ref.questionId} ${targetKey(ref.target)}`;
}
