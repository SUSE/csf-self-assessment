import type { Workbook } from '../../schema';
import { authorGauges, type AuthorGauges } from '../../author';
import {
  instrumentModel,
  type InstrumentModel,
  type InstrumentSection,
  type InstrumentStats,
} from './model';
// Deep import: the rails' shared "a question and its units" shape. Going through
// the inspector barrel would pull this wheel back in through the subject union.
import { byObjective, type ObjectiveGroupView } from '../inspector/question-blocks';

// The author overview's readings ledger, as one table. A reading has TWO faces:
// the row (a count, and what it is measured against) and its Inspector detail
// (what was counted, named one by one). They used to be two per-id dispatches in
// two modules, so adding a reading touched four places and the halves could
// drift; here one entry carries both.

// Two tones, because the eight readings were flagging three different kinds of
// thing in one brick red — a budget the author is over, weights that don't sum,
// roles nobody uses, AND a dimension no question reaches. Only the last is a hole
// in the instrument; the rest are dials to turn. So:
//
//   'advise' — amber, the theme's "act here" accent. Something for the author to
//              adjust. Not a defect; the workbook is still coherent.
//   'gap'    — brick, the theme's alarm. Something is MISSING, and the wheel is
//              already drawing it as a dashed stub on the matching spoke. Sharing
//              one hue is what ties the reading to the spoke it refers to.
//
// Neither tone is the only carrier: the note names the problem in words, and a gap
// is additionally the only reading whose finding also appears on the wheel.
export type ReadingTone = 'advise' | 'gap';

/** The ledger's rows, in the order they are read. */
export const READING_IDS = [
  'objectives',
  'questions',
  'answer-units',
  'dimensions',
  'strata',
  'party-types',
  'roles',
  'test-estates',
] as const;

/** The stable id of a ledger row — what an Inspector selection carries. */
export type ReadingId = (typeof READING_IDS)[number];

export type Reading = {
  /** Stable across renders and reloads — the row's identity in a selection. */
  id: ReadingId;
  /** What is counted — the row's name. */
  label: string;
  /** The count itself. */
  value: string;
  /** The qualifier: what the count is measured against, or what is wrong with it. */
  note: string;
  // Explicitly `| undefined`: the entries below compute this with a ternary, and
  // `exactOptionalPropertyTypes` distinguishes an absent key from a present
  // `undefined` one.
  tone?: ReadingTone | undefined;
  /** Where the workbench jumps when the row is activated. Absent = not navigable. */
  section?: InstrumentSection;
};

export type ReadingItem = {
  /** The thing counted — an objective, a dimension, a role. */
  name: string;
  /** What it contributes to the count, or what is wrong with it. */
  note: string;
  /** Same two tones as the row: a dial to turn, or a hole in the instrument. */
  tone?: ReadingTone | undefined;
};

export type ReadingInspection = Reading & {
  /** One sentence saying what the count is a count OF. */
  lead: string;
  /** The plain list. Empty where the reading is read as questions instead. */
  items: ReadingItem[];
  /** A count OF QUESTIONS is read the way every other rail reads questions —
   *  grouped by the objective (SOV) that asks them. Empty for every other row. */
  groups: ObjectiveGroupView[];
  /** Shown instead of the list when nothing is counted yet. */
  empty: string;
};

/** What a detail reads from: the definition, and the two readouts over it.
 *  Resolved once per call so eight entries don't each recompute them. */
type Source = { workbook: Workbook; gauges: AuthorGauges; model: InstrumentModel };

type Detail = {
  lead: string;
  items: ReadingItem[];
  groups?: ObjectiveGroupView[];
  empty: string;
};

/** One reading: the row it projects from the stats, and the detail behind it. */
type ReadingEntry = {
  row: (s: InstrumentStats) => Omit<Reading, 'id'>;
  detail: (source: Source) => Detail;
};

const fmtMin = (m: number): string => (Number.isInteger(m) ? String(m) : m.toFixed(1));
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
const roleName = (workbook: Workbook, id: string): string =>
  workbook.roles.find((role) => role.id === id)?.name ?? id;

