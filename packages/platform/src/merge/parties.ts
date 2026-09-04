import type {
  Assessment,
  EstateBase,
  Party,
  PartyChoice,
  PartyDecision,
  WorkbookAssessment,
} from '../schema';

// The party axis of one landing: the candidate pairs the model
// puts to the facilitator, the typed decisions they settle, and the vocabulary
// both the card and the ledger read. Pure — no clock, no randomness.

// How two parties' `serves` compare. Every list is in the ESTATE party's own
// `serves` order, with the incoming's extras in its own order — deterministic,
// so a card and a test read the same sequence.
export type ServesDiff = { shared: string[]; baseOnly: string[]; incomingOnly: string[] };

export type AliasPair = {
  kind: 'alias';
  base: Party;
  incoming: Party;
  serves: ServesDiff;
  // The identity tokens both names carry — the evidence behind the rank.
  sharedTokens: string[];
  // 2 × sharedTokens.length + serves.shared.length. Higher ranks first.
  score: number;
  // The id a `split` would give the incoming — its own: no id collides.
  splitId: string;
};

export type IdCollisionPair = {
  kind: 'id-collision';
  // The id both sides used.
  id: string;
  base: Party;
  incoming: Party;
  serves: ServesDiff;
  // The fresh id a `split` would mint, derived from the ids in play.
  splitId: string;
};

export type PartyPair = AliasPair | IdCollisionPair;

// Legal forms and articles carry no identity — dropped before overlap is
// counted, so two unrelated "GmbH"s never look alike.
export const NAME_STOPWORDS: readonly string[] = [
  'ag', 'bv', 'corp', 'gmbh', 'inc', 'limited', 'llc', 'ltd',
  'nv', 'plc', 'sa', 'sarl', 'sas', 'spa', 'srl', 'the',
];

// A name's identity tokens: lowercased, split on every non-alphanumeric run,
// single characters and NAME_STOPWORDS dropped, de-duplicated, in first
// appearance order.
export function nameTokens(name: string): string[] {
  const tokens: string[] = [];
  for (const raw of name.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2) continue;
    if (NAME_STOPWORDS.includes(raw)) continue;
    if (tokens.includes(raw)) continue;
    tokens.push(raw);
  }
  return tokens;
}

const slug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// The id a split gives an addition: its own when nothing in `taken` holds it,
// else `<id>-<participant slug>`, then `-2`, `-3`, … until free. Deterministic
// — derived from the ids in play, never random and never clock-derived.
export function splitIdFor(addedId: string, participant: string, taken: readonly string[]): string {
  if (!taken.includes(addedId)) return addedId;
  const stem = `${addedId}-${slug(participant)}`;
  if (!taken.includes(stem)) return stem;
  let n = 2;
  while (taken.includes(`${stem}-${n}`)) n += 1;
  return `${stem}-${n}`;
}

function servesDiff(base: Party, incoming: Party): ServesDiff {
  return {
    shared: base.serves.filter((s) => incoming.serves.includes(s)),
    baseOnly: base.serves.filter((s) => !incoming.serves.includes(s)),
    incomingOnly: incoming.serves.filter((s) => !base.serves.includes(s)),
  };
}

// The pairs this landing puts to the facilitator.
export function suggestPartyPairs(base: EstateBase, incoming: Assessment): PartyPair[] {
  const added = incoming.partiesAdded ?? [];
  const participant = incoming.meta.participant?.name ?? '';
  const takenIds = base.parties.map((p) => p.id);
  const assessedTypes = new Set(
    incoming.workbook.parties.filter((t) => t.kind === 'assessed').map((t) => t.id),
  );

  const collisions: IdCollisionPair[] = [];
  const aliases: AliasPair[] = [];

  for (const party of added) {
    const collision = base.parties.find((p) => p.id === party.id);
    if (collision !== undefined) {
      const serves = servesDiff(collision, party);
      const identical =
        collision.name === party.name && serves.baseOnly.length === 0 && serves.incomingOnly.length === 0;
      if (!identical) {
        collisions.push({
          kind: 'id-collision',
          id: party.id,
          base: collision,
          incoming: party,
          serves,
          splitId: splitIdFor(party.id, participant, takenIds),
        });
      }
      continue;
    }
    const incomingTokens = nameTokens(party.name);
    for (const candidate of base.parties) {
      if (assessedTypes.has(candidate.type)) continue;
      const sharedTokens = nameTokens(candidate.name).filter((t) => incomingTokens.includes(t));
      if (sharedTokens.length === 0) continue;
      const serves = servesDiff(candidate, party);
      aliases.push({
        kind: 'alias',
        base: candidate,
        incoming: party,
        serves,
        sharedTokens,
        score: 2 * sharedTokens.length + serves.shared.length,
        splitId: splitIdFor(party.id, participant, takenIds),
      });
    }
  }

  aliases.sort(
    (a, b) =>
      b.score - a.score ||
      a.incoming.id.localeCompare(b.incoming.id) ||
      a.base.id.localeCompare(b.base.id),
  );
  return [...collisions, ...aliases];
}

