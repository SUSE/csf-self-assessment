import type { Horizon, Party, Recommendation, RecommendationLink, Seal, Workbook } from '../schema';
import type { EngineResult, HeatFact } from '../score-engine';
import { targetLabel } from '../utils/target-label';

/** One link that fired, with the reading that fired it. `label` is the authored
 *  NAME for a dimension or objective link and the question ID for a question
 *  link — a question's text is a sentence, too long for a chip, and the id is
 *  the sharpest handle an author has. */
export type FiredLink = { link: RecommendationLink; label: string; seal: Seal };

/** One answered target behind the trigger — the heat detail row idiom
 *  (docs/specs/recommendations.md §4.3). */
export type TriggerTarget = {
  /** `<questionId>|<dimension>|<stratum>|<party>` — the StaircaseRowView idiom. */
  key: string;
  targetLabel: string;
  seal: Seal;
};

/** The answers behind the trigger, grouped by the QUESTION that carries them. A
 *  dimension-grain question answered across eleven dimensions is one sentence
 *  eleven times if it is not grouped, which is what the evidence panel showed
 *  before the page had room to say it properly. */
export type TriggerQuestion = {
  questionId: string;
  questionText: string;
  /** The weakest seal among `targets` — what this question contributes. */
  seal: Seal;
  targets: TriggerTarget[];
};

export type RecommendationCard = {
  id: string;
  title: string;
  action: string;
  body: string[];
  horizon: Horizon;
  /** The lowest-sealed link that fired — the trigger chip at tile size. Ties
   *  break on authored link order. */
  trigger: FiredLink;
  /** Every link that fired, in authored order. */
  fired: FiredLink[];
  /** The answered facts the TRIGGER link covers, weakest question first. */
  questions: TriggerQuestion[];
};

export type BandView =
  | { kind: 'cards'; cards: RecommendationCard[] }
  | { kind: 'none-authored'; reason: string }
  | { kind: 'none-fired'; authored: number; reason: string };

/** One horizon's chapter of the Recommendations page, with the wording it is read
 *  under — the page composes no strings of its own. */
export type HorizonChapter = {
  horizon: Horizon;
  title: string;
  /** The question this chapter answers, the dashboard tile's `asks` idiom. */
  asks: string;
  /** When the reader would act on it. */
  when: string;
  band: BandView;
};

/** The whole page: who is offering, then the two horizons in reading order. */
export type RecommendationsPage = {
  recommender: RecommenderReading;
  chapters: HorizonChapter[];
};

export type RecommenderReading =
  | {
      kind: 'recommender';
      name: string;
      /** `Recommendations from SUSE`. */
      headline: string;
      disclosure: string;
      contact: { label: string; url: string } | null;
      live: number;
      catalogue: number;
      /** `1 of 1 live on this estate`. */
      reading: string;
    }
  | { kind: 'absent'; reason: string };

/** One paragraph of a `body`, already classified for rendering: a run of
 *  consecutive `'- '` lines becomes one bullets block. */
export type BodyBlock =
  | { kind: 'paragraph'; key: string; text: string }
  | { kind: 'bullets'; key: string; items: string[] };

const BAND_WORD: Readonly<Record<Horizon, string>> = {
  renewal: 'renewal',
  strategic: 'strategic',
};

export function bodyBlocks(body: readonly string[]): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let openBullets = false;
  body.forEach((line, i) => {
    if (line.startsWith('- ')) {
      const item = line.slice(2);
      const last = blocks[blocks.length - 1];
      if (openBullets && last !== undefined && last.kind === 'bullets') {
        last.items.push(item);
      } else {
        blocks.push({ kind: 'bullets', key: `b:${i}`, items: [item] });
        openBullets = true;
      }
      return;
    }
    openBullets = false;
    blocks.push({ kind: 'paragraph', key: `p:${i}`, text: line });
  });
  return blocks;
}

function covers(fact: HeatFact, link: RecommendationLink): boolean {
  switch (link.kind) {
    case 'question':
      return fact.questionId === link.id;
    case 'dimension':
      return fact.dimension === link.id;
    case 'objective':
      return fact.objective === link.id;
  }
}

function linkLabel(workbook: Workbook, link: RecommendationLink): string {
  switch (link.kind) {
    case 'question':
      return link.id;
    case 'dimension':
      return workbook.dimensions.find((d) => d.id === link.id)?.name ?? link.id;
    case 'objective':
      return workbook.objectives.find((o) => o.id === link.id)?.name ?? link.id;
  }
}

/** Every link of `recommendation` that fires, in authored order (§2.3). Empty =
 *  the recommendation is silent on this estate. */
