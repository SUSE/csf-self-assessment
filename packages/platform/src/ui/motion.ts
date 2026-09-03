import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

// The directional carousel slide shared by the participant fill surface and the
// Author workbench (spec §4.3c): both stack the leaving and entering nodes in one
// grid cell (col/row-start-1) inside an overflow-x-clip container, so the two
// cross like a slideshow. `dir` is the side the node is associated with — +1 for
// the right, -1 for the left. Callers pass the ENTERING node `slideDir` (forward
// → from the right; back → from the left) and the LEAVING node `-slideDir`, so
// they always travel opposite ways. u runs 1→0 on intro and 0→1 on outro, so a
// node moves dir·100%→0 as it enters and 0→dir·100% as it leaves. A duration of 0
// (reduced motion) collapses the travel to an instant swap.
export const SLIDE_MS = 240;

export function carousel(
  _node: Element,
  { dir, duration }: { dir: number; duration: number },
): TransitionConfig {
  return {
    duration,
    easing: cubicOut,
    css: (_t, u) => `transform: translateX(${u * dir * 100}%);`,
  };
}
