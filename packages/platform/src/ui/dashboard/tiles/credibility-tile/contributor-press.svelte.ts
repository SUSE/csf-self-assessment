// Deep imports, not the inspector barrel: it pulls the whole rail in with it.
import { getInspector } from '../../../inspector/inspector.svelte';
import type { InspectSelection } from '../../../inspector/subject';
import type { ContributorRow } from './contributor-rows';

/** One row's press, shared by the arc and its legend line so the two can never
 *  disagree about what is clickable or about which one the rail is reading. */
export type ContributorPress = {
  /** False where no session runs, and false for the folded tail — it names a count
   *  of people, so there is no one reading behind it. */
  readonly pressable: boolean;
  readonly showing: boolean;
  press: () => void;
};

/** Must be called during component init: it reads the session from context. */
export function contributorPress(row: () => ContributorRow): ContributorPress {
  const inspector = getInspector();
  const selection = $derived<InspectSelection | null>(
    row().folded ? null : { kind: 'contributor', name: row().key },
  );
  return {
    get pressable() {
      return selection !== null && inspector !== null;
    },
    get showing() {
      return selection !== null && (inspector?.isShowing(selection) ?? false);
    },
    press() {
      if (selection !== null) inspector?.show(selection);
    },
  };
}
