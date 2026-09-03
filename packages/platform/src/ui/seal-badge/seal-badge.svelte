<script lang="ts">
  import type { Seal } from '../../schema';
  import { sealSwatchClass, sealInkClass } from '../../utils/seal-color';
  import { cn } from '../../utils/cn';

  // A square SEAL-rank chip (0–4), shared by the questions list and the detail so
  // the number the facilitator scans in the list is the SAME chip the answer
  // ladder shows for that rung — glance at "2", find SEAL-2 below. Swatch tint +
  // ramp ink (green SEAL-3/4, red SEAL-0/1, muted SEAL-2), the exact idiom the
  // ladder badge uses. `seal===null` = not answered yet: a muted en-dash, never a
  // fake "0".
  type Props = {
    seal: Seal | null;
    size?: 'sm' | 'md';
    class?: string | undefined;
  };
  let { seal, size = 'sm', class: className }: Props = $props();

  const dim = $derived(size === 'sm' ? 'size-6 text-xs' : 'size-8 text-sm');
</script>

{#if seal === null}
  <span
    class={cn('grid shrink-0 place-items-center rounded bg-muted font-semibold text-muted-foreground', dim, className)}
    title="Not answered"
    aria-label="not answered"
  >–</span>
{:else}
  <span
    class={cn('grid shrink-0 place-items-center rounded font-semibold', sealSwatchClass(seal), sealInkClass(seal), dim, className)}
    title={`SEAL-${seal}`}
    aria-label={`SEAL-${seal}`}
  >{seal}</span>
{/if}
