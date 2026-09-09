import { describe, expect, it } from 'vitest';
import {
  FACILITATOR_OVERLAYS,
  FACILITATOR_SECTIONS,
  isFacilitatorOverlayKind,
  isFacilitatorSection,
} from './model';

describe('the facilitator’s destinations', () => {
  it('the overlays are the toolbar order, once each', () => {
    expect(FACILITATOR_OVERLAYS).toEqual(['recommendations']);
    expect(new Set(FACILITATOR_OVERLAYS).size).toBe(1);
  });

  it('the guard names exactly those destinations', () => {
    expect(isFacilitatorOverlayKind('recommendations')).toBe(true);
    // The Report prints; it is never a view a restored entry may name.
    expect(isFacilitatorOverlayKind('report')).toBe(false);
    expect(isFacilitatorOverlayKind('dashboard')).toBe(false);
    expect(isFacilitatorOverlayKind('recommendation')).toBe(false);
    expect(isFacilitatorOverlayKind('report ')).toBe(false);
    expect(isFacilitatorOverlayKind('')).toBe(false);
    expect(isFacilitatorOverlayKind(null)).toBe(false);
    expect(isFacilitatorOverlayKind(7)).toBe(false);
  });
});

describe('the facilitator’s walk order', () => {
  it('the sections are the walk order, once each', () => {
    expect(FACILITATOR_SECTIONS).toEqual([
      'overview',
      'frontsheet',
      'objectives',
      'dimensions',
      'roles',
      'party-types',
      'parties',
      'setup',
      'questions',
      'merge',
      'dashboard',
    ]);
    expect(new Set(FACILITATOR_SECTIONS).size).toBe(11);
  });

  it('the guard names exactly those sections', () => {
    expect(isFacilitatorSection('merge')).toBe(true);
    expect(isFacilitatorSection('questions')).toBe(true);
    expect(isFacilitatorSection('dashboard ')).toBe(false);
    expect(isFacilitatorSection('workbench')).toBe(false);
    expect(isFacilitatorSection('')).toBe(false);
    expect(isFacilitatorSection(null)).toBe(false);
    expect(isFacilitatorSection(7)).toBe(false);
  });
});
