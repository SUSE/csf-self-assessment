import type { Seal } from '../schema';

// What a tag names: one list the analysis printed. A list is a SELECTION of the
// record — the rungs to SEAL-2, the undefended claims — so its members can be
// found again in the transcript without the analysis reprinting them.
export type TagOwner =
  | { kind: 'evidence' }
  | { kind: 'dont-know' }
  | { kind: 'staircase'; floor: Seal }
  | { kind: 'second-look'; index: number };

// A printed cross-reference. `label` is the whole mechanism: paper has no links,
// so the reader searches the PDF for this exact string and lands on every
// appendix question the list covers.
export type ReportTag = {
  // Stable identity for keyed rendering.
  key: string;
  // The searchable token — `#CLIMB-2`, `#EVID`.
  label: string;
  // Which list this tag is for. The badge takes its colour from this — one slot
  // of the theme's tag plane per family (ui/theme.css).
  family: TagOwner['kind'];
  // The seal a `staircase` tag names, so the badge can wear that floor's swatch
  // instead of a tag slot; null on every other family.
  seal: Seal | null;
};

export function reportTag(owner: TagOwner): ReportTag {
  switch (owner.kind) {
    case 'evidence':
      return { key: 'evidence', label: '#EVID', family: 'evidence', seal: null };
    case 'dont-know':
      return { key: 'dont-know', label: '#DK', family: 'dont-know', seal: null };
    case 'staircase':
      return {
        key: `staircase:${owner.floor}`,
        label: `#CLIMB-${owner.floor}`,
        family: 'staircase',
        seal: owner.floor,
      };
    case 'second-look':
      return {
        key: `second-look:${owner.index}`,
        label: `#LOOK-${owner.index}`,
        family: 'second-look',
        seal: null,
      };
  }
}

// question id → every tag whose list names it, in the order the tags were
// collected. A question in two lists carries two badges: that is the fact, not a
// clash.
export function questionTags(
  tagged: readonly { owner: TagOwner; questionIds: readonly string[] }[],
): Readonly<Record<string, ReportTag[]>> {
  const byQuestion: Record<string, ReportTag[]> = {};
  for (const { owner, questionIds } of tagged) {
    const tag = reportTag(owner);
    for (const questionId of questionIds) {
      const seen = byQuestion[questionId] ?? [];
      if (!seen.some((t) => t.key === tag.key)) seen.push(tag);
      byQuestion[questionId] = seen;
    }
  }
  return byQuestion;
}
