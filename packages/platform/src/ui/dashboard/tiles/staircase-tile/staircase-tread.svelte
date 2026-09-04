<script lang="ts">
  import type { StaircaseStepView } from '../../../../analytics';
  import { sealSwatchClass } from '../../../../utils/seal-color';
  // Deep imports: the inspector barrel pulls the whole rail in with it.
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';

  // One tread: height is the level, fill is the ramp, the number counts the answers
  // binding there. A press marks it and inspects its rung (twin of the heat mark).
  type Props = {
    step: StaircaseStepView;
    selected: string | null;
    /** null = this tread is a drawn bar, not a button.*/
    onSelect: ((mark: string) => void) | null;
  };
  let { step, selected, onSelect }: Props = $props();

  const mark = $derived(`rung:${step.floor}`);
  const inspector = getInspector();
  const selection = $derived<InspectSelection>({ kind: 'staircase-rung', floor: step.floor });
  const treadClass = $derived(
    [
      'relative block rounded-t-sm',
      sealSwatchClass(step.floor),
      onSelect === null
        ? ''
        : `cursor-pointer ring-offset-2 ring-offset-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            mark === selected ? 'ring-1 ring-ring' : ''
          }`,
    ].join(' '),
  );
  const attrs = $derived({
    'data-staircase-tread': step.floor,
    'aria-label': `${step.title} — ${step.unlocks}`,
    title: step.unlocks,
    class: treadClass,
    // (seal+1)/5 so a SEAL-0 tread is visible, never a sliver.
    style: `height: ${((step.floor + 1) / 5) * 100}%`,
  });

  function press(): void {
    if (onSelect === null) return;
    onSelect(mark);
    inspector?.show(selection);
  }
</script>

{#snippet body()}<span class="absolute inset-x-0 top-0.5 text-center text-sm font-semibold">{step.count}</span>{/snippet}

<div class="flex h-full flex-1 flex-col justify-end">
  {#if onSelect === null}
    <span {...attrs}>{@render body()}</span>
  {:else}
    <button type="button" {...attrs} aria-pressed={mark === selected} onclick={press}>{@render body()}</button>
  {/if}
</div>
