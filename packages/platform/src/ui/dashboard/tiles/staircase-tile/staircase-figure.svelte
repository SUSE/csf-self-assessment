<script lang="ts">
  import type { StaircaseStepView } from '../../../../analytics';
  import { sealSwatchClass } from '../../../../utils/seal-color';
  import StaircaseTread from './staircase-tread.svelte';

  // The climb rung by rung, up to the SEAL-4 summit — which is not pressable: a rung
  // nothing binds has no answers to show.
  type Props = {
    steps: StaircaseStepView[];
    summitName: string;
    climb: string;
    /** The tread selected in this figure, or null. Null is the paper reading: a
     *  document has no selection. */
    selected: string | null;
    /** null = a static drawing: no tread is a control, and the caption stops
     *  naming a gesture the reader of a page cannot make (report.md §3.3). */
    onSelect: ((mark: string) => void) | null;
  };
  let { steps, summitName, climb, selected, onSelect }: Props = $props();
</script>

<figure data-staircase-figure aria-label={`The climb, rung by rung: ${climb} answers, up to SEAL-4.`}>
  <div class="flex h-36 items-end gap-px">
    {#each steps as step (step.key)}
      <StaircaseTread {step} {selected} {onSelect} />
    {/each}
    <div class="flex h-full flex-1 flex-col justify-end">
      <div data-staircase-summit class={`relative h-full ${sealSwatchClass(4)}`}>
        <span class="absolute inset-x-0 top-1 text-center text-xs font-semibold">Clear</span>
      </div>
    </div>
  </div>
  <div class="mt-1 flex gap-px text-center text-xs leading-tight">
    {#each steps as step, i (step.key)}
      <p class="flex-1">
        <span class="font-medium text-card-foreground">{`SEAL-${step.floor}`}</span>
        {#if i === 0}
          <span data-staircase-here class="block text-muted-foreground">you are here</span>
        {/if}
      </p>
    {/each}
    <p class="flex-1">
      <span class="font-medium text-card-foreground">SEAL-4</span>
      <span class="block truncate text-muted-foreground" title={summitName}>{summitName}</span>
    </p>
  </div>
  <figcaption class="mt-2 text-xs text-muted-foreground">
    {#if onSelect === null}
      Each tread counts the answers pinning that rung; clearing them climbs the floor to the next tread.
    {:else}
      Each tread counts the answers pinning that rung — press one to read them, and clearing them climbs the floor to the next tread.
    {/if}
  </figcaption>
</figure>
