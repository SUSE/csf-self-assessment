<script lang="ts">
  import type { Seal, SealLevel } from '../../schema';
  import { Panel, PanelHeader } from '../panel';
  import SealLadderRung from './seal-ladder-rung.svelte';

  // The instrument's SEAL scale, explained — a workbook fact like its dimensions.
  //
  // The scale is a DEFINITION, not a reading: `floor` only marks a rung, and the
  // caller resolves it against the live result rather than remembering one.
  type Props = {
    sealLevels: SealLevel[];
    /** The reading's floor, marked on its rung. Null = nothing gates yet, which is
     *  not SEAL-0 (analytics invariant #2), so no rung is marked. */
    floor?: Seal | null;
    title?: string;
  };
  let { sealLevels, floor = null, title = 'SEAL ladder' }: Props = $props();

  // Never sort the prop in place. Ascending: SEAL-0 is the exposed end, and you climb.
  const levels = $derived([...sealLevels].sort((a, b) => a.seal - b.seal));
</script>

<Panel class="space-y-2">
  <PanelHeader
    {title}
    tone="eyebrow"
    level={2}
    description="What each level of this instrument asserts. A reading's floor is the LOWEST rung any gating answer reaches, so one weak answer holds the whole estate down — climbing needs that answer fixed, not a better average."
  />
  <ol data-seal-ladder class="flex flex-col gap-2">
    {#each levels as level (level.seal)}
      <SealLadderRung {level} atFloor={level.seal === floor} />
    {/each}
  </ol>
  {#if floor !== null}
    <p class="text-xs text-muted-foreground">
      A floor read over an unfinished estate is an upper bound: it can only fall.
    </p>
  {/if}
</Panel>
