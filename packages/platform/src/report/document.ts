import type { Assessment, Party, Workbook } from '../schema';
import type { EngineResult } from '../score-engine';
import type {
  CredibilityTile,
  DontKnowTile,
  EstateWheelTile,
  EvidenceTile,
  ExposureTile,
  FloorTile,
  HeatAxisId,
  HeatTileView,
  ObjectivesTile,
  RibbonModel,
  ScoreTile,
  SecondLookTile,
  StaircaseTile,
  TileSection,
} from '../analytics';
import {
  SECTION_TITLE,
  credibilityTile,
  dontKnowTile,
  estateWheelTile,
  evidenceTile,
  exposureTile,
  floorTile,
  heatTile,
  objectivesTile,
  ribbonModel,
  scoreTile,
  secondLookTile,
  staircaseTile,
} from '../analytics';
import type { CalendarDate, Viewer } from '../merge/history';
import { calendarDateOf, longDateOf } from '../merge/history';
import type { AppendixObjective } from './appendix';
import { reportAppendix } from './appendix';
import type { OfferPointers } from './pointers';
import { offerPointers } from './pointers';
import type { ReportTag, TagOwner } from './tags';
import { questionTags } from './tags';
import type { ReportVendor } from './vendor';
import { reportVendor } from './vendor';

// The Report as a document: the cover and the numbered spine,
// built out of the analytics models the dashboard already returns. Pure — the
// instant and the viewer's calendar arrive stamped by the app shell.

// What the app shell stamps for one Report: the instant it was generated and the
// reader's calendar. The pure module never reads the clock.
export type ReportStamp = {
  // ISO-8601 instant, stamped by the app shell's one clock read.
  generatedAt: string;
  viewer: Viewer;
};

// Page one, unlosable by a forwarded copy.
export const NOT_A_CERTIFICATION: string =
  'This is a self-assessment, not a certification. It records what this estate said about itself on this date — it is not an attestation, an audit result, or evidence for a procurement decision.';

export type ReportCover = {
  estateName: string;
  workbookTitle: string;
  workbookVersion: string;
  // The calendar day in the viewer's zone. Also the date in the saved file's
  // name — one derivation, two presentations.
  generatedOn: CalendarDate;
  // The same day in words, e.g. `14 August 2026`.
  generatedLabel: string;
  // Distinct participants named by the merge ledger. Read off `ribbon`, never
  // counted here.
  contributors: number;
  // The completeness ribbon, verbatim.
  ribbon: RibbonModel;
  notACertification: string;
};

// The four heat readings are one component on four axes (analytics/heat.ts), so
// they are one variant whose id names which axis it pivots.
export type HeatReadingId = 'heat-dimension' | 'heat-stratum' | 'heat-party' | 'heat-role';

// One reading in a section: a heading over the ANALYTICS model behind it. The
// Report adds no numbers — every variant holds a model some
// analytics function already returned, unchanged. The id is the dashboard tile
// this reading is the paper form of.
export type ReportReading =
  | { id: 'floor'; heading: string; model: FloorTile }
  | { id: 'score'; heading: string; model: ScoreTile }
  | { id: 'objectives'; heading: string; model: ObjectivesTile }
  | { id: HeatReadingId; heading: string; model: HeatTileView }
  | { id: 'staircase'; heading: string; model: StaircaseTile }
  | { id: 'exposure'; heading: string; model: ExposureTile }
  | { id: 'dont-know'; heading: string; model: DontKnowTile }
  | { id: 'worth-a-second-look'; heading: string; model: SecondLookTile }
  | { id: 'evidence'; heading: string; model: EvidenceTile }
  | { id: 'estate-wheel'; heading: string; model: EstateWheelTile }
  | { id: 'credibility'; heading: string; model: CredibilityTile };

// A section of the spine (§4.2). The id, the title and the reading order are the
// dashboard's own — `TileSection` / `SECTION_TITLE` — so the document and the
// screen can never disagree about what "Standing" is. The SEQUENCE is this
// module's (`REPORT_SPINE`), because the two are read differently.
export type ReportSection = {
  id: TileSection;
  title: string;
  readings: ReportReading[];
};

// The document's reading order, which is NOT `SECTION_ORDER` (ADR-0020): a
// dashboard is scanned, a document is read once forwards, so this orients before
// it weighs and lands the climb against the offers that address it. `provenance`
// is absent on purpose — it heads the back matter instead.
export const REPORT_SPINE: readonly TileSection[] = [
  'shape',
  'standing',
  'weakness',
  'gaps',
  'action',
];

// How many question rows a body list prints before deferring to the appendix,
// which transcribes every unit. A body list's job is the SELECTION
// and its order — printing the tail as well cost seven pages.
export const REPORT_ROW_LIMIT = 6;

export type ReportDocument = {
  cover: ReportCover;
  // The front matter, in `REPORT_SPINE` order.
  sections: ReportSection[];
  // `null` = no vendor section at all.
  vendor: ReportVendor | null;
  // Back matter, first half: who produced this file and how.
  provenance: ReportSection;
  // Back matter, second half: the transcript. Grouped objective → question →
  // target. aggregates nothing.
  appendix: AppendixObjective[];
  // Reading id → the offers that answer it. Empty where the workbook names no
  // recommender: the pointer is the only place a finding mentions the vendor.
  offers: OfferPointers;
  // question id → the tags whose lists name it. The appendix prints these, and
  // they are how a reader gets from a truncated list back to the record.
  questionTags: Readonly<Record<string, ReportTag[]>>;
};

const HEAT_READINGS: readonly { id: HeatReadingId; axis: HeatAxisId; heading: string }[] = [
  { id: 'heat-dimension', axis: 'dimension', heading: 'Weakness by dimension' },
  { id: 'heat-stratum', axis: 'stratum', heading: 'Weakness by stratum' },
  { id: 'heat-party', axis: 'party', heading: 'Weakness by party' },
  { id: 'heat-role', axis: 'role', heading: 'Weakness by role' },
];

