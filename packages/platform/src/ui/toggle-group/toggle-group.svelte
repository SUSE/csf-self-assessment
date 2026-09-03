<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';

  // shadcn-svelte ToggleGroup, styled as our segmented control (a bordered pill
  // whose active item takes the accent). Wraps bits-ui, fixed to single-select —
  // the only shape this app uses; typing it directly avoids bits-ui's
  // single|multiple union (which is too large to flow through a wrapper).
  //
  // Where a selection is mandatory, drive it FULLY CONTROLLED with a function
  // binding — `bind:value={() => current, (v) => { if (v) current = v }}` — so the
  // getter stays the source of truth and the empty string bits-ui emits when the
  // active item is re-clicked is dropped by the setter, keeping that item lit.
  type Props = {
    ref?: HTMLDivElement | null;
    value?: string;
    class?: string;
    'aria-label'?: string;
    /** Help surface A: the id of the rulebook card that governs this control. The
     *  workbench's delegated listener reads it off the group, so it is named here
     *  one attribute at a time rather than by opening the type up (the
     *  `SurfaceAttributes` precedent). */
    'data-rule'?: string;
    children: Snippet;
  };

  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(''),
    children,
    ...restProps
  }: Props = $props();
</script>

<ToggleGroupPrimitive.Root
  bind:ref
  bind:value
  type="single"
  class={cn('inline-flex rounded-md border border-border p-0.5', className)}
  {...restProps}
>
  {@render children()}
</ToggleGroupPrimitive.Root>
