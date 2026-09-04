import type { Landing, Workbook } from '../schema';
import type { RecordRef } from './record-ref';
import { sameRecordRef } from './record-ref';
import type { AnswerPanel } from './detail-answer';
import { UNPLACED_OBJECTIVE, answerPanel } from './detail-answer';
import type { PartyPanel } from './detail-party';
import { partyPanel } from './detail-party';
import type { DetailContext, LandingHeading, LandingNeighbors } from './detail-context';
import { landingHeading, landingNeighbors } from './detail-context';

// The whole Landing as the navigator lays it out (§4.5, §4.8, §3.4): panels
// grouped into sections, the search over them, and what the changes column
// opens and mounts.

export type DetailPanel = AnswerPanel | PartyPanel;

// A navigator section and the panels beneath it. `open` is the DEFAULT
// disclosure. what is actually open is `groupRenderings`.
export type DetailGroup = {
  kind: 'parties' | 'objective' | 'agreements';
  id: string;
  label: string;
  panels: DetailPanel[];
  open: boolean;
};

export type LandingDetail = {
  heading: LandingHeading;
  neighbors: LandingNeighbors;
  groups: DetailGroup[];
  recordCount: number;
};

function objectiveOf(
  workbook: Pick<Workbook, 'objectives'>,
  questionId: string,
): { id: string; name: string } {
  const owning = workbook.objectives.find((objective) =>
    objective.questions.some((question) => question.id === questionId),
  );
  return owning === undefined ? UNPLACED_OBJECTIVE : { id: owning.id, name: owning.name };
}

export function landingDetail(
  landing: Landing,
  ledger: readonly Landing[],
  ctx: DetailContext,
): LandingDetail {
  const workbook = ctx.workbookAssessment.workbook;
  const parties: DetailPanel[] = [];
  const byObjective = new Map<string, { name: string; panels: DetailPanel[] }>();
  const agreementsBy = new Map<string, { name: string; panels: DetailPanel[] }>();
  const bucket = (
    into: Map<string, { name: string; panels: DetailPanel[] }>,
    objective: { id: string; name: string },
  ): DetailPanel[] => {
    const existing = into.get(objective.id);
    if (existing !== undefined) return existing.panels;
    const fresh = { name: objective.name, panels: [] };
    into.set(objective.id, fresh);
    return fresh.panels;
  };

  for (const record of landing.records) {
    if (record.kind === 'party') {
      parties.push(partyPanel(record, ctx));
      continue;
    }
    const objective = objectiveOf(workbook, record.questionId);
    const panel = answerPanel(record, objective, ctx);
    const into = record.decision.kind === 'agreed' ? agreementsBy : byObjective;
    bucket(into, objective).push(panel);
  }

  const order = [...workbook.objectives.map((o) => o.id), UNPLACED_OBJECTIVE.id];
  const groups: DetailGroup[] = [];
  if (parties.length > 0) {
    groups.push({ kind: 'parties', id: 'parties', label: 'Parties', panels: parties, open: true });
  }
  for (const id of order) {
    const held = byObjective.get(id);
    if (held === undefined) continue;
    groups.push({ kind: 'objective', id, label: held.name, panels: held.panels, open: true });
  }
  for (const id of order) {
    const held = agreementsBy.get(id);
    if (held === undefined) continue;
    groups.push({
      kind: 'agreements',
      id: `agreements:${id}`,
      label: `${held.name} · agreements`,
      panels: held.panels,
      open: false,
    });
  }
  return {
    heading: landingHeading(landing, ctx),
    neighbors: landingNeighbors(ledger, landing.id),
    groups,
    recordCount: groups.reduce((total, group) => total + group.panels.length, 0),
  };
}

const panelTerms = (panel: DetailPanel): string[] =>
  panel.kind === 'answer'
    ? [
      panel.questionId,
      panel.questionText,
      panel.targetLabel,
      panel.decision,
      ...(panel.clash === null ? [] : [panel.clash]),
    ]
    : [
      panel.label,
      panel.decision,
      ...[...panel.before, ...panel.after].flatMap((party) => [party.id, party.name]),
    ];

