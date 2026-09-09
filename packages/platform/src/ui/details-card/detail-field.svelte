<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';

  // One labelled field inside a DetailsCard. Read-only when given a `value` —
  // shown in a bordered box styled inert (muted fill + muted text), the same
  // "you can't edit this" language as a disabled input, so a read-only field is
  // visibly distinct from an adjacent editable one. Editable when given a
  // `control` snippet (e.g. an <input>) — then the field is a <label> so its
  // caption focuses the control. `mono` uses the monospace face for codes/ids.
  // `grow` lets the field fill the remaining row width (titles, names).
  let {
    label,
    value = '',
    mono = false,
    grow = false,
    control,
    class: className,
  }: {
    label: string;
    value?: string;
    mono?: boolean;
    grow?: boolean;
    control?: Snippet;
    class?: string;
  } = $props();
</script>

{#if control}
  <label class={cn('text-xs text-muted-foreground', grow && 'grow', className)}>
    {label}
    {@render control()}
  </label>
{:else}
  <div class={cn('text-xs text-muted-foreground', grow && 'grow', className)}>
    {label}
    <span
      class={cn(
        'mt-0.5 block max-w-full truncate rounded border border-border bg-muted px-2 py-1 text-muted-foreground',
        mono ? 'font-mono text-xs' : 'text-sm',
        grow ? 'w-full' : 'w-fit',
      )}>{value}</span>
  </div>
{/if}
