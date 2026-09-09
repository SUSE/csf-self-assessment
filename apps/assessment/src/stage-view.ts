// The view CODEC: what a screen looks like written into history.state, and how to
// tell one back out of an untrusted blob. Pure, so the guard and the equality are
// testable without mounting the app. One descriptor per PERSONA — the two stages
// share no coordinates.
import { isHistoryView, isTileId, sameHistoryView, type HistoryView, type TileId } from '@csf/platform';
import { isAssessmentSection, type AssessmentSection } from '@csf/platform/ui/assessment-toolbar';
import {
  isFacilitatorOverlayKind,
  isFacilitatorSection,
  type FacilitatorOverlayKind,
  type FacilitatorSection,
} from '@csf/platform/ui/facilitator-toolbar';
import { isInspectSelection, sameSelection, type InspectSelection } from '@csf/platform/ui/inspector';

export type StageView =
  | { stage: 'empty' }
  | {
      stage: 'fill';
      view: 'fill' | 'questions-index' | 'read' | 'recommendations';
      section: AssessmentSection;
      focus: string | null;
      maximised: TileId | null;
    }
  | {
      stage: 'facilitator';
      section: FacilitatorSection;
      selection: InspectSelection | null;
      history: HistoryView | null;
      // The destination shown instead of the section, or null for the section
      // itself.
      overlay: FacilitatorOverlayKind | null;
    };

// history.state can carry an entry from the sibling Author app (shared '__csfView'
// key, same origin) or an older build, so a restored view is guarded before it is
// trusted. Every field a stage gains needs a clause here in the same commit, or a
// stale entry restores it as undefined.
export function isStageView(raw: unknown): raw is StageView {
  if (raw === null || typeof raw !== 'object') return false;
  const v = raw as {
    stage?: unknown;
    view?: unknown;
    section?: unknown;
    focus?: unknown;
    maximised?: unknown;
    selection?: unknown;
    history?: unknown;
    overlay?: unknown;
  };
  if (v.stage === 'empty') return true;
  if (v.stage === 'facilitator') {
    return (
      isFacilitatorSection(v.section) &&
      (v.selection === null || isInspectSelection(v.selection)) &&
      (v.history === null || isHistoryView(v.history)) &&
      (v.overlay === null || isFacilitatorOverlayKind(v.overlay))
    );
  }
  return (
    v.stage === 'fill' &&
    (v.view === 'fill' ||
      v.view === 'questions-index' ||
      v.view === 'read' ||
      v.view === 'recommendations') &&
    isAssessmentSection(v.section) &&
    (v.focus === null || typeof v.focus === 'string') &&
    (v.maximised === null || isTileId(v.maximised))
  );
}

// What stops a popstate-driven state change being re-pushed as a fresh navigation.
export function sameStageView(a: StageView, b: StageView): boolean {
  if (a.stage !== b.stage) return false;
  if (a.stage === 'fill' && b.stage === 'fill') {
    return (
      a.view === b.view &&
      a.section === b.section &&
      a.focus === b.focus &&
      a.maximised === b.maximised
    );
  }
  if (a.stage === 'facilitator' && b.stage === 'facilitator') {
    return (
      a.section === b.section &&
      a.overlay === b.overlay &&
      sameSelection(a.selection, b.selection) &&
      sameHistoryView(a.history, b.history)
    );
  }
  return true;
}

// A filter keystroke or a captured scroll is not a Back step, so only these
// coordinates push an entry — an overlay, the review, the landing list, or one
// Landing.
export function facilitatorScreenKey(
  section: FacilitatorSection,
  history: HistoryView | null,
  overlay: FacilitatorOverlayKind | null,
): string {
  if (overlay !== null) return overlay;
  if (section !== 'merge') return section;
  return history === null ? 'merge/review' : `merge/${history.landing ?? 'list'}`;
}
