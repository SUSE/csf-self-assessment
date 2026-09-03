<script lang="ts">
  import { sealSwatchClass } from '../../utils/seal-color';
  import * as Collapsible from '../collapsible';
  import type { LandingChecksView } from './model';

  // The previewed floor as a POSITION on the 0→4 scale, not as a word. ONE mark
  // only: the floor's own cell, at its own ramp intensity, so a low floor reads
  // pale and a high one vivid; every other rung sits in the inert palest fill.
  // Anything else on the strip competes with the mark — inking the whole ramp put
  // the vivid top cell ahead of the marked one, and a dashed outline on the rung
  // that lifting would reach was a second thing to decode. Where lifting leads is
  // said in words underneath instead. Computes nothing.
  //
  // The marked cell IS the disclosure control for the answers pinning the floor —
  // you open them from the thing they hold down, so there is no separate expand
  // button. It must therefore render inside the panel's `Collapsible.Root`, which
  // owns `open`; this component only reads it to word the control.
  type Props = { floor: LandingChecksView['floor']; open: boolean };
  let { floor, open }: Props = $props();

  // Colour is not the only carrier: the marked cell also takes the selection ring
  // and bold weight, which is what distinguishes a SEAL-0 floor (whose own fill IS
  // the inert one) from the rungs above it.
  const fill = (cell: LandingChecksView['floor']['cells'][number]): string =>
    sealSwatchClass(cell.state === 'now' ? cell.seal : 0);

  // `border border-transparent` at rest so neither the ring nor the hover border
  // reflows the row (the Reserved Border Rule).
  const cell = 'flex h-6 w-9 items-center justify-center rounded border border-transparent text-xs';
  const marked = 'font-semibold ring-1 ring-ring ring-inset';
  const action =
    'cursor-pointer outline-none hover:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50';
  const label = $derived(
    `${open ? 'Hide' : 'Show'} the answers pinning the floor at SEAL ${floor.seal}`,
  );
</script>

<ol class="flex items-stretch gap-0.5">
  {#each floor.cells as rung (rung.seal)}
    <li data-floor-cell={rung.seal} data-cell-state={rung.state} class="contents">
      {#if rung.state === 'now'}
        <Collapsible.Trigger
          class={[cell, fill(rung), marked, action]}
          aria-label={label}
          title={label}
        >
          {rung.seal}
        </Collapsible.Trigger>
      {:else}
        <span class={[cell, fill(rung)]} aria-hidden="true">{rung.seal}</span>
      {/if}
    </li>
  {/each}
</ol>
