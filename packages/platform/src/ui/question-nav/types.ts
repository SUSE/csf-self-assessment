// The public model for the shared question navigator (ui/question-nav). The
// component is domain-agnostic: each app maps its own per-question status to a
// `NavTone` and hands over `NavGroup[]`. Assessment maps `questionCoverageDetail`
// (done / partial / none / na + fraction + don't-know notch); the author maps
// authoring issues to `flag`. Declared here (a sibling .ts), not in the .svelte
// module, so a public input type can be re-exported through the plain-.ts barrel.

/** How a question's tick reads. `flag` is the author's "has issues"; the rest are
 *  coverage states. Only `partial`/`done` carry a meaningful fill height. */
export type NavTone = 'done' | 'partial' | 'none' | 'na' | 'flag';

export type NavQuestion = {
  id: string;
  /** Full question text — the tick's tooltip and accessible detail. */
  text: string;
  tone: NavTone;
  /** 0..1 — how much of the question is placed; only used for `partial`/`done`. */
  fraction: number;
  /** Holds a don't-know inside — an amber notch, top-right. */
  notch?: boolean;
  /** Holds a doesn't-apply (n/a) unit inside — a muted notch, top-left. Distinct
   *  from a whole-question `na` tone (no units in scope). */
  naMark?: boolean;
};

export type NavGroup = {
  id: string;
  /** Objective code, e.g. `SOV-3` — the mono lead of the crumb and map row. */
  code: string;
  /** Objective name, e.g. `Data & AI Sovereignty`. */
  name: string;
  questions: NavQuestion[];
};
