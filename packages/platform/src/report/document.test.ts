import { describe, expect, it } from 'vitest';
import {
  SECTION_ORDER,
  SECTION_TITLE,
  TILE_IDS,
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
import { SUBJECT_A, SUBJECT_EMPTY } from '../analytics/subjects-fixture';
import type { ReportStamp } from './document';
import { NOT_A_CERTIFICATION, REPORT_SPINE, reportDocument } from './document';
import { reportVendor } from './vendor';

const BERLIN: ReportStamp = {
  generatedAt: '2026-08-14T09:30:00.000Z',
  viewer: { locale: 'en-GB', zone: 'Europe/Berlin' },
};
const AUCKLAND: ReportStamp = {
  generatedAt: '2026-08-14T23:30:00.000Z',
  viewer: { locale: 'en-GB', zone: 'Pacific/Auckland' },
};

describe('the Report document', () => {
  it('the cover names the estate, the instrument and the base it is read against', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    expect(doc.cover.estateName).toBe('Demo estate');
    expect(doc.cover.workbookTitle).toBe('Cloud Sovereignty Self-Assessment — Estate Workbook');
    expect(doc.cover.workbookVersion).toBe('1.0.0');
    expect(doc.cover.ribbon).toEqual(ribbonModel(SUBJECT_A.result));
    expect(doc.cover.contributors).toBe(ribbonModel(SUBJECT_A.result).contributors);
    expect(doc.cover.notACertification).toBe(NOT_A_CERTIFICATION);
  });

  it('the generated day is the viewer’s, not the instant’s', () => {
    const berlin = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    expect(berlin.cover.generatedOn).toBe('2026-08-14');
    expect(berlin.cover.generatedLabel).toBe('14 August 2026');

    const auckland = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, AUCKLAND);
    expect(auckland.cover.generatedOn).toBe('2026-08-15');
    expect(auckland.cover.generatedLabel).toBe('15 August 2026');
  });

  it('Standing is the floor, the score and the objectives, as the analytics models', () => {
    const { assessment, result, workbook } = SUBJECT_A;
    const doc = reportDocument(assessment, result, BERLIN);
    const standing = doc.sections.find((section) => section.id === 'standing');
    expect(standing?.title).toBe('Standing');
    expect(standing?.readings).toEqual([
      { id: 'floor', heading: 'Floor', model: floorTile(result, workbook) },
      { id: 'score', heading: 'Score', model: scoreTile(result) },
      { id: 'objectives', heading: 'Objectives', model: objectivesTile(result, workbook) },
    ]);
  });

  it('the front matter is the document’s own spine — orient, weigh, then act', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    expect(doc.sections.map((section) => section.id)).toEqual([...REPORT_SPINE]);
    expect(doc.sections.map((section) => section.title)).toEqual(
      REPORT_SPINE.map((id) => SECTION_TITLE[id]),
    );
  });

  it('provenance is back matter, and never a section of the spine', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    expect(REPORT_SPINE).not.toContain('provenance');
    expect(doc.sections.map((section) => section.id)).not.toContain('provenance');
    expect(doc.provenance.id).toBe('provenance');
    expect(doc.provenance.title).toBe(SECTION_TITLE.provenance);
    expect(doc.provenance.readings.map((reading) => reading.id)).toEqual(['credibility']);
  });

  it('the spine names every section the dashboard has, provenance apart', () => {
    expect([...REPORT_SPINE, 'provenance'].sort()).toEqual([...SECTION_ORDER].sort());
  });

  it('every reading is a dashboard tile — every tile but What’s left', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    const ids = [
      ...doc.sections.flatMap((section) => section.readings.map((reading) => reading.id)),
      ...doc.provenance.readings.map((reading) => reading.id),
    ];
    expect(ids.sort()).toEqual(TILE_IDS.filter((id) => id !== 'whats-left').sort());
  });

  it('each reading carries the analytics model, unchanged', () => {
    const { assessment, result, workbook, parties } = SUBJECT_A;
    const doc = reportDocument(assessment, result, BERLIN);
    const readings = [
      ...doc.sections.flatMap((section) => section.readings),
      ...doc.provenance.readings,
    ];

    expect(readings.find((reading) => reading.id === 'heat-dimension')?.model).toEqual(
      heatTile(result, workbook, parties, 'dimension'),
    );
    expect(readings.find((reading) => reading.id === 'heat-stratum')?.model).toEqual(
      heatTile(result, workbook, parties, 'stratum'),
    );
    expect(readings.find((reading) => reading.id === 'heat-party')?.model).toEqual(
      heatTile(result, workbook, parties, 'party'),
    );
    expect(readings.find((reading) => reading.id === 'heat-role')?.model).toEqual(
      heatTile(result, workbook, parties, 'role'),
    );
    expect(readings.find((reading) => reading.id === 'staircase')?.model).toEqual(
      staircaseTile(result, workbook, parties),
    );
    expect(readings.find((reading) => reading.id === 'exposure')?.model).toEqual(
      exposureTile(result, workbook),
    );
    expect(readings.find((reading) => reading.id === 'dont-know')?.model).toEqual(
      dontKnowTile(result, workbook, parties),
    );
    expect(readings.find((reading) => reading.id === 'evidence')?.model).toEqual(
      evidenceTile(result, workbook, parties),
    );
    expect(readings.find((reading) => reading.id === 'worth-a-second-look')?.model).toEqual(
      secondLookTile(result, workbook, parties),
    );
    expect(readings.find((reading) => reading.id === 'estate-wheel')?.model).toEqual(
      estateWheelTile(result, workbook, parties),
    );
    expect(readings.find((reading) => reading.id === 'credibility')?.model).toEqual(
      credibilityTile(result, workbook),
    );
  });

  it('each reading is headed by its tile’s own title', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    expect(
      doc.sections.flatMap((section) => section.readings.map((reading) => reading.heading)),
    ).toEqual([
      'Estate wheel',
      'Floor',
      'Score',
      'Objectives',
      'Weakness by dimension',
      'Weakness by stratum',
      'Weakness by party',
      'Weakness by role',
      "Don't-know",
      'Evidence',
      'Worth a second look',
      'Staircase',
      'Exposure',
    ]);
    expect(doc.provenance.readings.map((reading) => reading.heading)).toEqual(['Credibility']);
  });

  it('the document carries the transcript', () => {
    const appendix = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN).appendix;

    expect(appendix).toHaveLength(8);
    expect(appendix[0]?.id).toBe('SOV-1');
  });

  it('the document carries the offers', () => {
    const { assessment, result, workbook, parties } = SUBJECT_A;
    const vendor = reportDocument(assessment, result, BERLIN).vendor;

    expect(vendor).not.toBeNull();
    expect(vendor).toEqual(reportVendor(result, workbook, parties));
  });

  it('the document is the cover, the readings, the offers and the record', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);

    expect(Object.keys(doc).sort()).toEqual([
      'appendix',
      'cover',
      'offers',
      'provenance',
      'questionTags',
      'sections',
      'vendor',
    ]);
  });

  it('a section with nothing to say still reports, in its readings’ own empty states', () => {
    const doc = reportDocument(SUBJECT_EMPTY.assessment, SUBJECT_EMPTY.result, BERLIN);
    const readings = doc.sections.flatMap((section) => section.readings);

    expect(doc.sections.map((section) => section.id)).toEqual([...REPORT_SPINE]);
    expect(readings.find((reading) => reading.id === 'heat-dimension')).toMatchObject({
      model: { kind: 'empty' },
    });
    expect(readings.find((reading) => reading.id === 'heat-stratum')).toMatchObject({
      model: { kind: 'empty' },
    });
    expect(readings.find((reading) => reading.id === 'heat-party')).toMatchObject({
      model: { kind: 'empty' },
    });
    expect(readings.find((reading) => reading.id === 'heat-role')).toMatchObject({
      model: { kind: 'empty' },
    });
    expect(readings.find((reading) => reading.id === 'staircase')?.model.kind).toBe('not-assessed');
    expect(readings.find((reading) => reading.id === 'dont-know')?.model.kind).toBe('none');
    expect(readings.find((reading) => reading.id === 'evidence')?.model.kind).toBe('empty');
    expect(readings.find((reading) => reading.id === 'estate-wheel')?.model.kind).toBe('empty');
  });
});
