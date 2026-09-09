<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';

  // The one caption + control stack every editor shares, so a row of fields is
  // aligned by construction rather than by luck.
  
  // A control that is really a group — a radiogroup, a toggle group — must pass
  // `as="div"` and carry its own `aria-label`, because an implicit label would
  // otherwise name only the first radio in it.
  type Props = {
    label: string;
    as?: 'label' | 'div';
    class?: string;
    children: Snippet;
    /** Passed through to the wrapper — `data-rule` marks a governed control for
     * the Rulebook tab, and the marker belongs on the whole field.*/
    [key: `data-${string}`]: unknown;
  };
  let { label, as = 'label', class: className, children, ...rest }: Props = $props();
</script>

<svelte:element this={as} class={cn('block space-y-1', className)} {...rest}>
  <span class="block text-xs text-muted-foreground">{label}</span>
  {@render children()}
</svelte:element>
