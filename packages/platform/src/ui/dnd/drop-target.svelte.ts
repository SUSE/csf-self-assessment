import type { ActionReturn } from 'svelte/action';
import type { DndSession, DragPayload } from './dnd.svelte';

// Marks a node as a drop hot spot: stamps `data-drop-key` (what `draggable`'s
// hit-test looks up) and registers an onDrop handler on the session. A no-op when
// no session is present (e.g. the single-unit ladder-card renders a Ladder with no
// fan-out to drop). Consumers style the active state by reading the session:
// `session.dragging` glows every target, `session.over === key` emphasises the one
// under the pointer.

export type DropTargetParams<P extends DragPayload> = {
  session: DndSession<P> | undefined;
  key: string;
  onDrop: (payload: P) => void;
};

export function dropTarget<P extends DragPayload>(
  node: HTMLElement,
  params: DropTargetParams<P>,
): ActionReturn<DropTargetParams<P>> {
  let p = params;

  function attach(): void {
    if (!p.session) return;
    node.setAttribute('data-drop-key', p.key);
    // Trampoline reads the latest handler at drop time, so a reactive onDrop
    // closure stays current without re-registering.
    p.session.register(p.key, (payload) => p.onDrop(payload));
  }
  function detach(prev: DropTargetParams<P>): void {
    prev.session?.unregister(prev.key);
    if (node.getAttribute('data-drop-key') === prev.key) node.removeAttribute('data-drop-key');
  }

  attach();

  return {
    update(next: DropTargetParams<P>): void {
      if (next.session !== p.session || next.key !== p.key) {
        detach(p);
        p = next;
        attach();
      } else {
        p = next;
      }
    },
    destroy(): void {
      detach(p);
    },
  };
}
