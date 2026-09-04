import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { Assessment, Party, WorkbookAssessment } from '../schema';
import { workbookAssessmentOf } from '../setup';
import { assessmentOf } from '../assessment';
import { decideLoad, type LoadInput } from './index';

const wb = WorkbookSchema.parse({
  meta: { id: 'w', version: '1', title: 'W' },
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
    { seal: 4, name: 'S4', description: 'd' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage', critical: false },
  ],
  roles: [{ id: 'LEG', name: 'Legal' }],
  parties: [
    { id: 'institution', name: 'Institution', kind: 'assessed' },
    { id: 'primary-provider', name: 'Primary provider', kind: 'third-party' },
  ],
  objectives: [
    {
      id: 'O1',
      name: 'One',
      weight: 100,
      questions: [
        { id: 'q1', grain: 'party', text: 't', why: 'w', role: 'LEG', defaultMateriality: 'material', ladder: [{ id: 'choice-1', description: 'r', points: 0, seal: 0 }] },
      ],
    },
  ],
});

const parties: Party[] = [
  { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
  { id: 'primary', name: 'Primary provider', type: 'primary-provider', serves: ['compute', 'storage'] },
];

const wa: WorkbookAssessment = workbookAssessmentOf({
  workbook: wb,
  estate: 'Acme',
  parties,
  id: 'wa-1',
  createdAt: '2026-08-02T00:00:00Z',
});

const partial: Assessment = assessmentOf(wb, 'Acme', parties, [], {
  kind: 'partial',
  workbookAssessment: 'wa-1',
  participant: { name: 'Alice' },
  claims: [],
  partiesAdded: [],
});

const finalized: Assessment = assessmentOf(wb, 'Acme', parties, [], {
  kind: 'finalized',
  workbookAssessment: 'wa-1',
  ledger: [],
});

const staleWb = WorkbookSchema.parse({ ...JSON.parse(JSON.stringify(wb)), meta: { id: 'w', version: '9.9.9', title: 'W' } });
const stalePartial: Assessment = assessmentOf(staleWb, 'Acme', parties, [], {
  kind: 'partial',
  workbookAssessment: 'wa-1',
  participant: { name: 'Bob' },
  claims: [],
  partiesAdded: [],
});

const NOW = '2026-08-07T00:00:00Z';
function decide(data: unknown, mode: LoadInput['mode'], merge?: LoadInput['merge']) {
  return decideLoad({
    data,
    name: 'f.json',
    mode,
    merge: merge ?? { active: false, wa: null, incoming: null },
    now: NOW,
  });
}

describe('decideLoad — the artifact + mode choose the action', () => {
  describe('from empty (the first load sets the mode)', () => {
    it('a bare workbook enters Facilitator, no confirm', () => {
      const out = decide(wb, 'empty');
      expect(out.kind).toBe('facilitator-workbook');
      expect(out.kind === 'facilitator-workbook' && out.confirm).toBeNull();
    });

    it('a workbook-assessment enters the fill flow, no confirm', () => {
      const out = decide(wa, 'empty');
      expect(out.kind).toBe('fill-workbook-assessment');
      expect(out.kind === 'fill-workbook-assessment' && out.confirm).toBeNull();
    });

    it('a saved partial enters the fill flow, no confirm', () => {
      const out = decide(partial, 'empty');
      expect(out.kind).toBe('fill-assessment');
      expect(out.kind === 'fill-assessment' && out.confirm).toBeNull();
    });

    it('a finalized assessment enters the fill flow (to read)', () => {
      expect(decide(finalized, 'empty').kind).toBe('fill-assessment');
    });
  });

  describe('in Facilitator mode (Load feeds the merge, never switches role)', () => {
    it('a workbook-assessment starts a merge with nothing under review', () => {
      const out = decide(wa, 'facilitator');
      expect(out.kind).toBe('merge-start');
      if (out.kind !== 'merge-start') throw new Error('unreachable');
      expect(out.wa).toEqual(wa);
      expect(out.incoming).toBeNull();
      expect(out.confirm).not.toBeNull();
      expect(out.confirm?.title).toBe('Start merging?');
    });

    it('a returned partial starts a merge and goes under review', () => {
      const out = decide(partial, 'facilitator');
      expect(out.kind).toBe('merge-start');
      if (out.kind !== 'merge-start') throw new Error('unreachable');
      expect(out.wa.meta.id).toBe(partial.meta.workbookAssessment);
      expect(out.incoming).toEqual(partial);
      expect(out.confirm).not.toBeNull();
    });

    it('a second partial goes under review', () => {
      const out = decide(partial, 'facilitator', { active: true, wa, incoming: null });
      expect(out.kind).toBe('merge-review');
      if (out.kind !== 'merge-review') throw new Error('unreachable');
      expect(out.partial).toEqual(partial);
    });

    it('a partial is refused while one is under review', () => {
      const under = assessmentOf(wb, 'Acme', parties, [], {
        kind: 'partial',
        workbookAssessment: 'wa-1',
        participant: { name: 'Alex' },
        claims: [],
        partiesAdded: [],
      });
      const out = decide(partial, 'facilitator', { active: true, wa, incoming: under });
      expect(out.kind).toBe('error');
      if (out.kind !== 'error') throw new Error('unreachable');
      expect(out.message).toContain('f.json');
      expect(out.message).toContain('Alex');
    });

    it('a version mismatch still refuses', () => {
      const out = decide(stalePartial, 'facilitator', { active: true, wa, incoming: null });
      expect(out.kind).toBe('error');
      if (out.kind !== 'error') throw new Error('unreachable');
      expect(out.message).toContain('9.9.9');
      expect(out.message).toContain('@1');
    });

    it('a bare workbook replaces the instrument, behind a confirm', () => {
      const out = decide(wb, 'facilitator');
      expect(out.kind).toBe('facilitator-workbook');
      expect(out.kind === 'facilitator-workbook' && out.confirm?.title).toBe('Replace the workbook?');
    });
  });

  describe('in fill mode (Load replaces the assessment; a workbook needs a Reset)', () => {
    it('another workbook-assessment replaces, behind a confirm', () => {
      const out = decide(wa, 'fill');
      expect(out.kind).toBe('fill-workbook-assessment');
      expect(out.kind === 'fill-workbook-assessment' && out.confirm?.action).toBe('Discard & load');
    });

    it('another assessment replaces, behind a confirm', () => {
      const out = decide(partial, 'fill');
      expect(out.kind).toBe('fill-assessment');
      expect(out.kind === 'fill-assessment' && out.confirm).not.toBeNull();
    });

    it('a bare workbook is refused — Reset first to switch modes', () => {
      const out = decide(wb, 'fill');
      expect(out.kind).toBe('error');
      expect(out.kind === 'error' && out.message).toContain('Reset the app first');
    });
  });

  describe('facilitator — a finalized assessment', () => {
    it('opens as the estate of record', () => {
      const out = decide(finalized, 'facilitator');
      expect(out.kind).toBe('facilitator-finalized');
      if (out.kind !== 'facilitator-finalized') throw new Error('expected the estate of record');
      expect(out.assessment.meta.workbookAssessment).toBe('wa-1');
      expect(out.confirm?.action).toBe('Open finalized');
    });

    it('is never refused because a merge is open', () => {
      const out = decide(finalized, 'facilitator', { active: true, wa, incoming: null });
      expect(out.kind).toBe('facilitator-finalized');
    });

    it('refuses a version mismatch', () => {
      const doctored = { ...finalized, meta: { ...finalized.meta, workbookVersion: '9.9.9' } };
      const out = decide(doctored, 'facilitator');
      expect(out.kind).toBe('error');
      expect(out.kind === 'error' && out.message.endsWith('Version mismatches are not opened.')).toBe(true);
    });

    it('leaves the other routes alone', () => {
      expect(decide(finalized, 'empty').kind).toBe('fill-assessment');
      expect(decide(partial, 'facilitator').kind).toBe('merge-start');
    });
  });

  describe('integrity + junk', () => {
    it('refuses a workbook-assessment whose declared workbook id ≠ embedded', () => {
      const doctored = { ...wa, meta: { ...wa.meta, workbookId: 'nope' } };
      const out = decide(doctored, 'empty');
      expect(out.kind).toBe('error');
      expect(out.kind === 'error' && out.message).toContain('Version mismatches');
    });

    it('rejects an unrecognised object', () => {
      expect(decide({ hello: 'world' }, 'empty').kind).toBe('error');
    });
  });
});
