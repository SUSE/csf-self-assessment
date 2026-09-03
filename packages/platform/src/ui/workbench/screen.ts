import { isTileId } from '../../analytics';
import type { TileId } from '../../analytics';
import { isFocusRef, sameFocus } from './focus';
import type { FocusRef } from './focus';

// The five surfaces the Author app shows: the instrument editor, the participant
// preview, the QA dashboard over a test estate (analytics §3.4), the Report that
// estate prints (report.md §4.1), and the recommendations page it produces
// (specs/recommendations.md §4).
export type AuthorMode = 'workbench' | 'preview' | 'dashboard' | 'report' | 'recommendations';

// The Author app's view, as persisted in `history.state` under the shared
// `__csfView` key (utils/view-history.ts). `estate` is the test estate the QA
// dashboard is reading and `maximised` the tile it has filled the grid with
// (analytics §4.3). both are null until the dashboard has been used.
export const AUTHOR_MODES: readonly AuthorMode[] = [
  'workbench',
  'preview',
  'dashboard',
  'report',
  'recommendations',
];

export type AuthorScreen = {
  mode: AuthorMode;
  focus: FocusRef;
  estate: string | null;
  maximised: TileId | null;
};

// True when `raw` is a well-formed AuthorScreen. The Assessment app writes its
// own view shape under the same key at the same origin, and an older build may
// have written a narrower one, so a restored view is validated — never cast.
// Every field is required: a view missing `estate` or `maximised` is rejected.
export function isAuthorScreen(raw: unknown): raw is AuthorScreen {
  if (raw === null || typeof raw !== 'object') return false;
  const view: Record<string, unknown> = { ...raw };
  const mode = view.mode;
  if (!AUTHOR_MODES.some((m) => m === mode)) return false;
  if (!isFocusRef(view.focus)) return false;
  if (view.estate !== null && typeof view.estate !== 'string') return false;
  return view.maximised === null || isTileId(view.maximised);
}

// True when two views name the same place — the `equal` a `ViewHistory` needs
// so a popstate-driven state change is not mistaken for a fresh navigation.
export function sameAuthorScreen(a: AuthorScreen, b: AuthorScreen): boolean {
  if (a.mode !== b.mode || a.estate !== b.estate || a.maximised !== b.maximised) return false;
  return sameFocus(a.focus, b.focus);
}
