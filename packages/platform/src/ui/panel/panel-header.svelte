<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';
  import { headerVariants, type PanelHeaderTone } from './variants';

  // The title line of a panel. It absorbs the two shapes the repo repeats ~21
  // times: a bare heading, and a heading with a control pushed to the right edge
  // by a hand-written `flex items-center justify-between` row.
  export type PanelHeaderProps = {
    title: string;
    /** `eyebrow` is the author side's register, `plain` the Merge side's. Both
     *  are preserved verbatim — see variants.ts on why the casing question is a
     *  separate decision. */
    tone?: PanelHeaderTone;
    /** Heading rank. A panel that is one of a screen's top-level sections is a
     *  2; a panel nested inside one of those is a 3 (the default, and what the
     *  Merge review's sections are). */
    level?: 2 | 3;
    description?: string;
    /** Right-aligned controls: the panel's own add/toggle/filter buttons. */
    actions?: Snippet;
    class?: string;
  };
</script>

<script lang="ts">
  let { title, tone = 'plain', level = 3, description, actions, class: className }: PanelHeaderProps =
    $props();
</script>

<!-- Two columns: the text claims every pixel the actions don't need. `flex-1
     min-w-0` is what makes that true — without it the text column sizes to its
     own max-content, so a description long enough to use the panel's width grows
     the column, wraps the actions onto a line of their own and leaves a hole
     where the button was. `shrink-0` holds the other side: buttons are the one
     thing here that must never be squeezed. -->
<div class={cn('flex flex-wrap items-center gap-3', className)} data-slot="panel-header">
  <div class="min-w-0 flex-1 space-y-1">
    <!-- The rank is a prop rather than a fixed tag because the visual register
         and the document outline are different questions: an eyebrow can head a
         top-level section or a nested one, and only the caller knows which. -->
    <svelte:element this={`h${level}`} class={headerVariants({ tone })}>{title}</svelte:element>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
  {/if}
</div>