// The navigator's search inside one Landing (§4.5): question id, question text,
// target label, party name, decision headline and clash class. An empty or blank
// query returns `detail` unchanged; otherwise each group keeps only its matching
// panels, empty groups fall away, and `recordCount` describes what survives.
export function filterDetail(detail: LandingDetail, query: string): LandingDetail {
  const entry = query.trim().toLowerCase();
  if (entry === '') return detail;
  const groups: DetailGroup[] = [];
  for (const group of detail.groups) {
    const panels = group.panels.filter((panel) =>
      panelTerms(panel).some((term) => term.toLowerCase().includes(entry)),
    );
    if (panels.length > 0) groups.push({ ...group, panels });
  }
  return {
    ...detail,
    groups,
    recordCount: groups.reduce((total, group) => total + group.panels.length, 0),
  };
}

export function groupOf(groups: readonly DetailGroup[], ref: RecordRef): DetailGroup | null {
  return groups.find((group) => group.panels.some((panel) => sameRecordRef(panel.ref, ref))) ?? null;
}

// One group as the changes column renders it: whether it is open (default
// disclosure, overridden by what the facilitator toggled, and always open when it
// holds the anchored record) and whether it offers Expand all (the selected
// group, or every group while the navigator is filtered).
export type GroupRendering = {
  group: DetailGroup;
  open: boolean;
  expandAll: boolean;
  // This group holds the anchored record — why it is forced open (§4.5).
  holdsSelected: boolean;
};

export function groupRenderings(
  groups: readonly DetailGroup[],
  selected: RecordRef | null,
  toggles: Readonly<Record<string, boolean>>,
  filtered: boolean,
): GroupRendering[] {
  const holding = selected === null ? null : groupOf(groups, selected);
  return groups.map((group) => {
    const holds = holding !== null && holding.id === group.id;
    return {
      group,
      open: holds || (toggles[group.id] ?? group.open),
      expandAll: filtered || holds,
      holdsSelected: holds,
    };
  });
}

// Height reserved per not-yet-mounted panel, in CSS pixels. An open group that
// has not mounted holds its place, so the scroll region's height is honest and a
// group far below the viewport stays far below it. 280 ≈ the mean panel height
// measured in the S3 acceptance drive (18444px of overflow over 65 records).
export const PANEL_RESERVE_PX = 280;

// One group once mounting is decided (§3.4.2–§3.4.4): `mounted` — its panels are
// in the DOM; `reserve` — the placeholder height in CSS pixels for an OPEN group
// whose panels are not mounted yet, and 0 in every other case.
export type GroupMounting = GroupRendering & { mounted: boolean; reserve: number };

// Decide what the changes column mounts. `mounted` is the STICKY set the column
// accumulates: a group id enters it when the group approaches the scroll viewport
// and never leaves it (once mounted, it stays mounted for stable keyboard focus and
// scroll). A group's panels render when it is open AND (its id
// is in the set OR it holds the anchored record — §3.4.4, selection materialises
// its target before scrolling). A closed group never mounts and never reserves.
export function groupMountings(
  renderings: readonly GroupRendering[],
  mounted: Readonly<Record<string, boolean>>,
): GroupMounting[] {
  return renderings.map((rendering) => {
    const isMounted =
      rendering.open && (rendering.holdsSelected || mounted[rendering.group.id] === true);
    return {
      ...rendering,
      mounted: isMounted,
      reserve:
        rendering.open && !isMounted ? rendering.group.panels.length * PANEL_RESERVE_PX : 0,
    };
  });
}

// The panel a ref names — what the narrow-width bar keeps visible as the current
// record identity. Null when nothing is anchored or the ref names none.
export function panelOf(
  groups: readonly DetailGroup[],
  ref: RecordRef | null,
): DetailPanel | null {
  if (ref === null) return null;
  for (const group of groups) {
    const panel = group.panels.find((candidate) => sameRecordRef(candidate.ref, ref));
    if (panel !== undefined) return panel;
  }
  return null;
}