// What one absorb does (invariant #6): the survivor keeps its id and its type,
// takes `name`, and takes the union of `serves` — its own order first, the
// inherited edges appended in the absorbed party's order.
export type Absorption = { party: Party; servesAdded: string[] };
export function absorb(survivor: Party, absorbed: Party, name: string): Absorption {
  const servesAdded = absorbed.serves.filter((s) => !survivor.serves.includes(s));
  return {
    party: { ...survivor, name, serves: [...survivor.serves, ...servesAdded] },
    servesAdded,
  };
}

// The pair's two sides as the card reads them, ESTATE first.
export type PartySide = { from: string; party: Party; typeName: string };
export function pairSides(
  pair: PartyPair,
  wa: WorkbookAssessment,
  participant: string,
): [PartySide, PartySide] {
  const typeName = (party: Party): string =>
    wa.workbook.parties.find((t) => t.id === party.type)?.name ?? party.type;
  return [
    { from: 'The estate', party: pair.base, typeName: typeName(pair.base) },
    { from: participant, party: pair.incoming, typeName: typeName(pair.incoming) },
  ];
}

// Dimension NAMES for these ids, in the given order; an unknown id falls back
// to itself.
export function servesLabels(ids: readonly string[], wa: WorkbookAssessment): string[] {
  return ids.map((id) => wa.workbook.dimensions.find((d) => d.id === id)?.name ?? id);
}

// The card's own heading — the vocabulary lives here, never in markup.
export function pairTitle(pair: PartyPair): string {
  switch (pair.kind) {
    case 'alias':
      return `Same provider? — “${pair.incoming.name}” (${pair.incoming.id}) and “${pair.base.name}” (${pair.base.id})`;
    case 'id-collision':
      return `Same id, two providers — ${pair.id}`;
  }
}

// One enumerated party decision (merge.md §2.5.5, invariant #8). `key`
// identifies the radio AND matches a stored decision's choice.
export type PartyOption = { key: string; label: string; choice: PartyChoice };

export function partyChoiceKey(choice: PartyChoice): string {
  switch (choice.kind) {
    case 'absorb':
      return `absorb:${choice.into}:${choice.name}`;
    case 'split':
      return `split:${choice.id}`;
  }
}

const absorbOption = (into: string, name: string, label: string): PartyOption => ({
  key: partyChoiceKey({ kind: 'absorb', into, name }),
  label,
  choice: { kind: 'absorb', into, name },
});

// The choices a pair offers, in presentation order. NOTHING is pre-selected and
// nothing is suggested — the party axis has no authority ladder, so every
// collapse is a bare human decision.
export function partyOptionsFor(pair: PartyPair, participant: string): PartyOption[] {
  const split: PartyOption = {
    key: partyChoiceKey({ kind: 'split', id: pair.splitId, from: pair.base.id }),
    label:
      pair.splitId === pair.incoming.id
        ? `Two providers — ${participant}’s stays ${pair.splitId}`
        : `Two providers — ${participant}’s becomes ${pair.splitId}`,
    choice: { kind: 'split', id: pair.splitId, from: pair.base.id },
  };
  if (pair.base.name === pair.incoming.name) {
    return [
      absorbOption(pair.base.id, pair.base.name, `One provider — keep the name “${pair.base.name}”`),
      split,
    ];
  }
  return [
    absorbOption(
      pair.base.id,
      pair.base.name,
      `One provider — keep the estate’s name “${pair.base.name}”`,
    ),
    absorbOption(
      pair.base.id,
      pair.incoming.name,
      `One provider — keep ${participant}’s name “${pair.incoming.name}”`,
    ),
    split,
  ];
}

// Record a party decision: any previous decision on the same addition
// replaced, the new one appended last.
export function upsertPartyDecision(
  decisions: PartyDecision[],
  decision: PartyDecision,
): PartyDecision[] {
  return [...decisions.filter((d) => d.added !== decision.added), decision];
}
