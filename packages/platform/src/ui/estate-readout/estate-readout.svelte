<script lang="ts">
  import type { EstateFloorFlip, TestEstateReading } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader, Well } from '../panel';
  import { RuleCite } from '../rulebook';
  import EstateReading from './estate-reading.svelte';
  import FloorFlip from './floor-flip.svelte';

  // The live test-estate readings on the Author overview: every reference estate
  // re-run through the REAL engine on each edit. This is the reading the retired
  // Author HUD existed for — nothing else in the app shows every estate's floor at
  // once (the QA Dashboard reads one estate, in another mode), and it is the
  // author's feedback loop: rewrite a rung, watch a floor move.
  //
  // Presentation only — the engine runs in the app shell (design rule 4).
  type Props = {
    /** null while the draft has strict issues: the engine evaluates real workbooks. */
    readings: TestEstateReading[] | null;
    /** Floor changes between the last two valid evaluations. */
    flips: EstateFloorFlip[];
    /** Open the Test estates page — where an estate is added or its answers set. */
    onOpen: () => void;
  };
  let { readings, flips, onOpen }: Props = $props();
</script>

<Panel class="space-y-4">
  <PanelHeader title="Test estate readings" tone="eyebrow" level={2}>
    {#snippet actions()}
      <RuleCite section="7" />
      <Button variant="outline" size="sm" onclick={onOpen}>Open Test estates</Button>
    {/snippet}
  </PanelHeader>

  <p class="max-w-prose text-xs text-muted-foreground">
    Every reference estate, run through the real engine on each edit. A ceiling-leak
    shows as the hyperscaler climbing, a floor-trap as the EU stack sinking.
  </p>

  {#if flips.length > 0}
    <div class="space-y-1">
      {#each flips as flip (flip.estateId)}
        <FloorFlip {flip} />
      {/each}
    </div>
  {/if}

  {#if readings === null}
    <Well tone="empty" density="sm">
      <p class="text-xs text-muted-foreground">
        Test estates evaluate once the workbook is valid — fix the issues above.
      </p>
    </Well>
  {:else if readings.length === 0}
    <Well tone="empty" density="sm">
      <p class="text-xs text-muted-foreground">
        No test estates yet — add one to watch an edit move a floor.
      </p>
    </Well>
  {:else}
    <ul class="divide-y divide-border/60 border-y border-border/60">
      {#each readings as reading (reading.estateId)}
        <EstateReading {reading} />
      {/each}
    </ul>
  {/if}
</Panel>
