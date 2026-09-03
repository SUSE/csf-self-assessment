import type { Party, PartyLedgerRecord } from '../schema';
import { targetLabel } from '../utils/target-label';
import { servesLabels } from './parties';
import type { RecordRef } from './record-ref';
import { partySubject, recordRef } from './record-ref';
import type { DetailContext } from './detail-context';

// One party record as the detail reads it (§4.7): the roster either side of the
// decision, and every answer target the decision rewrote.

export type PartyReading = { id: string; name: string; typeName: string; serves: string[] };

export type TargetRewriteReading = { questionId: string; before: string; after: string };

export type PartyPanel = {
  kind: 'party';
  ref: RecordRef;
  label: string;
  decision: string;
  rationale: string | null;
  before: PartyReading[];
  after: PartyReading[];
  rewrites: TargetRewriteReading[];
};

// `before` = [estate side, …incoming side] and `after` = the resulting parties by
// POSITION (§2.3.2, ADR-0015): a `rename` puts two parties carrying the same id in
// `before`, so no id lookup can tell the sides apart.
function partyHeadline(record: PartyLedgerRecord): string {
  const decision = record.decision;
  switch (decision.kind) {
    case 'add':
      return `Added ${record.after[0].name}`;
    case 'absorb':
      return `Absorbed ${record.before[1].name} into ${record.before[0].name} as “${decision.name}”`;
    case 'rename':
      return `Renamed ${record.before[1].name} to “${decision.name}”`;
    case 'split':
      return `Kept ${record.after[1].name} separate as ${decision.id}`;
  }
}

export function partyPanel(record: PartyLedgerRecord, ctx: DetailContext): PartyPanel {
  const wa = ctx.workbookAssessment;
  const reading = (party: Party): PartyReading => ({
    id: party.id,
    name: party.name,
    typeName: wa.workbook.parties.find((type) => type.id === party.type)?.name ?? party.type,
    serves: servesLabels(party.serves, wa),
  });
  const subject = partySubject(record);
  const named = [...record.after, ...record.before].find((party) => party.id === subject);
  const note = record.decision.kind === 'add' ? '' : record.decision.note;
  return {
    kind: 'party',
    ref: recordRef(record),
    label: named?.name ?? subject,
    decision: partyHeadline(record),
    rationale: note === '' ? null : note,
    before: record.before.map(reading),
    after: record.after.map(reading),
    rewrites: record.affectedTargets.map((rewrite) => ({
      questionId: rewrite.questionId,
      before: targetLabel(wa.workbook, ctx.parties, rewrite.before),
      after: targetLabel(wa.workbook, ctx.parties, rewrite.after),
    })),
  };
}
