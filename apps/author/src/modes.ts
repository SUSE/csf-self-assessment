import type { LucideIcon } from '@lucide/svelte';
import type { AuthorMode, ModeGate } from '@csf/platform/ui/workbench';
import Eye from '@lucide/svelte/icons/eye';
import Gauge from '@lucide/svelte/icons/gauge';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Printer from '@lucide/svelte/icons/printer';

// One author stage destination, as the mode toolbar renders it. The label is
// the tooltip AND the accessible name, so a disabled item carries its reason
// there rather than in a separate title.
export type ModeItem = {
  id: AuthorMode;
  label: string;
  Icon: LucideIcon;
  disabled: boolean;
};

// The four destinations beyond the workbench, in the order the toolbar shows
// them, each bound to its icon.
const DESTINATIONS: readonly { id: AuthorMode; Icon: LucideIcon }[] = [
  { id: 'preview', Icon: Eye },
  { id: 'dashboard', Icon: Gauge },
  { id: 'recommendations', Icon: Lightbulb },
  { id: 'report', Icon: Printer },
];

// The four destinations beyond the workbench, in toolbar order, each bound to
// its icon and to the one line its gate carries.
export function modeItems(gates: Record<AuthorMode, ModeGate>): ModeItem[] {
  return DESTINATIONS.map(({ id, Icon }) => {
    const gate = gates[id];
    return {
      id,
      Icon,
      label: gate.kind === 'open' ? gate.label : gate.reason,
      disabled: gate.kind === 'blocked',
    };
  });
}