function readingsOf(
  id: TileSection,
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): ReportReading[] {
  switch (id) {
    case 'standing':
      return [
        { id: 'floor', heading: 'Floor', model: floorTile(result, workbook) },
        { id: 'score', heading: 'Score', model: scoreTile(result) },
        { id: 'objectives', heading: 'Objectives', model: objectivesTile(result, workbook) },
      ];
    case 'weakness':
      return HEAT_READINGS.map(({ id: readingId, axis, heading }) => ({
        id: readingId,
        heading,
        model: heatTile(result, workbook, parties, axis),
      }));
    case 'action':
      return [
        { id: 'staircase', heading: 'Staircase', model: staircaseTile(result, workbook, parties) },
        { id: 'exposure', heading: 'Exposure', model: exposureTile(result, workbook) },
      ];
    case 'gaps':
      return [
        { id: 'dont-know', heading: "Don't-know", model: dontKnowTile(result, workbook, parties) },
        { id: 'evidence', heading: 'Evidence', model: evidenceTile(result, workbook, parties) },
        {
          id: 'worth-a-second-look',
          heading: 'Worth a second look',
          model: secondLookTile(result, workbook, parties),
        },
      ];
    case 'shape':
      return [
        {
          id: 'estate-wheel',
          heading: 'Estate wheel',
          model: estateWheelTile(result, workbook, parties),
        },
      ];
    case 'provenance':
      return [{ id: 'credibility', heading: 'Credibility', model: credibilityTile(result, workbook) }];
  }
}

// The questions a reading PRINTS — the left-hand side of an offer pointer. Only
// the rows the page shows count: pointing from the tail matched most of the
// chapter and said nothing, since the appendix names every question there is.
function questionsOf(reading: ReportReading): string[] {
  const head = <T>(rows: readonly T[]): readonly T[] => rows.slice(0, REPORT_ROW_LIMIT);
  switch (reading.id) {
    case 'staircase':
      return reading.model.kind === 'climb'
        ? reading.model.steps.flatMap((step) => head(step.rows).map((row) => row.questionId))
        : [];
    case 'evidence':
      return reading.model.kind === 'covered'
        ? head(reading.model.undefended).map((row) => row.questionId)
        : [];
    case 'dont-know':
      return reading.model.kind === 'admitted'
        ? head(reading.model.rows).map((row) => row.questionId)
        : [];
    case 'worth-a-second-look':
      return reading.model.kind === 'flagged'
        ? reading.model.checks.flatMap((check) => head(check.opens).map((open) => open.questionId))
        : [];
    default:
      return [];
  }
}

// Every list a reading printed, with what it named. The tail is included: the
// tag's whole job is to find the rows the page did NOT print.
function taggedOf(reading: ReportReading): { owner: TagOwner; questionIds: string[] }[] {
  switch (reading.id) {
    case 'staircase':
      return reading.model.kind === 'climb'
        ? reading.model.steps.map((step) => ({
          owner: { kind: 'staircase', floor: step.floor },
          questionIds: step.rows.map((row) => row.questionId),
        }))
        : [];
    case 'evidence':
      return reading.model.kind === 'covered'
        ? [
          {
            owner: { kind: 'evidence' },
            questionIds: reading.model.undefended.map((row) => row.questionId),
          },
        ]
        : [];
    case 'dont-know':
      return reading.model.kind === 'admitted'
        ? [
          {
            owner: { kind: 'dont-know' },
            questionIds: reading.model.rows.map((row) => row.questionId),
          },
        ]
        : [];
    case 'worth-a-second-look':
      return reading.model.kind === 'flagged'
        ? reading.model.checks.map((check, index) => ({
          owner: { kind: 'second-look', index: index + 1 },
          questionIds: check.opens.map((open) => open.questionId),
        }))
        : [];
    default:
      return [];
  }
}

function sectionOf(
  id: TileSection,
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): ReportSection {
  return { id, title: SECTION_TITLE[id], readings: readingsOf(id, result, workbook, parties) };
}

// The one entry point (§3.1). Takes the ASSESSMENT, not only the result: the
// cover names the estate and the appendix reads `answers` for prose.
// Derives no number — every model here comes from `analytics/`.
export function reportDocument(
  assessment: Assessment,
  result: EngineResult,
  stamp: ReportStamp,
): ReportDocument {
  const workbook = assessment.workbook;
  const parties = assessment.parties;
  const generatedOn = calendarDateOf(stamp.generatedAt, stamp.viewer);
  const ribbon = ribbonModel(result);
  const sections = REPORT_SPINE.map((id) => sectionOf(id, result, workbook, parties));
  const vendor = reportVendor(result, workbook, parties);
  const questionsByReading = Object.fromEntries(
    sections.flatMap((section) =>
      section.readings.map((reading) => [reading.id, questionsOf(reading)] as const),
    ),
  );
  return {
    cover: {
      estateName: assessment.meta.estate,
      workbookTitle: workbook.meta.title,
      workbookVersion: workbook.meta.version,
      generatedOn,
      generatedLabel: longDateOf(generatedOn, stamp.viewer),
      contributors: ribbon.contributors,
      ribbon,
      notACertification: NOT_A_CERTIFICATION,
    },
    sections,
    vendor,
    provenance: sectionOf('provenance', result, workbook, parties),
    appendix: reportAppendix(assessment, result),
    offers: offerPointers(vendor, questionsByReading),
    questionTags: questionTags(
      sections.flatMap((section) => section.readings.flatMap((reading) => taggedOf(reading))),
    ),
  };
}
