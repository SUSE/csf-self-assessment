import { describe, expect, it } from 'vitest';
import { readView } from '../../utils/view-history';
import { isAuthorScreen, sameAuthorScreen } from './screen';
import type { AuthorScreen } from './screen';

// The Author view's guard (analytics §4.3). history.state is untrusted input:
// the sibling Assessment app writes its own shape under the same '__csfView' key
// at the same origin, and an older build wrote a narrower Author view.

const DASHBOARD: AuthorScreen = {
  mode: 'dashboard',
  focus: { kind: 'question', id: 'SOV-1.q' },
  estate: 'profile-base',
  maximised: 'floor',
};

const ASSESSMENT_SHAPE = {
  stage: 'assessment',
  view: 'read',
  section: 'overview',
  focus: null,
  maximised: 'floor',
};

describe('isAuthorScreen', () => {
  it('accepts a dashboard view carrying an estate and a maximised tile', () => {
    expect(isAuthorScreen(DASHBOARD)).toBe(true);
  });

  it('accepts a workbench view with both new fields null', () => {
    expect(
      isAuthorScreen({ mode: 'workbench', focus: { kind: 'overview' }, estate: null, maximised: null }),
    ).toBe(true);
  });

  it('accepts the recommendations page', () => {
    expect(isAuthorScreen({ ...DASHBOARD, mode: 'recommendations' })).toBe(true);
  });

  it('accepts the report mode', () => {
    expect(isAuthorScreen({ ...DASHBOARD, mode: 'report' })).toBe(true);
  });

  it('rejects a mode this build does not have', () => {
    expect(isAuthorScreen({ ...DASHBOARD, mode: 'recommendation' })).toBe(false);
  });

  it("rejects the sibling app's shape", () => {
    expect(isAuthorScreen(ASSESSMENT_SHAPE)).toBe(false);
  });

  it('rejects a pre-S7 Author view missing estate and maximised', () => {
    expect(isAuthorScreen({ mode: 'workbench', focus: { kind: 'overview' } })).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(
      isAuthorScreen({ mode: 'qa', focus: { kind: 'overview' }, estate: null, maximised: null }),
    ).toBe(false);
  });

  it('rejects a maximised value that is not a tile id', () => {
    expect(
      isAuthorScreen({
        mode: 'dashboard',
        focus: { kind: 'overview' },
        estate: null,
        maximised: 'not-a-tile',
      }),
    ).toBe(false);
  });

  it('rejects a malformed focus', () => {
    expect(
      isAuthorScreen({ mode: 'workbench', focus: { kind: 'bogus' }, estate: null, maximised: null }),
    ).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isAuthorScreen(null)).toBe(false);
    expect(isAuthorScreen('x')).toBe(false);
  });

  it('is the guard the view store reads through', () => {
    expect(readView({ __csfView: DASHBOARD }, isAuthorScreen)).toEqual(DASHBOARD);
    expect(readView({ __csfView: ASSESSMENT_SHAPE }, isAuthorScreen)).toBe(null);
  });
});

describe('sameAuthorScreen', () => {
  it('two structurally equal screens name the same place', () => {
    expect(sameAuthorScreen(DASHBOARD, { ...DASHBOARD })).toBe(true);
  });

  it('a different maximised tile is a different place', () => {
    expect(sameAuthorScreen(DASHBOARD, { ...DASHBOARD, maximised: null })).toBe(false);
  });

  it('a different focused question is a different place', () => {
    expect(
      sameAuthorScreen(
        { ...DASHBOARD, focus: { kind: 'question', id: 'q-1' } },
        { ...DASHBOARD, focus: { kind: 'question', id: 'q-2' } },
      ),
    ).toBe(false);
  });

  it('a different estate is a different place', () => {
    expect(sameAuthorScreen(DASHBOARD, { ...DASHBOARD, estate: 'profile-a' })).toBe(false);
  });
});
