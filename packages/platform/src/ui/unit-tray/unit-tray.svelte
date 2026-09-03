<script lang="ts" generics="P extends DragPayload">
  import { getDnd, dropTarget, type DragPayload } from '../dnd';

  // The fan-out tray shell (spec §4.8, §3.1): a subtly DASHED neutral container —
  // the "place these" zone, and the drop target that UNPLACES a resting chip
  // dropped back onto it (`onDropToTray` → the card retracts). Its header reads as
  // one line: a bold `title` followed inline by a muted `hint`. The attention
  // accent is NOT the container — it rides the critical ⚑ on each chip. Grain-
  // agnostic — the card renders chips into the default snippet. Composed by the
  // fan-out card (both grains). STATELESS.
  type Props = {
    title: string;
    hint?: string;
    onDropToTray?: (payload: P) => void;
    children: import('svelte').Snippet;
  };
  let { title, hint, onDropToTray, children }: Props = $props();

  const dnd = getDnd<P>();
  // Quiet dashed zone when idle; while a drag is live it brightens (a legal unplace
  // target), and goes solid + filled under the pointer. Border-style/colour live in ONE
  // derived class so they never fight the container's baseline `border`. Neutral only.
  const zoneClass = $derived(
    !dnd?.dragging
      ? 'border-dashed border-border'
      : dnd.over === 'tray'
        ? 'border-solid border-foreground bg-accent'
        : 'border-dashed border-foreground/40',
  );
</script>

<div
  class="space-y-3 rounded-xl border p-4 transition-colors {zoneClass}"
  use:dropTarget={{ session: dnd, key: 'tray', onDrop: (payload) => onDropToTray?.(payload) }}
>
  <p class="text-sm" aria-live="polite">
    <span class="font-semibold text-foreground">{title}</span>{#if hint}<span class="ml-2 text-muted-foreground">{hint}</span>{/if}
  </p>
  <div class="flex flex-wrap gap-2">{@render children()}</div>
</div>
