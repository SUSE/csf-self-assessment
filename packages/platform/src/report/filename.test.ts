import { describe, expect, it } from 'vitest';
import type { ReportCover } from './document';
import { NOT_A_CERTIFICATION } from './document';
import { reportFilename } from './filename';

const coverOf = (estateName: string, generatedOn: string): ReportCover => ({
  estateName,
  workbookTitle: 'Cloud Sovereignty Self-Assessment — Estate Workbook',
  workbookVersion: '1.0.0',
  generatedOn,
  generatedLabel: '14 August 2026',
  contributors: 1,
  ribbon: { unitsPlaced: 3, unitsTotal: 9, dontKnow: 0, parties: 1, contributors: 1, floor: 2 },
  notACertification: NOT_A_CERTIFICATION,
});

describe('the saved file’s name', () => {
  it('names the file for the estate and the day it was generated', () => {
    expect(reportFilename(coverOf('Demo estate', '2026-08-14'))).toBe(
      'csf-report-demo-estate-2026-08-14',
    );
  });

  it('flattens punctuation and accents into single hyphens', () => {
    expect(reportFilename(coverOf('Acme GmbH / EU — Zürich #2', '2026-01-05'))).toBe(
      'csf-report-acme-gmbh-eu-zurich-2-2026-01-05',
    );
  });

  it('falls back to "estate" when the name has nothing to slug', () => {
    expect(reportFilename(coverOf('—', '2026-01-05'))).toBe('csf-report-estate-2026-01-05');
  });
});
