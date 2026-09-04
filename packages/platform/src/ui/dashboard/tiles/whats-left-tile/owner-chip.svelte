<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Chip } from '../../../chip';
  import type { ChipTone } from '../../../chip/variants';
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';

  // One chip in the chase, inspector-aware: pressing it puts that slice of the
  // backlog in the rail. With no session it is a plain word, not a dead control.
  type Props = {
    /** The owner's group key, or null for the whole chase.*/
    group: string | null;
    tone: ChipTone;
    title: string;
    children: Snippet;
  };
  let { group, tone, title, children }: Props = $props();

  const inspector = getInspector();
  const selection: InspectSelection = $derived({ kind: 'open-units', group });
  const attrs = $derived(
    inspector
      ? {
          as: 'button',
          type: 'button' as const,
          'aria-pressed': inspector.isShowing(selection),
          title,
          class: 'cursor-pointer',
          onclick: () => inspector.show(selection),
        }
      : {},
  );
</script>

<Chip {tone} {...attrs}>{@render children()}</Chip>