// `Record<ReadingId, …>` is the exhaustiveness check: a new id in READING_IDS has
// no entry until one is written here, and a stale entry has no id.
const READINGS: Record<ReadingId, ReadingEntry> = {
  objectives: {
    row: (s) => ({
      label: 'Objectives',
      value: String(s.objectives),
      note: s.weightSum === 100 ? 'weights balanced' : `weights ${s.weightSum} / 100`,
      tone: s.weightSum !== 100 ? 'advise' : undefined,
      section: 'objectives',
    }),
    detail: ({ workbook }) => ({
      lead: 'What the instrument scores, and the share of the score each objective carries.',
      empty: 'No objective yet — an instrument needs at least one.',
      items: workbook.objectives.map((objective) => ({
        name: objective.name,
        note: `weight ${objective.weight} · ${plural(objective.questions.length, 'question')}`,
      })),
    }),
  },

  questions: {
    row: (s) => ({
      label: 'Questions',
      value: String(s.questions),
      note: `${s.dimensionGrain} dimension · ${s.partyGrain} party · target ${s.questionTarget}`,
      tone: s.questions > s.questionTarget ? 'advise' : undefined,
      section: 'objectives',
    }),
    // The one reading whose members ARE questions, so it reuses the rails' shared
    // group-by-objective face rather than restating question text as a flat list.
    detail: ({ workbook }) => ({
      lead: 'Every question, grouped by the objective that asks it.',
      empty: 'No question yet.',
      items: [],
      groups: byObjective(
        workbook.objectives,
        workbook.objectives.flatMap((objective) =>
          objective.questions.map((question) => ({
            questionId: question.id,
            text: question.text,
            chips: [
              roleName(workbook, question.role),
              question.grain === 'party'
                ? question.axis === 'party'
                  ? 'per party'
                  : 'whole estate'
                : plural(question.appliesTo.length, 'dimension'),
            ],
            units: [],
          })),
        ),
      ),
    }),
  },

  'answer-units': {
    row: (s) => ({
      label: 'Answer units',
      value: String(s.answerUnits),
      note: `~${fmtMin(s.estimatedMinutes)} min · target ${s.minutesTarget}`,
      tone: s.estimatedMinutes > s.minutesTarget ? 'advise' : undefined,
    }),
    // Answer units are the FAN-OUT, so they are read on the axis they fan onto —
    // the same chips the wheel draws, which is where the count comes from.
    detail: ({ model }) => ({
      lead: 'Where the questions land: one unit per question per axis it is asked on.',
      empty: 'Nothing fans out yet.',
      items: model.chips.map((chip) => ({
        name: chip.name,
        note: plural(chip.count, 'unit'),
        tone: chip.empty ? ('gap' as const) : undefined,
      })),
    }),
  },

  dimensions: {
    row: (s) => ({
      label: 'Dimensions',
      value: String(s.dimensions),
      note:
        `${s.criticalDimensions} critical` +
        (s.uncoveredDimensions > 0 ? ` · ${s.uncoveredDimensions} uncovered` : ''),
      // The one gap, not an advisory: it is a dimension the instrument cannot read
      // at all, and it is the same finding the wheel draws as a brick stub.
      tone: s.uncoveredDimensions > 0 ? 'gap' : undefined,
      section: 'dimensions',
    }),
    detail: ({ workbook, gauges }) => {
      const uncovered = new Set(gauges.coverage.uncoveredDimensions);
      return {
        lead: 'The technical axes the instrument reads. A critical one can floor the estate.',
        empty: 'No dimension yet.',
        items: workbook.dimensions.map((dimension) => ({
          name: dimension.name,
          note: uncovered.has(dimension.id)
            ? 'no question reaches it'
            : dimension.critical
              ? 'critical'
              : 'in scope',
          tone: uncovered.has(dimension.id) ? ('gap' as const) : undefined,
        })),
      };
    },
  },

  strata: {
    row: (s) => ({
      label: 'Strata',
      value: String(s.strata),
      note:
        s.splitDimensions === 0
          ? 'no dimension splits'
          : `across ${s.splitDimensions} dimension${s.splitDimensions === 1 ? '' : 's'}`,
      section: 'dimensions',
    }),
    detail: ({ workbook }) => ({
      lead: 'The layers a dimension splits into. A dimension with no split is read whole.',
      empty: 'No dimension yet.',
      items: workbook.dimensions.map((dimension) => ({
        name: dimension.name,
        note:
          dimension.strata && dimension.strata.length > 0
            ? dimension.strata.join(' · ')
            : 'no split',
      })),
    }),
  },

  'party-types': {
    row: (s) => ({
      label: 'Party types',
      value: String(s.partyTypes),
      note: `1 assessed · ${s.thirdPartyTypes} third-party`,
      section: 'parties',
    }),
    detail: ({ workbook }) => ({
      lead: 'The classes of party in the estate’s authority and supply chain.',
      empty: 'No party type yet.',
      items: workbook.parties.map((party) => ({
        name: party.name,
        note: party.kind === 'assessed' ? 'assessed party' : 'third party',
      })),
    }),
  },

  roles: {
    row: (s) => ({
      label: 'Roles',
      value: String(s.roles),
      note: s.unusedRoles > 0 ? `${s.unusedRoles} unused` : 'all in use',
      tone: s.unusedRoles > 0 ? 'advise' : undefined,
      section: 'roles',
    }),
    detail: ({ workbook, gauges }) => ({
      lead: 'Who answers in the room, and how much of the workshop each one carries.',
      empty: 'No role yet.',
      items: gauges.roleReadout.loads.map((load) => ({
        name: roleName(workbook, load.role),
        note:
          load.questionCount === 0
            ? 'no question uses it'
            : `${plural(load.questionCount, 'question')} · ~${load.estimatedMinutes} min`,
        tone: load.questionCount === 0 ? ('advise' as const) : undefined,
      })),
    }),
  },

  'test-estates': {
    row: (s) => ({
      label: 'Test estates',
      value: String(s.testEstates),
      note: s.testEstates === 0 ? 'none yet' : 'evaluated live',
      section: 'testEstates',
    }),
    detail: ({ workbook }) => ({
      lead: 'Reference estates this workbook is measured against, evaluated live as you edit.',
      empty: 'No test estate yet — add one to see a floor move as you edit.',
      items: workbook.testEstates.map((estate) => ({
        name: estate.name,
        note: `${plural(estate.answers.length, 'answer')} · ${estate.parties.length} part${estate.parties.length === 1 ? 'y' : 'ies'}`,
      })),
    }),
  },
};

/** The ledger: every row, in READING_IDS order. */
export function instrumentReadings(s: InstrumentStats): Reading[] {
  return READING_IDS.map((id) => ({ id, ...READINGS[id].row(s) }));
}

/** The reading behind a ledger row. Derived from the definition alone and
 *  resolved every render, so a count is never stale. Every ReadingId has an
 *  entry (the Record above is exhaustive), so there is no missing-row case. */
export function readingInspection(workbook: Workbook, id: ReadingId): ReadingInspection {
  const entry = READINGS[id];
  const model = instrumentModel(workbook);
  // `groups` defaults empty here rather than in seven identical entries — only the
  // questions reading has any.
  return {
    id,
    ...entry.row(model.stats),
    groups: [],
    ...entry.detail({ workbook, gauges: authorGauges(workbook), model }),
  };
}
