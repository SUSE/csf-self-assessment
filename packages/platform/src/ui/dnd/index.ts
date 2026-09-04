// Internal-only pointer-drag toolkit (no package.json export — only platform
// components compose it; the repo exports only app-consumed roots). The drag-first
// fan-out is built from these four pieces.
export { DndSession, createDnd, getDnd } from './dnd.svelte';
export type { DragPayload } from './dnd.svelte';
export { draggable } from './draggable.svelte';
export type { DraggableParams } from './draggable.svelte';
export { dropTarget } from './drop-target.svelte';
export type { DropTargetParams } from './drop-target.svelte';
export { default as DndGhost } from './dnd-ghost.svelte';
