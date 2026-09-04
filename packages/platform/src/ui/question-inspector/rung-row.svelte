<script lang="ts">
  import { Inset } from '../panel';
  import { cn } from '../../utils/cn';
  import { sealSwatchClass, sealInkClass } from '../../utils/seal-color';
  import type { LadderRung } from './model';

  // One rung of the answer ladder, read-only: the SEAL swatch, the level name, and
  // — when a unit selected this rung — a ✓ with how many, the lowest tagged as the
  // binding result. The binding rung wears a ring, a merely-selected rung a plain
  // border, an unselected rung the hairline (ONE border-colour utility per branch).
  type Props = { rung: LadderRung };
  let { rung }: Props = $props();
</script>

<Inset
  as="li"
  density="none"
  class={cn(
    'flex items-start gap-2.5 rounded-md border px-2 py-1.5 transition-colors',
    rung.binding
      ? 'border-foreground ring-1 ring-inset ring-foreground/20'
      : rung.selected
        ? 'border-foreground/50'
        : 'border-border',
  )}
>
  <span
    class={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded text-xs font-semibold', sealSwatchClass(rung.seal), sealInkClass(rung.seal))}
    aria-hidden="true"
  >{rung.seal}</span>
  <span class="min-w-0 flex-1 space-y-0.5">
    <span class="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
      SEAL-{rung.seal} · {rung.name}
      {#if rung.selected}
        <span class="rounded bg-accent px-1 py-0.5 text-3xs normal-case tracking-normal text-foreground" title="Selected by {rung.seats} unit(s)">
          ✓ {rung.seats}{rung.binding ? ' · lowest' : ''}
        </span>
      {/if}
    </span>
    <span class="block text-xs leading-relaxed text-foreground">{rung.description}</span>
  </span>
</Inset>