export function firedLinks(
  recommendation: Recommendation,
  facts: readonly HeatFact[],
  workbook: Workbook,
): FiredLink[] {
  const fired: FiredLink[] = [];
  for (const link of recommendation.links) {
    const seals = facts
      .filter((f) => f.state === 'answered' && covers(f, link))
      .map((f) => f.seal)
      .filter((seal): seal is Seal => seal !== null);
    if (seals.length === 0) continue;
    const weakest = seals.reduce((lowest, seal) => (seal < lowest ? seal : lowest), seals[0]!);
    if (weakest <= recommendation.whenAtOrBelow) {
      fired.push({ link, label: linkLabel(workbook, link), seal: weakest });
    }
  }
  return fired;
}

function triggerOf(fired: readonly FiredLink[]): FiredLink {
  return fired.reduce((lowest, f) => (f.seal < lowest.seal ? f : lowest), fired[0]!);
}

function triggerQuestions(
  workbook: Workbook,
  parties: Party[],
  facts: readonly HeatFact[],
  trigger: FiredLink,
): TriggerQuestion[] {
  const text = new Map(workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]));
  const grouped = new Map<string, TriggerQuestion>();
  for (const f of facts) {
    if (f.state !== 'answered' || f.seal === null || !covers(f, trigger.link)) continue;
    const group = grouped.get(f.questionId) ?? {
      questionId: f.questionId,
      questionText: text.get(f.questionId) ?? f.questionId,
      seal: f.seal,
      targets: [],
    };
    group.seal = f.seal < group.seal ? f.seal : group.seal;
    group.targets.push({
      key: `${f.questionId}|${f.dimension}|${f.stratum}|${f.party}`,
      targetLabel: targetLabel(workbook, parties, f.target),
      seal: f.seal,
    });
    grouped.set(f.questionId, group);
  }
  for (const group of grouped.values()) group.targets.sort((a, b) => a.seal - b.seal);
  return [...grouped.values()].sort((a, b) => a.seal - b.seal);
}

function bandView(
  horizon: Horizon,
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): BandView {
  const authored = workbook.recommendations
    .filter((r) => r.horizon === horizon)
    .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)));
  if (authored.length === 0) {
    return {
      kind: 'none-authored',
      reason: `No ${BAND_WORD[horizon]}-scale recommendations in this workbook.`,
    };
  }
  const cards: RecommendationCard[] = [];
  for (const recommendation of authored) {
    const fired = firedLinks(recommendation, result.facts, workbook);
    if (fired.length === 0) continue;
    const trigger = triggerOf(fired);
    cards.push({
      id: recommendation.id,
      title: recommendation.title,
      action: recommendation.action,
      body: recommendation.body,
      horizon: recommendation.horizon,
      trigger,
      fired,
      questions: triggerQuestions(workbook, parties, result.facts, trigger),
    });
  }
  if (cards.length === 0) {
    const n = authored.length;
    return {
      kind: 'none-fired',
      authored: n,
      reason: `${n} ${BAND_WORD[horizon]} ${
        n === 1 ? 'recommendation is' : 'recommendations are'
      } authored; none matches this estate’s answers yet.`,
    };
  }
  return { kind: 'cards', cards };
}

export function recommenderReading(result: EngineResult, workbook: Workbook): RecommenderReading {
  const recommender = workbook.recommender;
  if (recommender === undefined) {
    return {
      kind: 'absent',
      reason: 'This workbook names no recommender, so nothing here is attributed.',
    };
  }
  const catalogue = workbook.recommendations.length;
  const live = workbook.recommendations.filter(
    (r) => firedLinks(r, result.facts, workbook).length > 0,
  ).length;
  return {
    kind: 'recommender',
    name: recommender.name,
    headline: `Recommendations from ${recommender.name}`,
    disclosure: recommender.disclosure,
    contact: recommender.contact ?? null,
    live,
    catalogue,
    reading: `${live} of ${catalogue} live on this estate`,
  };
}

const CHAPTERS: ReadonlyArray<Omit<HorizonChapter, 'band'>> = [
  {
    horizon: 'renewal',
    title: 'Quick wins',
    asks: 'What can we fix in the short term?',
    when: 'Zero to six months',
  },
  {
    horizon: 'strategic',
    title: 'Strategic moves',
    asks: 'What is the 12–36 month programme?',
    when: 'Over 12–36 months',
  },
];

export function recommendationsPage(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): RecommendationsPage {
  return {
    recommender: recommenderReading(result, workbook),
    chapters: CHAPTERS.map((chapter) => ({
      ...chapter,
      band: bandView(chapter.horizon, result, workbook, parties),
    })),
  };
}
